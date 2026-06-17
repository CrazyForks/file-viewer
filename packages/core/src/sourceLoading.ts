import type { FileViewerPdfOptions } from './types';

export const DEFAULT_PDF_RANGE_CHUNK_SIZE = 64 * 1024;

export interface FileViewerRequestController {
  readonly version: number;
  createVersion(): number;
  isCurrent(version: number): boolean;
  createAbortController(): AbortController | null;
  clearAbortController(controller: AbortController | null): void;
  abort(): void;
}

export const createFileViewerRequestController = (): FileViewerRequestController => {
  let version = 0;
  let activeAbortController: AbortController | null = null;

  return {
    get version() {
      return version;
    },
    createVersion() {
      version += 1;
      activeAbortController?.abort();
      activeAbortController = null;
      return version;
    },
    isCurrent(nextVersion: number) {
      return nextVersion === version;
    },
    createAbortController() {
      activeAbortController = typeof AbortController === 'function'
        ? new AbortController()
        : null;
      return activeAbortController;
    },
    clearAbortController(controller: AbortController | null) {
      if (activeAbortController === controller) {
        activeAbortController = null;
      }
    },
    abort() {
      activeAbortController?.abort();
      activeAbortController = null;
    },
  };
};

export const isFileViewerAbortError = (error: unknown) => {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    __CANCEL__?: unknown;
    code?: unknown;
    name?: unknown;
  };

  return candidate.__CANCEL__ === true ||
    candidate.code === 'ERR_CANCELED' ||
    candidate.name === 'AbortError' ||
    candidate.name === 'CanceledError';
};

export const normalizePdfStreamingMode = (
  mode: FileViewerPdfOptions['streaming']
): true | false | 'same-origin' => {
  if (mode === true || mode === false || mode === 'same-origin') {
    return mode;
  }
  return 'same-origin';
};

export const isSameOriginUrl = (url: string, pageHref: string) => {
  try {
    const target = new URL(url, pageHref);
    const page = new URL(pageHref);
    return target.origin === page.origin;
  } catch {
    return false;
  }
};

export const shouldStreamPdfUrl = ({
  extension,
  pageHref,
  streaming,
  url,
}: {
  extension: string;
  pageHref: string;
  streaming?: FileViewerPdfOptions['streaming'];
  url: string;
}) => {
  if (extension.toLowerCase() !== 'pdf') {
    return false;
  }

  const mode = normalizePdfStreamingMode(streaming);
  if (mode === false) {
    return false;
  }
  if (mode === true) {
    return true;
  }

  return isSameOriginUrl(url, pageHref);
};
