import { resolvePrintAvailability } from './capabilities';
import { getExtension, normalizeFilename } from './source';
import type { FileViewerErrorMessageFormatter } from './state';
import {
  hasFileViewerOriginalSource,
  type FileViewerOriginalSourceState,
} from './viewerOperations';
import type {
  FileRenderExportAdapter,
  FileViewerDocumentAnchor,
  FileViewerBeforeOperation,
  FileViewerFileRef,
  FileViewerLifecycleContext,
  FileViewerLifecycleHooks,
  FileViewerLifecyclePhase,
  FileViewerOperationAvailability,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerSearchState,
  FileViewerSourceKind,
  FileViewerToolbarOptions,
  FileViewerToolbarPosition,
  FileViewerZoomState,
  NormalizedFileViewerSource,
} from './types';

export const FILE_VIEWER_LIFECYCLE_HOOKS = {
  'load-start': 'onLoadStart',
  'load-complete': 'onLoadComplete',
  'unload-start': 'onUnloadStart',
  'unload-complete': 'onUnloadComplete',
} as const satisfies Record<FileViewerLifecyclePhase, keyof FileViewerLifecycleHooks>;

export const FILE_VIEWER_OPERATION_LABELS = {
  download: '下载原始文件',
  print: '打印完整渲染内容',
  'export-html': '导出渲染 HTML',
  'zoom-in': '放大预览',
  'zoom-out': '缩小预览',
  'zoom-reset': '还原预览比例',
} as const satisfies Record<FileViewerOperationType, string>;

export const FILE_VIEWER_BEFORE_OPERATION_ERROR_PREFIX = '操作前置校验失败';

export interface FileViewerLifecycleComponentEmit {
  (event: 'load-start', context: FileViewerLifecycleContext): void;
  (event: 'load-complete', context: FileViewerLifecycleContext): void;
  (event: 'unload-start', context: FileViewerLifecycleContext): void;
  (event: 'unload-complete', context: FileViewerLifecycleContext): void;
}

export interface BuildFileViewerLifecycleContextInput<
  Source extends string = FileViewerSourceKind,
> {
  phase: FileViewerLifecyclePhase;
  version: number;
  source: Source;
  filename?: string;
  file?: File | null;
  url?: string;
  size?: number;
  bufferSize?: number;
  startedAt?: number;
  duration?: number;
  timestamp?: number;
  reason?: FileViewerLifecycleContext['reason'];
}

export interface BuildFileViewerLifecycleContextFromNormalizedSourceInput {
  phase: FileViewerLifecyclePhase;
  source: NormalizedFileViewerSource;
  version: number;
  startedAt?: number;
  timestamp?: number;
  reason?: FileViewerLifecycleContext['reason'];
}

export interface ResolveFileViewerLifecycleFallbackSourceInput {
  file?: FileViewerFileRef | null;
  url?: string | null;
}

export interface ResolvedFileViewerLifecycleFallbackSource {
  source: FileViewerLifecycleContext['source'];
  sourceUrl?: string;
}

export type BuiltFileViewerLifecycleContext<
  Source extends string = FileViewerSourceKind,
> = Omit<FileViewerLifecycleContext, 'source'> & {
  source: Source;
};

export type BuiltFileViewerOperationContext<
  Source extends string = FileViewerSourceKind,
> = Omit<BuiltFileViewerLifecycleContext<Source>, 'phase'> & {
  operation: FileViewerOperationType;
  label: string;
};

export type SerializedFileViewerContext<
  Context extends FileViewerLifecycleContext | FileViewerOperationContext,
> = Omit<Context, 'file'> & {
  hasFile: boolean;
};

export type FileViewerPostMessageType =
  | 'flyfish-viewer:lifecycle'
  | 'flyfish-viewer:operation'
  | 'flyfish-viewer:search'
  | 'flyfish-viewer:location';

const FILE_VIEWER_POST_MESSAGE_TYPES: readonly FileViewerPostMessageType[] = [
  'flyfish-viewer:lifecycle',
  'flyfish-viewer:operation',
  'flyfish-viewer:search',
  'flyfish-viewer:location',
];

