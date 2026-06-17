import type {
  FileViewerFileRef,
  FileViewerSource,
  FileViewerSourceKind,
  NormalizedFileViewerSource,
} from './types';

export type FileViewerReadResult = string | ArrayBuffer | undefined | null;

export const normalizeFileExtension = (extension: string) => {
  return extension.trim().replace(/^\./, '').toLowerCase();
};

export const decodeFilename = (name: string) => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

export const getExtension = (name: string) => {
  const clean = name.split(/[?#]/)[0] || name;
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : normalizeFileExtension(clean.slice(dot + 1));
};

export const normalizeFilename = (value: string | undefined, fallback = 'preview.bin') => {
  const next = (value || '').split(/[?#]/)[0].trim();
  if (!next) {
    return fallback;
  }
  const slash = Math.max(next.lastIndexOf('/'), next.lastIndexOf('\\'));
  return decodeFilename(slash === -1 ? next : next.slice(slash + 1));
};

const getSourceKind = (source: FileViewerSource): FileViewerSourceKind => {
  if (source.file) {
    return 'file';
  }
  if (source.buffer) {
    return 'buffer';
  }
  if (source.url) {
    return 'url';
  }
  return 'empty';
};

const getBlobName = (file: File | Blob | undefined) => {
  return file && 'name' in file && typeof file.name === 'string' ? file.name : undefined;
};

export const normalizeSource = (source: FileViewerSource): NormalizedFileViewerSource => {
  const kind = getSourceKind(source);
  const filename = normalizeFilename(
    source.filename || getBlobName(source.file) || source.url,
    source.type ? `preview.${normalizeFileExtension(source.type)}` : 'preview.bin'
  );
  const extension = normalizeFileExtension(source.type || getExtension(filename));
  const sourceSize =
    typeof source.size === 'number'
      ? source.size
      : source.file
        ? source.file.size
        : source.buffer
          ? source.buffer.byteLength
          : undefined;

  return {
    kind,
    filename,
    extension,
    url: source.url,
    file: source.file,
    buffer: source.buffer,
    size: sourceSize,
  };
};

export const wrapFileViewerFileRef = (
  data: FileViewerFileRef,
  filename = 'preview.bin'
): File => {
  if (typeof File !== 'undefined' && data instanceof File) {
    return data;
  }

  const safeFilename = normalizeFilename(filename || 'preview.bin');

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new File([data], safeFilename, { type: data.type });
  }

  if (data instanceof ArrayBuffer) {
    return new File([data], safeFilename, {});
  }

  throw new Error('Unsupported file source input.');
};

export const readFileViewerBuffer = async (file: Blob): Promise<ArrayBuffer> => {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read file as ArrayBuffer.'));
    };
    reader.onerror = error => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const toFileViewerBlob = (source: Blob | ArrayBuffer) => {
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    return source;
  }
  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not available in the current runtime.');
  }
  return new Blob([source]);
};

export const readFileViewerDataUrl = async (source: Blob | ArrayBuffer): Promise<string> => {
  const blob = toFileViewerBlob(source);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read file as data URL.'));
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
  });
};

export const readFileViewerText = async (
  source: Blob | ArrayBuffer,
  encoding = 'utf-8'
): Promise<string> => {
  const blob = toFileViewerBlob(source);
  if (typeof blob.text === 'function' && encoding.toLowerCase() === 'utf-8') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read file as text.'));
    };
    reader.onerror = error => reject(error);
    reader.readAsText(blob, encoding);
  });
};
