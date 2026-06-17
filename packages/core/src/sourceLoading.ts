import type {
  FileViewerFileRef,
  FileViewerLifecycleContext,
  FileViewerPdfOptions,
} from './types';
import {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  getExtension,
  normalizeFilename,
  resolveFileViewerSourceFilename,
  wrapFileViewerFileRef,
} from './source';

export const DEFAULT_PDF_RANGE_CHUNK_SIZE = 64 * 1024;
export const DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME = 'preview.pdf';

export interface FileViewerRequestController {
  readonly version: number;
  createVersion(): number;
  isCurrent(version: number): boolean;
  createAbortController(): AbortController | null;
  clearAbortController(controller: AbortController | null): void;
  abort(): void;
}

export interface ResolveFileViewerPreviewRequestReasonInput {
  file?: FileViewerFileRef | null;
  url?: string | null;
}

export interface FileViewerEmptyPreviewState {
  filename: '';
  file: null;
  buffer: null;
  sourceUrl: null;
  renderedReady: false;
  progressiveReady: false;
}

export type FileViewerPreviewRequestResetState = Pick<
  FileViewerEmptyPreviewState,
  'file' | 'buffer' | 'sourceUrl' | 'progressiveReady'
>;

export interface MutableFileViewerPreviewRequestState {
  file: File | null;
  buffer: ArrayBuffer | null;
  sourceUrl: string | null;
  progressiveReady: boolean;
}

export interface MutableFileViewerPreviewState extends MutableFileViewerPreviewRequestState {
  filename: string;
  renderedReady: boolean;
}

export interface FileViewerReadPreviewState {
  filename: string;
  file: File;
  buffer: ArrayBuffer;
  sourceUrl: string | null;
}

export interface CreateFileViewerReadPreviewStateInput {
  file: File;
  buffer: ArrayBuffer;
  sourceUrl?: string | null;
  fallbackFilename?: string;
}

export type MutableFileViewerReadPreviewState = Pick<
  MutableFileViewerPreviewState,
  'filename' | 'file' | 'buffer' | 'sourceUrl'
>;

export type MutableFileViewerPreviewSourceUrlState = Pick<MutableFileViewerPreviewState, 'sourceUrl'>;

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

export const hasFileViewerPreviewSource = ({
  file,
  url,
}: ResolveFileViewerPreviewRequestReasonInput = {}) => {
  return !!file || !!url;
};

export const resolveFileViewerPreviewRequestReason = (
  input: ResolveFileViewerPreviewRequestReasonInput = {}
): FileViewerLifecycleContext['reason'] => {
  return hasFileViewerPreviewSource(input) ? 'replace' : 'reset';
};

export const normalizeFileViewerSourceUrl = (sourceUrl?: string | null) => {
  return sourceUrl || null;
};

export const createFileViewerEmptyPreviewState = (): FileViewerEmptyPreviewState => {
  return {
    filename: '',
    file: null,
    buffer: null,
    sourceUrl: null,
    renderedReady: false,
    progressiveReady: false,
  };
};

export const createFileViewerPreviewRequestResetState = (): FileViewerPreviewRequestResetState => {
  return {
    file: null,
    buffer: null,
    sourceUrl: null,
    progressiveReady: false,
  };
};

export const applyFileViewerPreviewRequestResetState = <Target extends MutableFileViewerPreviewRequestState>(
  target: Target,
  state: FileViewerPreviewRequestResetState = createFileViewerPreviewRequestResetState()
) => {
  target.file = state.file;
  target.buffer = state.buffer;
  target.sourceUrl = state.sourceUrl;
  target.progressiveReady = state.progressiveReady;
  return target;
};

export const applyFileViewerEmptyPreviewState = <Target extends MutableFileViewerPreviewState>(
  target: Target,
  state: FileViewerEmptyPreviewState = createFileViewerEmptyPreviewState()
) => {
  target.filename = state.filename;
  target.renderedReady = state.renderedReady;
  applyFileViewerPreviewRequestResetState(target, state);
  return target;
};

export const createFileViewerReadPreviewState = ({
  file,
  buffer,
  sourceUrl,
  fallbackFilename = '',
}: CreateFileViewerReadPreviewStateInput): FileViewerReadPreviewState => ({
  filename: resolveFileViewerSourceFilename({ file, fallback: fallbackFilename }),
  file,
  buffer,
  sourceUrl: normalizeFileViewerSourceUrl(sourceUrl),
});

export const applyFileViewerReadPreviewState = <Target extends MutableFileViewerReadPreviewState>(
  target: Target,
  state: FileViewerReadPreviewState
) => {
  target.filename = state.filename;
  target.file = state.file;
  target.buffer = state.buffer;
  target.sourceUrl = state.sourceUrl;
  return target;
};

export const applyFileViewerPreviewSourceUrlState = <Target extends MutableFileViewerPreviewSourceUrlState>(
  target: Target,
  sourceUrl?: string | null
) => {
  target.sourceUrl = normalizeFileViewerSourceUrl(sourceUrl);
  return target;
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

export interface FileViewerRemoteSourcePlan {
  readonly url: string;
  readonly filename: string;
  readonly extension: string;
  readonly streamPdf: boolean;
}

export const resolveFileViewerRemoteSourcePlan = ({
  filename,
  fallbackFilename = DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  pageHref,
  streaming,
  url,
}: {
  filename?: string;
  fallbackFilename?: string;
  pageHref?: string;
  streaming?: FileViewerPdfOptions['streaming'];
  url: string;
}): FileViewerRemoteSourcePlan => {
  const nextFilename = normalizeFilename(filename || url, fallbackFilename);
  const extension = getExtension(nextFilename);

  return {
    url,
    filename: nextFilename,
    extension,
    streamPdf: pageHref
      ? shouldStreamPdfUrl({
        extension,
        pageHref,
        streaming,
        url,
      })
      : false,
  };
};

export const createFileViewerStreamingPdfPlaceholderFile = (filename?: string) => {
  if (typeof Blob === 'undefined') {
    throw new Error('Blob is not available in the current runtime.');
  }

  return wrapFileViewerFileRef(
    new Blob([], { type: 'application/pdf' }),
    normalizeFilename(filename, DEFAULT_FILE_VIEWER_STREAMING_PDF_FILENAME)
  );
};
