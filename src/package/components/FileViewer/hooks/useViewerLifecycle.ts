import {
  buildFileViewerOperationContextFromLifecycleState,
  createFileViewerLifecycleActions,
  createFileViewerLifecycleStateController,
  createFileViewerLoadStartState,
  createFileViewerRenderCompleteState,
  emitFileViewerComponentLifecycleEvent,
  resolveFileViewerBeforeOperationErrorMessage,
} from '@file-viewer/core'
import type {
  FileViewerErrorMessageFormatter,
  FileViewerFileRef,
  FileViewerLifecycleContext,
  FileViewerLifecycleComponentEmit,
  FileViewerLoadStartState,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions,
  FileViewerRenderCompleteState
} from '@file-viewer/core'

interface BuildViewerLoadStartStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  file?: File | null;
  sourceUrl?: string | null;
}

interface BuildViewerRenderCompleteStateInput {
  version: number;
  source: FileViewerLifecycleContext['source'];
  file?: File | null;
  sourceUrl?: string | null;
}

interface UseViewerLifecycleOptions {
  getOptions: () => FileViewerOptions | undefined;
  getFilename: () => string;
  getBufferSize: () => number | undefined;
  getCurrentFile: () => File | null;
  getCurrentVersion: () => number;
  getFallbackFile: () => FileViewerFileRef | undefined;
  getFallbackUrl: () => string | undefined;
  emitLifecycle: FileViewerLifecycleComponentEmit;
  emitOperationBefore: (context: FileViewerOperationContext) => void;
  emitOperationCancel: (context: FileViewerOperationContext) => void;
  formatErrorMessage: FileViewerErrorMessageFormatter;
  handleLifecycleError: (error: unknown, context: FileViewerLifecycleContext) => void;
  handleOperationError?: (error: unknown, context: FileViewerOperationContext) => void;
  onOperationErrorMessage?: (message: string, context: FileViewerOperationContext) => void;
}

/**
 * FileViewer 组件层的生命周期与操作门面。
 *
 * 纯 TS 协议已经由 `@file-viewer/core` 提供；这里仅把 Vue emit、iframe
 * postMessage 和组件当前状态组合起来，保持入口组件更薄。
 */
export const useViewerLifecycle = ({
  getOptions,
  getFilename,
  getBufferSize,
  getCurrentFile,
  getCurrentVersion,
  getFallbackFile,
  getFallbackUrl,
  emitLifecycle,
  emitOperationBefore,
  emitOperationCancel,
  formatErrorMessage,
  handleLifecycleError,
  handleOperationError,
  onOperationErrorMessage
}: UseViewerLifecycleOptions) => {
  const lifecycleState = createFileViewerLifecycleStateController()

  const markLoadStarted = lifecycleState.markLoadStarted
  const clearLoadStarted = lifecycleState.clearLoadStarted

  const lifecycleActions = createFileViewerLifecycleActions({
    lifecycleState,
    getOptions,
    onLifecycleChange: (_event, context) => {
      emitFileViewerComponentLifecycleEvent(emitLifecycle, context)
    },
    onLifecycleError: handleLifecycleError,
    onOperationBefore: emitOperationBefore,
    onOperationCancel: emitOperationCancel,
    onOperationError: (error, context) => {
      handleOperationError?.(error, context)
      onOperationErrorMessage?.(
        resolveFileViewerBeforeOperationErrorMessage({
          error,
          formatErrorMessage
        }),
        context
      )
    }
  })

  const buildOperationContext = (operation: FileViewerOperationType): FileViewerOperationContext => {
    return buildFileViewerOperationContextFromLifecycleState({
      operation,
      lifecycleState,
      version: getCurrentVersion(),
      filename: getFilename(),
      bufferSize: getBufferSize(),
      currentFile: getCurrentFile(),
      fallbackFile: getFallbackFile(),
      fallbackUrl: getFallbackUrl()
    })
  }

  const buildLoadStartState = ({
    version,
    source,
    file,
    sourceUrl
  }: BuildViewerLoadStartStateInput): FileViewerLoadStartState => {
    return createFileViewerLoadStartState({
      version,
      source,
      file,
      sourceUrl,
      filename: getFilename(),
      bufferSize: getBufferSize()
    })
  }

  const buildRenderCompleteState = ({
    version,
    source,
    file,
    sourceUrl
  }: BuildViewerRenderCompleteStateInput): FileViewerRenderCompleteState => {
    return createFileViewerRenderCompleteState({
      version,
      source,
      file,
      sourceUrl,
      filename: getFilename(),
      bufferSize: getBufferSize(),
      lifecycleState
    })
  }

  const runBeforeOperation = async (operation: FileViewerOperationType) => {
    const context = buildOperationContext(operation)
    return lifecycleActions.runBeforeOperation(context)
  }

  return {
    markLoadStarted,
    clearLoadStarted,
    notifyLifecycle: lifecycleActions.notifyLifecycle,
    notifyActiveUnloadStart: lifecycleActions.notifyActiveUnloadStart,
    notifyActiveUnloadComplete: lifecycleActions.notifyActiveUnloadComplete,
    setActiveDocumentContext: lifecycleState.setActiveDocumentContext,
    clearActiveDocumentContext: lifecycleState.clearActiveDocumentContext,
    buildOperationContext,
    buildLoadStartState,
    buildRenderCompleteState,
    runBeforeOperation
  }
}
