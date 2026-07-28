export interface NormalizedJpegExif {
  bytes: Uint8Array;
  orientation: number;
}

type ExifOrientationLocation = {
  offset: number;
  littleEndian: boolean;
  orientation: number;
};

const readUint16 = (view: DataView, offset: number, littleEndian: boolean) => {
  if (offset < 0 || offset + 2 > view.byteLength) {
    return 0;
  }
  return view.getUint16(offset, littleEndian);
};

const readUint32 = (view: DataView, offset: number, littleEndian: boolean) => {
  if (offset < 0 || offset + 4 > view.byteLength) {
    return 0;
  }
  return view.getUint32(offset, littleEndian);
};

const findExifOrientation = (bytes: Uint8Array): ExifOrientationLocation | null => {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 2;
  while (cursor + 4 <= bytes.byteLength) {
    if (bytes[cursor] !== 0xff) {
      cursor += 1;
      continue;
    }

    const marker = bytes[cursor + 1];
    cursor += 2;
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    const segmentLength = view.getUint16(cursor, false);
    if (segmentLength < 2 || cursor + segmentLength > bytes.byteLength) {
      break;
    }

    const payloadOffset = cursor + 2;
    const payloadLength = segmentLength - 2;
    if (
      marker === 0xe1 &&
      payloadLength >= 14 &&
      bytes[payloadOffset] === 0x45 &&
      bytes[payloadOffset + 1] === 0x78 &&
      bytes[payloadOffset + 2] === 0x69 &&
      bytes[payloadOffset + 3] === 0x66 &&
      bytes[payloadOffset + 4] === 0x00 &&
      bytes[payloadOffset + 5] === 0x00
    ) {
      const tiffOffset = payloadOffset + 6;
      const littleEndian = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
      const bigEndian = bytes[tiffOffset] === 0x4d && bytes[tiffOffset + 1] === 0x4d;
      if (!littleEndian && !bigEndian) {
        return null;
      }

      if (readUint16(view, tiffOffset + 2, littleEndian) !== 0x2a) {
        return null;
      }

      const ifdOffset = readUint32(view, tiffOffset + 4, littleEndian);
      const ifdStart = tiffOffset + ifdOffset;
      const entryCount = readUint16(view, ifdStart, littleEndian);
      for (let index = 0; index < entryCount; index += 1) {
        const entryOffset = ifdStart + 2 + index * 12;
        if (entryOffset + 12 > bytes.byteLength) {
          break;
        }
        if (readUint16(view, entryOffset, littleEndian) !== 0x0112) {
          continue;
        }
        const type = readUint16(view, entryOffset + 2, littleEndian);
        const count = readUint32(view, entryOffset + 4, littleEndian);
        if (type !== 3 || count < 1) {
          return null;
        }
        return {
          offset: entryOffset + 8,
          littleEndian,
          orientation: readUint16(view, entryOffset + 8, littleEndian),
        };
      }
    }

    cursor += segmentLength;
  }

  return null;
};

export const readJpegExifOrientation = (input: ArrayBuffer | Uint8Array) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return findExifOrientation(bytes)?.orientation || 1;
};

/**
 * Browsers apply JPEG EXIF orientation while PowerPoint keeps the equivalent
 * DrawingML transform. Resetting the tag prevents that rotation from being
 * applied twice without re-encoding the image.
 */
export const normalizeJpegExifOrientation = (
  input: ArrayBuffer | Uint8Array
): NormalizedJpegExif => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const exif = findExifOrientation(bytes);
  if (!exif || exif.orientation <= 1 || exif.orientation > 8) {
    return { bytes, orientation: exif?.orientation || 1 };
  }

  const normalized = bytes.slice();
  const view = new DataView(
    normalized.buffer,
    normalized.byteOffset,
    normalized.byteLength
  );
  view.setUint16(exif.offset, 1, exif.littleEndian);
  return { bytes: normalized, orientation: exif.orientation };
};
