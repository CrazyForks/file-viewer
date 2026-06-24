import { ARCHIVE_EXTENSIONS, DEFAULT_SUPPORTED_EXTENSIONS, } from '@file-viewer/core';
export const ARCHIVE_PREVIEWABLE_EXTENSIONS = DEFAULT_SUPPORTED_EXTENSIONS;
export const getArchiveEntryExtension = (name) => {
    const clean = name.split(/[?#]/)[0] || name;
    const dot = clean.lastIndexOf('.');
    return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase();
};
const ARCHIVE_SYSTEM_METADATA_FILENAMES = new Set([
    '.ds_store',
    'desktop.ini',
    'thumbs.db',
]);
export const isArchiveSystemMetadataPath = (path) => {
    var _a;
    const normalized = path.replace(/^\/+/, '').replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    const filename = ((_a = parts[parts.length - 1]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    return parts.some(part => part === '__MACOSX' || part.startsWith('._')) ||
        ARCHIVE_SYSTEM_METADATA_FILENAMES.has(filename);
};
export const isArchiveExtension = (extension) => (ARCHIVE_EXTENSIONS.includes(extension.toLowerCase()));
export const isPreviewableArchiveEntry = (name) => {
    const extension = getArchiveEntryExtension(name);
    return ARCHIVE_PREVIEWABLE_EXTENSIONS.includes(extension);
};
export const formatArchiveBytes = (value) => {
    if (!Number.isFinite(value) || value < 0) {
        return '-';
    }
    if (value < 1024) {
        return `${value} B`;
    }
    const units = ['KB', 'MB', 'GB'];
    let next = value / 1024;
    for (const unit of units) {
        if (next < 1024 || unit === units[units.length - 1]) {
            return `${next.toFixed(next < 10 ? 1 : 0)} ${unit}`;
        }
        next /= 1024;
    }
    return `${value} B`;
};
const isCompressedFile = (value) => {
    return typeof value === 'object' &&
        value !== null &&
        'extract' in value &&
        typeof value.extract === 'function';
};
export const flattenArchiveObject = (input, prefix = '') => {
    const entries = [];
    Object.entries(input).forEach(([key, value]) => {
        const path = prefix ? `${prefix}/${key}` : key;
        if (isArchiveSystemMetadataPath(path)) {
            return;
        }
        if (isCompressedFile(value)) {
            const name = value.name || key;
            const extension = getArchiveEntryExtension(name);
            entries.push({
                id: path,
                path,
                name,
                extension,
                size: value.size || 0,
                lastModified: value.lastModified,
                depth: path.split('/').length - 1,
                previewable: isPreviewableArchiveEntry(name),
                compressedFile: value,
            });
            return;
        }
        if (value && typeof value === 'object') {
            entries.push(...flattenArchiveObject(value, path));
        }
    });
    return entries;
};
export const createArchiveCacheKey = (archiveName, archiveSize, entry) => {
    return [
        'archive-entry',
        archiveName || 'archive',
        archiveSize,
        entry.path,
        entry.size,
        entry.lastModified || 0,
    ].join(':');
};
const buildNestedOptions = (context, archiveOptions) => ({
    ...((context === null || context === void 0 ? void 0 : context.options) || {}),
    archive: archiveOptions,
});
export const buildArchiveNestedRenderContext = (context, entry, archiveOptions) => ({
    ...context,
    filename: entry.name,
    // Archive children are rendered from the extracted bytes. Never inherit
    // the parent archive URL, otherwise streaming renderers such as PDF.js
    // would try to parse the .zip/.rar source as the nested file.
    url: undefined,
    streamUrl: undefined,
    options: buildNestedOptions(context, archiveOptions),
});
