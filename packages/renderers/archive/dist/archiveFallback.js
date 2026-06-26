import { getArchiveEntryExtension, isArchiveSystemMetadataPath, isPreviewableArchiveEntry, } from './archiveShared.js';
const ZIP_LIKE_EXTENSIONS = new Set(['zip', 'zipx', 'jar', 'war', 'ear', 'apk', 'cbz']);
const TAR_LIKE_EXTENSIONS = new Set(['tar', 'tgz', 'gz', 'gzip']);
const TAR_BLOCK_SIZE = 512;
const ZIP_CENTRAL_FILE_HEADER = 0x02014b50;
const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_GENERAL_PURPOSE_ENCRYPTED_FLAG = 0x0001;
const toArrayBuffer = (bytes) => {
    const output = new Uint8Array(bytes.byteLength);
    output.set(bytes);
    return output.buffer;
};
const decompressBytes = async (bytes, format) => {
    if (typeof DecompressionStream === 'undefined') {
        return null;
    }
    const stream = new Blob([toArrayBuffer(bytes)])
        .stream()
        .pipeThrough(new DecompressionStream(format));
    return new Uint8Array(await new Response(stream).arrayBuffer());
};
const normalizeArchivePath = (path) => {
    return path.replace(/^\/+/, '').replace(/\\/g, '/');
};
const getPathName = (path) => {
    const parts = normalizeArchivePath(path).split('/');
    return parts[parts.length - 1] || path;
};
const getPathDepth = (path) => {
    return Math.max(0, normalizeArchivePath(path).split('/').length - 1);
};
const createEntryView = (source) => {
    const path = normalizeArchivePath(source.path);
    const name = getPathName(path);
    return {
        id: path,
        path,
        name,
        extension: getArchiveEntryExtension(name),
        size: source.size,
        lastModified: source.lastModified,
        depth: getPathDepth(path),
        previewable: isPreviewableArchiveEntry(name),
        compressedFile: {
            name,
            size: source.size,
            lastModified: source.lastModified,
            async extract() {
                const buffer = await source.load();
                return new File([buffer], name, {
                    type: 'application/octet-stream',
                    lastModified: source.lastModified || Date.now(),
                });
            },
        },
    };
};
const parseOctal = (bytes, start, length) => {
    const text = new TextDecoder('ascii')
        .decode(bytes.slice(start, start + length))
        .replace(/\0.*$/, '')
        .trim();
    return text ? Number.parseInt(text, 8) || 0 : 0;
};
const readTarName = (bytes, offset) => {
    const decoder = new TextDecoder('utf-8');
    const name = decoder.decode(bytes.slice(offset, offset + 100)).replace(/\0.*$/, '');
    const prefix = decoder.decode(bytes.slice(offset + 345, offset + 500)).replace(/\0.*$/, '');
    return normalizeArchivePath(prefix ? `${prefix}/${name}` : name);
};
const parseTarEntries = (bytes) => {
    const entries = [];
    let offset = 0;
    while (offset + TAR_BLOCK_SIZE <= bytes.length) {
        const header = bytes.slice(offset, offset + TAR_BLOCK_SIZE);
        if (header.every(value => value === 0)) {
            break;
        }
        const path = readTarName(bytes, offset);
        const size = parseOctal(bytes, offset + 124, 12);
        const typeFlag = String.fromCharCode(bytes[offset + 156] || 0);
        const dataOffset = offset + TAR_BLOCK_SIZE;
        const nextOffset = dataOffset + Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
        if (path && typeFlag !== '5' && !isArchiveSystemMetadataPath(path)) {
            const fileBytes = bytes.slice(dataOffset, dataOffset + size);
            entries.push(createEntryView({
                path,
                size,
                load: async () => toArrayBuffer(fileBytes),
            }));
        }
        offset = nextOffset;
    }
    return entries;
};
const getArchiveExtension = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
        return 'tgz';
    }
    return getArchiveEntryExtension(filename);
};
const readUint16 = (view, offset) => {
    return offset + 2 <= view.byteLength ? view.getUint16(offset, true) : 0;
};
const readUint32 = (view, offset) => {
    return offset + 4 <= view.byteLength ? view.getUint32(offset, true) : 0;
};
const hasEncryptedZipEntries = (data) => {
    const view = new DataView(data);
    for (let offset = 0; offset + 12 <= view.byteLength; offset += 1) {
        const signature = readUint32(view, offset);
        if (signature !== ZIP_CENTRAL_FILE_HEADER && signature !== ZIP_LOCAL_FILE_HEADER) {
            continue;
        }
        const flagOffset = signature === ZIP_CENTRAL_FILE_HEADER
            ? offset + 8
            : offset + 6;
        if ((readUint16(view, flagOffset) & ZIP_GENERAL_PURPOSE_ENCRYPTED_FLAG) !== 0) {
            return true;
        }
    }
    return false;
};
export const isLikelyEncryptedArchive = (data, filename) => {
    const extension = getArchiveExtension(filename);
    if (ZIP_LIKE_EXTENSIONS.has(extension)) {
        return hasEncryptedZipEntries(data);
    }
    return false;
};
const getGzipEntryName = (filename) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.gzip')) {
        return filename.slice(0, -5) || 'archive';
    }
    if (lower.endsWith('.gz')) {
        return filename.slice(0, -3) || 'archive';
    }
    return `${filename || 'archive'}.bin`;
};
const loadZipEntries = async (data) => {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(data);
    const entries = [];
    zip.forEach((relativePath, file) => {
        var _a, _b;
        if (file.dir) {
            return;
        }
        const metadata = file;
        const normalizedPath = normalizeArchivePath(relativePath);
        if (isArchiveSystemMetadataPath(normalizedPath)) {
            return;
        }
        entries.push(createEntryView({
            path: normalizedPath,
            size: ((_a = metadata._data) === null || _a === void 0 ? void 0 : _a.uncompressedSize) || 0,
            lastModified: (_b = file.date) === null || _b === void 0 ? void 0 : _b.getTime(),
            load: async () => file.async('arraybuffer'),
        }));
    });
    return entries;
};
const loadTarEntries = async (data, filename, extension) => {
    const source = new Uint8Array(data);
    const bytes = extension === 'tar'
        ? source
        : await decompressBytes(source, 'gzip');
    if (!bytes) {
        return null;
    }
    if (extension === 'gz' || extension === 'gzip') {
        const lower = filename.toLowerCase();
        const isTarGz = lower.endsWith('.tar.gz') || lower.endsWith('.tgz');
        if (!isTarGz) {
            const name = getGzipEntryName(filename);
            return [createEntryView({
                    path: name,
                    size: bytes.byteLength,
                    load: async () => toArrayBuffer(bytes),
                })];
        }
    }
    return parseTarEntries(bytes);
};
/**
 * Worker fallback for constrained browsers, temporary local servers, and
 * mobile WebViews. The main libarchive path still covers broader formats;
 * this covers common ZIP/TAR/GZIP archives without an extra static Worker.
 */
export const loadArchiveEntriesWithoutWorker = async (data, filename) => {
    const extension = getArchiveExtension(filename);
    if (ZIP_LIKE_EXTENSIONS.has(extension)) {
        if (isLikelyEncryptedArchive(data, filename)) {
            return null;
        }
        return loadZipEntries(data);
    }
    if (TAR_LIKE_EXTENSIONS.has(extension)) {
        return loadTarEntries(data, filename, extension);
    }
    return null;
};
