import { describe, expect, it } from 'vitest';
import { isLikelyEncryptedArchive } from '../packages/renderers/archive/src/archiveFallback';

const createZipHeader = (signature: number, encrypted: boolean) => {
  const bytes = new Uint8Array(64);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  view.setUint16(signature === 0x02014b50 ? 8 : 6, encrypted ? 1 : 0, true);
  return bytes.buffer;
};

describe('archive fallback encryption guard', () => {
  it('detects encrypted ZIP central directory entries', () => {
    const archive = createZipHeader(0x02014b50, true);

    expect(isLikelyEncryptedArchive(archive, 'secure.zip')).toBe(true);
  });

  it('detects encrypted ZIP local file headers', () => {
    const archive = createZipHeader(0x04034b50, true);

    expect(isLikelyEncryptedArchive(archive, 'secure.cbz')).toBe(true);
  });

  it('does not mark plain ZIP or non-ZIP formats as encrypted', () => {
    expect(isLikelyEncryptedArchive(createZipHeader(0x02014b50, false), 'plain.zip')).toBe(false);
    expect(isLikelyEncryptedArchive(createZipHeader(0x02014b50, true), 'plain.tar')).toBe(false);
  });
});