export interface FileViewerPostMessagePayload<Payload = unknown> {
  type: FileViewerPostMessageType;
  event: string;
  payload: Payload;
}

export type FileViewerFrameEventPayload<Payload = unknown> = FileViewerPostMessagePayload<Payload>;

export type FileViewerFrameEventHandler<Payload = unknown> = (
  event: FileViewerFrameEventPayload<Payload>,
  rawEvent: MessageEvent
) => void;

export interface ResolveFileViewerOperationAvailabilityInput {
  extension: string;
  hasOriginalSource?: boolean;
  source?: FileViewerOriginalSourceState | null;
  renderedReady: boolean;
  hasError?: boolean;
  adapter?: FileRenderExportAdapter | null;
  zoomState: FileViewerZoomState;
}

export interface ResolveFileViewerToolbarStateInput extends ResolveFileViewerOperationAvailabilityInput {
  toolbar: FileViewerToolbarOptions;
  options?: Pick<FileViewerOptions, 'toolbar'>;
  loading?: boolean;
}

export interface FileViewerToolbarState {
  operationAvailability: FileViewerOperationAvailability;
  visibleToolbar: FileViewerToolbarOptions;
  showToolbar: boolean;
  toolbarPosition: FileViewerToolbarPosition;
  toolbarDisabled: boolean;
}

export interface RunFileViewerBeforeOperationInput<
  Context extends FileViewerOperationContext = FileViewerOperationContext,
> {
  context: Context;
  options?: FileViewerOptions;
  onBefore?: (context: Context) => void;
  onCancel?: (context: Context) => void;
  onError?: (error: unknown, context: Context) => void;
}

export interface ResolveFileViewerBeforeOperationErrorMessageInput {
  error: unknown;
  formatErrorMessage: FileViewerErrorMessageFormatter;
  prefix?: string;
}

export interface CreateFileViewerLifecycleActionsInput<
  OperationContext extends FileViewerOperationContext = FileViewerOperationContext,
