const MAX_LAYOUT_ELEMENTS = 2500;
const GDS_RECORD = {
    BGNLIB: 0x01,
    LIBNAME: 0x02,
    UNITS: 0x03,
    BGNSTR: 0x05,
    STRNAME: 0x06,
    ENDSTR: 0x07,
    BOUNDARY: 0x08,
    PATH: 0x09,
    SREF: 0x0a,
    AREF: 0x0b,
    TEXT: 0x0c,
    LAYER: 0x0d,
    DATATYPE: 0x0e,
    WIDTH: 0x0f,
    XY: 0x10,
    ENDEL: 0x11,
    SNAME: 0x12,
    COLROW: 0x13,
    TEXTTYPE: 0x16,
    STRING: 0x19,
};
const cleanupText = (text) => {
    return text
        .replace(/\u0000/g, '')
        .replace(/[^\S\r\n]+/g, ' ')
        .replace(/\r\n/g, '\n')
        .trim();
};
const readGdsInt16 = (bytes, offset) => {
    const value = (bytes[offset] << 8) | bytes[offset + 1];
    return value & 0x8000 ? value - 0x10000 : value;
};
const readGdsInt32 = (bytes, offset) => {
    const value = ((bytes[offset] << 24)
        | (bytes[offset + 1] << 16)
        | (bytes[offset + 2] << 8)
        | bytes[offset + 3]);
    return value | 0;
};
const readGdsString = (bytes, offset, length) => {
    return cleanupText(new TextDecoder('utf-8', { fatal: false })
        .decode(bytes.slice(offset, offset + length))
        .replace(/\u0000+$/g, ''));
};
const readGdsReal8 = (bytes, offset) => {
    const first = bytes[offset];
    if (!first) {
        return 0;
    }
    const sign = first & 0x80 ? -1 : 1;
    const exponent = (first & 0x7f) - 64;
    let mantissa = 0;
    for (let index = 1; index < 8; index += 1) {
        mantissa += bytes[offset + index] / (256 ** index);
    }
    return sign * mantissa * (16 ** exponent);
};
const readGdsPoints = (bytes, offset, length) => {
    const points = [];
    for (let cursor = offset; cursor + 7 < offset + length; cursor += 8) {
        points.push({
            x: readGdsInt32(bytes, cursor),
            y: readGdsInt32(bytes, cursor + 4),
        });
    }
    return points;
};
const updateLayoutBounds = (bounds, points) => {
    let next = bounds;
    points.forEach(point => {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return;
        }
        if (!next) {
            next = { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
            return;
        }
        next.minX = Math.min(next.minX, point.x);
        next.minY = Math.min(next.minY, point.y);
        next.maxX = Math.max(next.maxX, point.x);
        next.maxY = Math.max(next.maxY, point.y);
    });
    return next;
};
export const parseGdsLayout = (bytes) => {
    const structures = [];
    const elements = [];
    const warnings = [];
    let libraryName = '';
    let userUnit;
    let databaseUnit;
    let currentStructure = '';
    let currentElement = null;
    let bounds;
    const pushElement = () => {
        if (!currentElement || !currentElement.xy.length) {
            currentElement = null;
            return;
        }
        if (elements.length < MAX_LAYOUT_ELEMENTS) {
            elements.push(currentElement);
            bounds = updateLayoutBounds(bounds, currentElement.xy);
        }
        else if (!warnings.length) {
            warnings.push(`Layout contains more than ${MAX_LAYOUT_ELEMENTS} elements; only the first ${MAX_LAYOUT_ELEMENTS} are rendered to protect browser memory.`);
        }
        currentElement = null;
    };
    for (let offset = 0; offset + 3 < bytes.length;) {
        const length = (bytes[offset] << 8) | bytes[offset + 1];
        const recordType = bytes[offset + 2];
        if (length < 4 || offset + length > bytes.length) {
            warnings.push(`GDSII record has an invalid length at offset ${offset}; geometry parsing stopped safely.`);
            break;
        }
        const dataOffset = offset + 4;
        const dataLength = length - 4;
        switch (recordType) {
            case GDS_RECORD.BGNLIB:
                currentStructure = '';
                break;
            case GDS_RECORD.LIBNAME:
                libraryName = readGdsString(bytes, dataOffset, dataLength);
                break;
            case GDS_RECORD.UNITS:
                if (dataLength >= 16) {
                    userUnit = readGdsReal8(bytes, dataOffset);
                    databaseUnit = readGdsReal8(bytes, dataOffset + 8);
                }
                break;
            case GDS_RECORD.BGNSTR:
                pushElement();
                currentStructure = '';
                break;
            case GDS_RECORD.STRNAME:
                currentStructure = readGdsString(bytes, dataOffset, dataLength);
                if (currentStructure && !structures.includes(currentStructure)) {
                    structures.push(currentStructure);
                }
                break;
            case GDS_RECORD.ENDSTR:
                pushElement();
                currentStructure = '';
                break;
            case GDS_RECORD.BOUNDARY:
                pushElement();
                currentElement = { kind: 'boundary', structure: currentStructure || 'STRUCTURE', xy: [] };
                break;
            case GDS_RECORD.PATH:
                pushElement();
                currentElement = { kind: 'path', structure: currentStructure || 'STRUCTURE', xy: [] };
                break;
            case GDS_RECORD.TEXT:
                pushElement();
                currentElement = { kind: 'text', structure: currentStructure || 'STRUCTURE', xy: [] };
                break;
            case GDS_RECORD.SREF:
                pushElement();
                currentElement = { kind: 'sref', structure: currentStructure || 'STRUCTURE', xy: [] };
                break;
            case GDS_RECORD.AREF:
                pushElement();
                currentElement = { kind: 'aref', structure: currentStructure || 'STRUCTURE', xy: [] };
                break;
            case GDS_RECORD.LAYER:
                if (currentElement && dataLength >= 2) {
                    currentElement.layer = readGdsInt16(bytes, dataOffset);
                }
                break;
            case GDS_RECORD.DATATYPE:
            case GDS_RECORD.TEXTTYPE:
                if (currentElement && dataLength >= 2) {
                    currentElement.datatype = readGdsInt16(bytes, dataOffset);
                }
                break;
            case GDS_RECORD.WIDTH:
                if (currentElement && dataLength >= 4) {
                    currentElement.width = Math.abs(readGdsInt32(bytes, dataOffset));
                }
                break;
            case GDS_RECORD.XY:
                if (currentElement) {
                    currentElement.xy = readGdsPoints(bytes, dataOffset, dataLength);
                }
                break;
            case GDS_RECORD.SNAME:
                if (currentElement) {
                    currentElement.reference = readGdsString(bytes, dataOffset, dataLength);
                }
                break;
            case GDS_RECORD.STRING:
                if (currentElement) {
                    currentElement.text = readGdsString(bytes, dataOffset, dataLength);
                }
                break;
            case GDS_RECORD.COLROW:
                if (currentElement && dataLength >= 4) {
                    currentElement.text = `${currentElement.text || ''} ${readGdsInt16(bytes, dataOffset)}x${readGdsInt16(bytes, dataOffset + 2)}`.trim();
                }
                break;
            case GDS_RECORD.ENDEL:
                pushElement();
                break;
            default:
                break;
        }
        offset += length;
    }
    pushElement();
    if (!structures.length && !elements.length && !libraryName) {
        return undefined;
    }
    return {
        format: 'gdsii',
        libraryName,
        userUnit,
        databaseUnit,
        structureCount: structures.length,
        structures,
        elements,
        bounds,
        warnings,
    };
};
export const inspectOasisLayout = (bytes) => {
    const header = new TextDecoder('ascii', { fatal: false }).decode(bytes.slice(0, Math.min(24, bytes.length)));
    const magicFound = header.includes('OASIS');
    return {
        format: 'oasis',
        magicFound,
        byteLength: bytes.byteLength,
        warnings: [
            magicFound
                ? 'OASIS header detected. Full cell repetition expansion and geometry rendering is reserved for the dedicated WASM/WebGL layout engine boundary.'
                : 'OASIS header was not detected in the first bytes. The file may be wrapped, compressed, encrypted, or use a proprietary exchange container.',
        ],
    };
};
