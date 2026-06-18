import type {
  FileViewerFileRef,
  FileViewerLifecycleContext,
  FileViewerPdfOptions,
} from './types';
import {
  buildFileViewerLifecycleContext,
  type FileViewerLifecycleStateController,
} from './operations';
import { FILE_VIEWER_PREVIEW_MESSAGES } from './state';
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

export interface FileViewerFileRefSourcePlan {
  file: File;
  filename: string;
}

export interface ResolveFileViewerFileRefSourcePlanInput {
  source: FileViewerFileRef;
  currentFilename?: string;
  fallbackFilename?: string;
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

export type MutableFileViewerPreviewFilenameState = Pick<MutableFileViewerPreviewState, 'filename'>;

export type FileViewerRenderReadinessState = Pick<
  MutableFileViewerPreviewState,
  'renderedReady' | 'progressiveReady'
>;

export type MutableFileViewerRenderReadinessState = FileViewerRenderReadinessState;

export interface FileViewerLoadStartState {
  loadingMessage: string;
  lifecycleContext: FileViewerLifecycleContext;
}

export interface CreateFileViewerLoadStartStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  filename?: string;
  file?: File | null;
  sourceUrl?: string | null;
  bufferSize?: number;
  loadingMessage?: string;
  timestamp?: number;
}

export interface CommitFileViewerLoadStartStateInput {
  version: number;
  filename?: string;
  fallbackFilename?: string;
  filenameTarget?: MutableFileViewerPreviewFilenameState;
  buildState: () => FileViewerLoadStartState;
  onMarkLoadStarted?: (version: number) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onStartLoading?: (message: string) => void;
}

export interface FileViewerRenderCompleteState {
  readiness: FileViewerRenderReadinessState;
  lifecycleContext: FileViewerLifecycleContext;
}

export interface CreateFileViewerRenderCompleteStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  filename?: string;
  file?: File | null;
  sourceUrl?: string | null;
  bufferSize?: number;
  startedAt?: number;
  timestamp?: number;
  lifecycleState?: Pick<FileViewerLifecycleStateController, 'getLoadStartedAt'>;
}

export interface CommitFileViewerRenderCompleteStateInput<Session = unknown> {
  version: number;
  session?: Session | null;
  buildState: () => FileViewerRenderCompleteState;
  readinessTarget: MutableFileViewerRenderReadinessState;
  onSession?: (session: Session | null) => void;
  onActiveDocumentContext?: (context: FileViewerLifecycleContext) => void;
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
  onClearLoadStarted?: (version: number) => void;
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

export const applyFileViewerPreviewFilenameState = <Target extends MutableFileViewerPreviewFilenameState>(
  target: Target,
  filename?: string,
  fallbackFilename = ''
) => {
  target.filename = resolveFileViewerSourceFilename({ filename, fallback: fallbackFilename });
  return target;
};

export const applyFileViewerRenderReadinessState = <Target extends MutableFileViewerRenderReadinessState>(
  target: Target,
  state: Partial<FileViewerRenderReadinessState>
) => {
  if (typeof state.renderedReady === 'boolean') {
    target.renderedReady = state.renderedReady;
  }
  if (typeof state.progressiveReady === 'boolean') {
    target.progressiveReady = state.progressiveReady;
  }
  return target;
};

export const commitFileViewerRenderCompleteState = <Session = unknown>({
  version,
  session,
  buildState,
  readinessTarget,
  onSession,
  onActiveDocumentContext,
  onLifecycle,
  onClearLoadStarted,
}: CommitFileViewerRenderCompleteStateInput<Session>) => {
  onSession?.(session ?? null);
  const completeState = buildState();
  applyFileViewerRenderReadinessState(readinessTarget, completeState.readiness);
  onActiveDocumentContext?.(completeState.lifecycleContext);
  onLifecycle?.(completeState.lifecycleContext);
  onClearLoadStarted?.(version);
  return completeState;
};

export const resolveFileViewerLoadStartMessage = (
  source: FileViewerLifecycleContext['source']
) => {
  return source === 'url'
    ? FILE_VIEWER_PREVIEW_MESSAGES.downloading
    : FILE_VIEWER_PREVIEW_MESSAGES.reading;
};

export const commitFileViewerLoadStartState = ({
  version,
  filename,
  fallbackFilename,
  filenameTarget,
  buildState,
  onMarkLoadStarted,
  onLifecycle,
  onStartLoading,
}: CommitFileViewerLoadStartStateInput) => {
  if (filenameTarget) {
    applyFileViewerPreviewFilenameState(filenameTarget, filename, fallbackFilename);
  }
  onMarkLoadStarted?.(version);
  const loadStartState = buildState();
  onLifecycle?.(loadStartState.lifecycleContext);
  onStartLoading?.(loadStartState.loadingMessage);
  return loadStartState;
};

export const createFileViewerLoadStartState = ({
  version,
  source,
  filename,
  file,
  sourceUrl,
  bufferSize,
  loadingMessage,
  timestamp,
}: CreateFileViewerLoadStartStateInput): FileViewerLoadStartState => {
  return {
    loadingMessage: loadingMessage || resolveFileViewerLoadStartMessage(source),
    lifecycleContext: buildFileViewerLifecycleContext({
      phase: 'load-start',
      version,
      source,
      file,
      filename,
      url: normalizeFileViewerSourceUrl(sourceUrl) || undefined,
      bufferSize,
      timestamp,
    }),
  };
};

export const createFileViewerRenderCompleteState = ({
  version,
  source,
  filename,
  file,
  sourceUrl,
  bufferSize,
  startedAt,
  timestamp,
  lifecycleState,
}: CreateFileViewerRenderCompleteStateInput): FileViewerRenderCompleteState => {
  return {
    readiness: {
      renderedReady: true,
      progressiveReady: false,
    },
    lifecycleContext: buildFileViewerLifecycleContext({
      phase: 'load-complete',
      version,
      source,
      file,
      filename,
      url: normalizeFileViewerSourceUrl(sourceUrl) || undefined,
      bufferSize,
      startedAt: startedAt ?? lifecycleState?.getLoadStartedAt(version),
      timestamp,
    }),
  };
};

export const resolveFileViewerFileRefSourcePlan = ({
  source,
  currentFilename,
  fallbackFilename = DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
}: ResolveFileViewerFileRefSourcePlanInput): FileViewerFileRefSourcePlan => {
  const file = wrapFileViewerFileRef(source, currentFilename || fallbackFilename);
  return {
    file,
    filename: resolveFileViewerSourceFilename({ file, fallback: fallbackFilename }),
  };
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

export interface FileViewerLocationLike {
  href?: string | null;
}

export const resolveFileViewerRuntimePageHref = (
  locationLike: FileViewerLocationLike | undefined =
    typeof location !== 'undefined' ? location : undefined
) => {
  return locationLike?.href || undefined;
};

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