> {
  lifecycleState: FileViewerLifecycleStateController;
  getOptions?: () => FileViewerOptions | undefined;
  onLifecycleChange?: (event: FileViewerLifecyclePhase, context: FileViewerLifecycleContext) => void;
  onLifecycleError?: (error: unknown, context: FileViewerLifecycleContext) => void;
  onOperationBefore?: (context: OperationContext) => void;
  onOperationCancel?: (context: OperationContext) => void;
  onOperationError?: (error: unknown, context: OperationContext) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface FileViewerLifecycleActions<
  OperationContext extends FileViewerOperationContext = FileViewerOperationContext,
> {
  notifyLifecycle(context: FileViewerLifecycleContext): boolean;
  notifyActiveUnloadStart(reason?: FileViewerLifecycleContext['reason']): FileViewerLifecycleContext | null;
  notifyActiveUnloadComplete(
    context: FileViewerLifecycleContext | null,
    reason?: FileViewerLifecycleContext['reason']
  ): FileViewerActiveUnloadState;
  runBeforeOperation(context: OperationContext): Promise<boolean>;
}

export interface DispatchFileViewerLifecycleEventInput<
  Context extends FileViewerLifecycleContext = FileViewerLifecycleContext,
> {
  context: Context;
  hooks?: FileViewerLifecycleHooks;
  onChange?: (event: FileViewerLifecyclePhase, context: Context) => void;
  onError?: (error: unknown, context: Context) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface DispatchFileViewerOperationContextEventInput<
  Context extends FileViewerOperationContext = FileViewerOperationContext,
> {
  event: 'operation-before' | 'operation-cancel';
  context: Context;
  onChange?: (context: Context) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface DispatchFileViewerOperationAvailabilityChangeInput {
  availability: FileViewerOperationAvailability;
  onChange?: (availability: FileViewerOperationAvailability) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface DispatchFileViewerZoomChangeInput {
  state: FileViewerZoomState;
  onChange?: (state: FileViewerZoomState) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export type FileViewerZoomButtonAction = keyof Pick<FileViewerZoomState, 'canZoomIn' | 'canZoomOut' | 'canReset'>;

export interface CreateFileViewerToolbarActionsInput {
  getOperationAvailability: () => FileViewerOperationAvailability;
  getToolbarDisabled?: () => boolean;
  getZoomState: () => FileViewerZoomState;
  onOperationAvailabilityChange?: (availability: FileViewerOperationAvailability) => void;
  onZoomChange?: (state: FileViewerZoomState) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface FileViewerToolbarActions {
  notifyOperationAvailabilityChange(availability?: FileViewerOperationAvailability): boolean;
  notifyZoomChange(state?: FileViewerZoomState): boolean;
  isZoomButtonDisabled(action: FileViewerZoomButtonAction): boolean;
}

export interface FileViewerLifecycleStateController {
  markLoadStarted(version: number, timestamp?: number): void;
  clearLoadStarted(version: number): void;
  getLoadStartedAt(version: number): number | undefined;
  getActiveDocumentContext(): FileViewerLifecycleContext | null;
  setActiveDocumentContext(context: FileViewerLifecycleContext): void;
  clearActiveDocumentContext(): void;
  buildActiveUnloadContext(
    phase: Extract<FileViewerLifecyclePhase, 'unload-start' | 'unload-complete'>,
    context: FileViewerLifecycleContext | null,
    reason?: FileViewerLifecycleContext['reason'],
    timestamp?: number
  ): FileViewerLifecycleContext | null;
}

export interface BuildFileViewerOperationContextFromLifecycleStateInput {
  operation: FileViewerOperationType;
  lifecycleState: Pick<FileViewerLifecycleStateController, 'getActiveDocumentContext' | 'getLoadStartedAt'>;
  version: number;
  filename?: string;
  bufferSize?: number;
  currentFile?: File | null;
  fallbackFile?: FileViewerFileRef | null;
  fallbackUrl?: string | null;
  timestamp?: number;
  lifecycleTimestamp?: number;
}

export interface RunFileViewerActiveUnloadStartInput {
  lifecycleState: Pick<FileViewerLifecycleStateController, 'getActiveDocumentContext' | 'buildActiveUnloadContext'>;
  reason?: FileViewerLifecycleContext['reason'];
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
}

export interface RunFileViewerActiveUnloadCompleteInput {
  lifecycleState: Pick<FileViewerLifecycleStateController, 'buildActiveUnloadContext'>;
  context?: FileViewerLifecycleContext | null;
  reason?: FileViewerLifecycleContext['reason'];
  onLifecycle?: (context: FileViewerLifecycleContext) => void;
}

export interface FileViewerActiveUnloadState {
  reason: FileViewerLifecycleContext['reason'];
  context: FileViewerLifecycleContext | null;
  unloadContext: FileViewerLifecycleContext | null;
}

export const buildFileViewerLifecycleContext = <
  Source extends string = FileViewerSourceKind,
>({
  phase,
  version,
  source,
  filename,
  file,
  url,
  size,
  bufferSize,
  startedAt,
  duration,
  timestamp,
  reason,
}: BuildFileViewerLifecycleContextInput<Source>): BuiltFileViewerLifecycleContext<Source> => {
  const resolvedFilename = normalizeFilename(file?.name || filename || url || '');
  const now = timestamp ?? Date.now();

  return {
    phase,
    type: getExtension(resolvedFilename),
    filename: resolvedFilename,
    source,
    url,
    file: file || undefined,
    size: size ?? file?.size ?? bufferSize,
    version,
    timestamp: now,
    duration: duration ?? (phase === 'load-complete' && typeof startedAt === 'number' ? now - startedAt : undefined),
    reason,
  };
};

export const buildFileViewerLifecycleContextFromNormalizedSource = ({
  phase,
  source,
  version,
  startedAt,
  timestamp,
  reason,
}: BuildFileViewerLifecycleContextFromNormalizedSourceInput): FileViewerLifecycleContext => {
  const now = timestamp ?? Date.now();

  return buildFileViewerLifecycleContext({
    phase,
    filename: source.filename,
    source: source.kind,
    url: source.url,
    file: typeof File !== 'undefined' && source.file instanceof File ? source.file : undefined,
    size: source.size,
    version,
    timestamp: now,
    duration: phase.endsWith('complete') && typeof startedAt === 'number' ? now - startedAt : undefined,
    reason,
  });
};

export const resolveFileViewerLifecycleFallbackSource = ({
  file,
  url,
}: ResolveFileViewerLifecycleFallbackSourceInput = {}): ResolvedFileViewerLifecycleFallbackSource => {
  if (file) {
    return { source: 'file' };
  }

  if (url) {
    return { source: 'url', sourceUrl: url };
  }

  return { source: 'empty' };
};

export const createFileViewerLifecycleStateController = (): FileViewerLifecycleStateController => {
  let activeDocumentContext: FileViewerLifecycleContext | null = null;
  const loadStartedAt = new Map<number, number>();

  return {
    markLoadStarted(version, timestamp = Date.now()) {
      loadStartedAt.set(version, timestamp);
    },
    clearLoadStarted(version) {
      loadStartedAt.delete(version);
    },
    getLoadStartedAt(version) {
      return loadStartedAt.get(version);
    },
    getActiveDocumentContext() {
      return activeDocumentContext;
    },
    setActiveDocumentContext(context) {
      activeDocumentContext = context;
    },
    clearActiveDocumentContext() {
      activeDocumentContext = null;
    },
    buildActiveUnloadContext(phase, context, reason = 'replace', timestamp = Date.now()) {
      if (!context) {
        return null;
      }

      return {
        ...context,
        phase,
        timestamp,
        reason,
      };
    },
  };
};

export const buildFileViewerOperationContext = <
  Source extends string = FileViewerSourceKind,
>(
  operation: FileViewerOperationType,
  lifecycleContext: BuiltFileViewerLifecycleContext<Source>,
  timestamp = Date.now()
): BuiltFileViewerOperationContext<Source> => {
  const { phase: _phase, ...context } = lifecycleContext;

  return {
    ...context,
    operation,
    label: FILE_VIEWER_OPERATION_LABELS[operation],
    timestamp,
  };
};

export const buildFileViewerOperationContextFromLifecycleState = ({
  operation,
  lifecycleState,
  version,
  filename,
  bufferSize,
  currentFile,
  fallbackFile,
  fallbackUrl,
  timestamp,
  lifecycleTimestamp,
}: BuildFileViewerOperationContextFromLifecycleStateInput): FileViewerOperationContext => {
  const activeContext = lifecycleState.getActiveDocumentContext();
  const fallbackSource = resolveFileViewerLifecycleFallbackSource({
    file: fallbackFile,
    url: fallbackUrl,
  });
  const baseContext = activeContext || buildFileViewerLifecycleContext({
    phase: 'load-complete',
    version,
    source: fallbackSource.source,
    file: currentFile,
    filename,
    url: fallbackSource.sourceUrl,
    bufferSize,
    startedAt: lifecycleState.getLoadStartedAt(version),
    timestamp: lifecycleTimestamp,
  });

  return buildFileViewerOperationContext(operation, baseContext, timestamp);
};

export const emitFileViewerComponentLifecycleEvent = (
  emit: FileViewerLifecycleComponentEmit,
  context: FileViewerLifecycleContext
) => {
  if (context.phase === 'load-start') {
    emit('load-start', context);
    return;
  }
  if (context.phase === 'load-complete') {
    emit('load-complete', context);
    return;
  }
  if (context.phase === 'unload-start') {
    emit('unload-start', context);
    return;
  }
  emit('unload-complete', context);
};

export const resolveFileViewerBeforeOperationErrorMessage = ({
  error,
  formatErrorMessage,
  prefix = FILE_VIEWER_BEFORE_OPERATION_ERROR_PREFIX,
}: ResolveFileViewerBeforeOperationErrorMessageInput) => {
  return formatErrorMessage(prefix, error);
};

export const runFileViewerActiveUnloadStart = ({
  lifecycleState,
  reason = 'replace',
  onLifecycle,
}: RunFileViewerActiveUnloadStartInput): FileViewerActiveUnloadState => {
  const context = lifecycleState.getActiveDocumentContext();
  const unloadContext = lifecycleState.buildActiveUnloadContext('unload-start', context, reason);
  if (unloadContext) {
    onLifecycle?.(unloadContext);
  }

  return {
    reason,
    context,
    unloadContext,
  };
};

export const runFileViewerActiveUnloadComplete = ({
  lifecycleState,
  context = null,
  reason = 'replace',
  onLifecycle,
}: RunFileViewerActiveUnloadCompleteInput): FileViewerActiveUnloadState => {
  const unloadContext = lifecycleState.buildActiveUnloadContext('unload-complete', context, reason);
  if (unloadContext) {
    onLifecycle?.(unloadContext);
  }

  return {
    reason,
    context,
    unloadContext,
  };
};

export const getFileViewerLifecycleHookName = (phase: FileViewerLifecyclePhase) => {
  return FILE_VIEWER_LIFECYCLE_HOOKS[phase];
};

export const runFileViewerLifecycleHook = async <
  Context extends FileViewerLifecycleContext,
>(
  context: Context,
  hooks?: FileViewerLifecycleHooks,
  onError?: (error: unknown, context: Context) => void
) => {
  const hook = hooks?.[getFileViewerLifecycleHookName(context.phase)];
  if (!hook) {
    return;
  }

  try {
    await hook(context);
  } catch (error) {
    onError?.(error, context);
  }
};

export const getFileViewerBeforeOperationHooks = (
  options: FileViewerOptions | undefined,
  operation: FileViewerOperationType
): Array<FileViewerBeforeOperation | undefined> => {
  const toolbar = options?.toolbar;
  if (!toolbar || typeof toolbar !== 'object') {
    return [options?.beforeOperation];
  }

  const specificHook = operation === 'download'
    ? toolbar.beforeDownload
    : operation === 'print'
      ? toolbar.beforePrint
      : operation === 'export-html'
        ? toolbar.beforeExportHtml
        : undefined;

  return [options?.beforeOperation, toolbar.beforeOperation, specificHook];
};

export const runFileViewerBeforeOperation = async <
  Context extends FileViewerOperationContext,
>({
  context,
  options,
  onBefore,
  onCancel,
  onError,
}: RunFileViewerBeforeOperationInput<Context>) => {
  onBefore?.(context);

  try {
    for (const hook of getFileViewerBeforeOperationHooks(options, context.operation)) {
      if (!hook) {
        continue;
      }
      const result = await hook(context);
      if (result === false) {
        onCancel?.(context);
        return false;
      }
    }
  } catch (error) {
    onError?.(error, context);
    onCancel?.(context);
    return false;
  }

  return true;
};

export const serializeFileViewerContext = <
  Context extends FileViewerLifecycleContext | FileViewerOperationContext,
>(
  context: Context
): SerializedFileViewerContext<Context> => {
  const { file: _file, ...serializable } = context;

  return {
    ...serializable,
    hasFile: !!context.file,
  } as SerializedFileViewerContext<Context>;
};

export const createFileViewerPostMessagePayload = <
  Context extends FileViewerLifecycleContext | FileViewerOperationContext,
>(
  type: 'flyfish-viewer:lifecycle' | 'flyfish-viewer:operation',
  event: string,
  context: Context
): FileViewerPostMessagePayload<SerializedFileViewerContext<Context>> => {
  return {
    type,
    event,
    payload: serializeFileViewerContext(context),
  };
};

export const createFileViewerRawPostMessagePayload = <Payload>(
  type: FileViewerPostMessageType,
  event: string,
  payload: Payload
): FileViewerPostMessagePayload<Payload> => {
  return {
    type,
    event,
    payload,
  };
};

export const isFileViewerFrameEvent = (value: unknown): value is FileViewerFrameEventPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<FileViewerPostMessagePayload>;
  return typeof candidate.event === 'string' &&
    typeof candidate.type === 'string' &&
    FILE_VIEWER_POST_MESSAGE_TYPES.includes(candidate.type as FileViewerPostMessageType);
};

export const postFileViewerMessageToParent = <Payload>(
  payload: FileViewerPostMessagePayload<Payload>,
  targetOrigin = '*',
  targetWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined
) => {
  if (!targetWindow || targetWindow.parent === targetWindow) {
    return false;
  }

  targetWindow.parent.postMessage(payload, targetOrigin);
  return true;
};

export const postFileViewerLifecycleEvent = <
  Context extends FileViewerLifecycleContext,
>(
  context: Context,
  targetOrigin = '*',
  targetWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined
) => {
  return postFileViewerMessageToParent(
    createFileViewerPostMessagePayload('flyfish-viewer:lifecycle', context.phase, context),
    targetOrigin,
    targetWindow
  );
};

export const postFileViewerOperationContextEvent = <
  Context extends FileViewerOperationContext,
>(
  event: 'operation-before' | 'operation-cancel',
  context: Context,
  targetOrigin = '*',
  targetWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined
) => {
  return postFileViewerMessageToParent(
    createFileViewerPostMessagePayload('flyfish-viewer:operation', event, context),
    targetOrigin,
    targetWindow
  );
};

export const dispatchFileViewerLifecycleEvent = <
  Context extends FileViewerLifecycleContext,
>({
  context,
  hooks,
  onChange,
  onError,
  targetOrigin = '*',
  targetWindow = typeof window !== 'undefined' ? window : undefined,
}: DispatchFileViewerLifecycleEventInput<Context>) => {
  onChange?.(context.phase, context);
  void runFileViewerLifecycleHook(context, hooks, onError);
  return postFileViewerLifecycleEvent(context, targetOrigin, targetWindow);
};

export const dispatchFileViewerOperationContextEvent = <
  Context extends FileViewerOperationContext,
>({
  event,
  context,
  onChange,
  targetOrigin = '*',
  targetWindow = typeof window !== 'undefined' ? window : undefined,
}: DispatchFileViewerOperationContextEventInput<Context>) => {
  onChange?.(context);
  return postFileViewerOperationContextEvent(event, context, targetOrigin, targetWindow);
};

export const createFileViewerLifecycleActions = <
  OperationContext extends FileViewerOperationContext = FileViewerOperationContext,
>({
  lifecycleState,
  getOptions = () => undefined,
  onLifecycleChange,
  onLifecycleError,
  onOperationBefore,
  onOperationCancel,
  onOperationError,
  targetOrigin,
  targetWindow,
}: CreateFileViewerLifecycleActionsInput<OperationContext>): FileViewerLifecycleActions<OperationContext> => {
  const notifyLifecycle = (context: FileViewerLifecycleContext) => {
    return dispatchFileViewerLifecycleEvent({
      context,
      hooks: getOptions()?.hooks,
      onChange: onLifecycleChange,
      onError: onLifecycleError,
      targetOrigin,
      targetWindow,
    });
  };

  return {
    notifyLifecycle,
    notifyActiveUnloadStart(reason = 'replace') {
      return runFileViewerActiveUnloadStart({
        lifecycleState,
        reason,
        onLifecycle: notifyLifecycle,
      }).context;
    },
    notifyActiveUnloadComplete(context, reason = 'replace') {
      return runFileViewerActiveUnloadComplete({
        lifecycleState,
        context,
        reason,
        onLifecycle: notifyLifecycle,
      });
    },
    runBeforeOperation(context) {
      return runFileViewerBeforeOperation({
        context,
        options: getOptions(),
        onBefore: nextContext => {
          dispatchFileViewerOperationContextEvent({
            event: 'operation-before',
            context: nextContext,
            onChange: onOperationBefore,
            targetOrigin,
            targetWindow,
          });
        },
        onCancel: nextContext => {
          dispatchFileViewerOperationContextEvent({
            event: 'operation-cancel',
            context: nextContext,
            onChange: onOperationCancel,
            targetOrigin,
            targetWindow,
          });
        },
        onError: onOperationError,
      });
    },
  };
};

export const postFileViewerOperationAvailabilityChange = (
  availability: FileViewerOperationAvailability,
  targetOrigin = '*',
  targetWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined
) => {
  return postFileViewerMessageToParent(
    createFileViewerRawPostMessagePayload('flyfish-viewer:operation', 'operation-availability-change', availability),
    targetOrigin,
    targetWindow
  );
};

export const postFileViewerZoomChange = (
  state: FileViewerZoomState,
  targetOrigin = '*',
  targetWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined
) => {
  return postFileViewerMessageToParent(
    createFileViewerRawPostMessagePayload('flyfish-viewer:operation', 'zoom-change', state),
    targetOrigin,
    targetWindow
  );
};

export const dispatchFileViewerOperationAvailabilityChange = ({
  availability,
  onChange,
  targetOrigin = '*',
  targetWindow = typeof window !== 'undefined' ? window : undefined,
}: DispatchFileViewerOperationAvailabilityChangeInput) => {
  const payload = cloneFileViewerOperationAvailability(availability);
  onChange?.(payload);
  return postFileViewerOperationAvailabilityChange(payload, targetOrigin, targetWindow);
};

export const dispatchFileViewerZoomChange = ({
  state,
  onChange,
  targetOrigin = '*',
  targetWindow = typeof window !== 'undefined' ? window : undefined,
}: DispatchFileViewerZoomChangeInput) => {
  onChange?.(state);
  return postFileViewerZoomChange(state, targetOrigin, targetWindow);
};

export const createFileViewerToolbarActions = ({
  getOperationAvailability,
  getToolbarDisabled = () => false,
  getZoomState,
  onOperationAvailabilityChange,
  onZoomChange,
  targetOrigin,
  targetWindow,
}: CreateFileViewerToolbarActionsInput): FileViewerToolbarActions => {
  return {
    notifyOperationAvailabilityChange(availability = getOperationAvailability()) {
      return dispatchFileViewerOperationAvailabilityChange({
        availability,
        onChange: onOperationAvailabilityChange,
        targetOrigin,
        targetWindow,
      });
    },
    notifyZoomChange(state = getZoomState()) {
      return dispatchFileViewerZoomChange({
        state,
        onChange: onZoomChange,
        targetOrigin,
        targetWindow,
      });
    },
    isZoomButtonDisabled(action) {
      return isFileViewerZoomButtonDisabled({
        action,
        availability: getOperationAvailability(),
        toolbarDisabled: getToolbarDisabled(),
        zoomState: getZoomState(),
      });
    },
  };
};

export const postFileViewerSearchChange = (
  state: FileViewerSearchState,
  targetOrigin = '*',
  targetWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined
) => {
  return postFileViewerMessageToParent(
    createFileViewerRawPostMessagePayload('flyfish-viewer:search', 'search-change', state),
    targetOrigin,
    targetWindow
  );
};

export const postFileViewerLocationChange = (
  anchor: FileViewerDocumentAnchor | null,
  targetOrigin = '*',
  targetWindow: Window | undefined = typeof window !== 'undefined' ? window : undefined
) => {
  return postFileViewerMessageToParent(
    createFileViewerRawPostMessagePayload('flyfish-viewer:location', 'location-change', anchor),
    targetOrigin,
    targetWindow
  );
};

export const normalizeFileViewerToolbar = (
  options: Pick<FileViewerOptions, 'toolbar'> | undefined
): FileViewerToolbarOptions => {
  const toolbar = options?.toolbar;
  if (toolbar === false) {
    return {
      download: false,
      print: false,
      exportHtml: false,
      zoom: false,
    };
  }
  if (toolbar && typeof toolbar === 'object') {
    return {
      download: toolbar.download !== false,
      print: toolbar.print !== false,
      exportHtml: toolbar.exportHtml !== false,
      zoom: toolbar.zoom !== false,
    };
  }
  return {
    download: true,
    print: true,
    exportHtml: true,
    zoom: true,
  };
};

export const resolveFileViewerOperationAvailability = ({
  extension,
  hasOriginalSource,
  renderedReady,
  hasError = false,
  adapter,
  source,
  zoomState,
}: ResolveFileViewerOperationAvailabilityInput): FileViewerOperationAvailability => {
  const hasRenderableOutput = renderedReady && !hasError;
  const hasSource = hasOriginalSource ?? (source ? hasFileViewerOriginalSource(source) : false);
  const zoomEnabled = hasRenderableOutput && (zoomState.canZoomIn || zoomState.canZoomOut || zoomState.canReset);

  return {
    download: hasSource,
    print: hasRenderableOutput && resolvePrintAvailability(extension, adapter ?? null, renderedReady),
    exportHtml: hasRenderableOutput && adapter?.exportHtml !== false,
    zoom: zoomEnabled,
    zoomIn: zoomEnabled && zoomState.canZoomIn,
    zoomOut: zoomEnabled && zoomState.canZoomOut,
    zoomReset: zoomEnabled && zoomState.canReset,
  };
};

export const cloneFileViewerOperationAvailability = (
  availability: FileViewerOperationAvailability
): FileViewerOperationAvailability => ({
  download: availability.download,
  print: availability.print,
  exportHtml: availability.exportHtml,
  zoom: availability.zoom,
  zoomIn: availability.zoomIn,
  zoomOut: availability.zoomOut,
  zoomReset: availability.zoomReset,
});

export const resolveVisibleFileViewerToolbar = (
  toolbar: FileViewerToolbarOptions,
  availability: FileViewerOperationAvailability
): FileViewerToolbarOptions => {
  return {
    download: toolbar.download && availability.download,
    print: toolbar.print && availability.print,
    exportHtml: toolbar.exportHtml && availability.exportHtml,
    zoom: toolbar.zoom && availability.zoom,
  };
};

export const hasVisibleFileViewerToolbarActions = (toolbar: FileViewerToolbarOptions) => {
  return !!(toolbar.download || toolbar.print || toolbar.exportHtml || toolbar.zoom);
};

export const isFileViewerZoomButtonDisabled = ({
  toolbarDisabled = false,
  availability,
  zoomState,
  action,
}: {
  toolbarDisabled?: boolean;
  availability: FileViewerOperationAvailability;
  zoomState: FileViewerZoomState;
  action: keyof Pick<FileViewerZoomState, 'canZoomIn' | 'canZoomOut' | 'canReset'>;
}) => {
  return toolbarDisabled || !availability.zoom || !zoomState[action];
};

export const isFileViewerToolbarDisabled = ({
  loading = false,
  hasError = false,
}: {
  loading?: boolean;
  hasError?: boolean;
}) => {
  return !!(loading || hasError);
};

export const resolveFileViewerToolbarState = ({
  toolbar,
  options,
  loading = false,
  ...availabilityInput
}: ResolveFileViewerToolbarStateInput): FileViewerToolbarState => {
  const operationAvailability = resolveFileViewerOperationAvailability(availabilityInput);
  const visibleToolbar = resolveVisibleFileViewerToolbar(toolbar, operationAvailability);

  return {
    operationAvailability,
    visibleToolbar,
    showToolbar: hasVisibleFileViewerToolbarActions(visibleToolbar),
    toolbarPosition: resolveFileViewerToolbarPosition(options, availabilityInput.extension),
    toolbarDisabled: isFileViewerToolbarDisabled({
      loading,
      hasError: availabilityInput.hasError,
    }),
  };
};

export const resolveFileViewerToolbarPosition = (
  options: Pick<FileViewerOptions, 'toolbar'> | undefined,
  extension: string
): FileViewerToolbarPosition => {
  const toolbar = options?.toolbar;
  const position = toolbar && typeof toolbar === 'object' ? toolbar.position : 'auto';
  if (position === 'top' || position === 'bottom-right') {
    return position;
  }
  return extension === 'pdf' ? 'bottom-right' : 'top';
};
