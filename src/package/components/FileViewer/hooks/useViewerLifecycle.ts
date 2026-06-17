import {
  buildFileViewerLifecycleContext,
  buildFileViewerOperationContext,
  createFileViewerLifecycleStateController,
  postFileViewerLifecycleEvent,
  postFileViewerOperationContextEvent,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook
} from '@file-viewer/core'
import type {
  FileViewerLifecycleContext,
  FileViewerLifecyclePhase,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions
} from '@file-viewer/core'

interface BuildViewerLifecycleContextInput {
  phase: FileViewerLifecyclePhase;
  version: number;
  source: FileViewerLifecycleContext['source'];
  file?: File | null;
  sourceUrl?: string;
  reason?: FileViewerLifecycleContext['reason'];
}

interface UseViewerLifecycleOptions {
  getOptions: () => FileViewerOptions | undefined;
  getFilename: () => string;
  getBufferSize: () => number | undefined;
  getCurrentFile: () => File | null;
  getCurrentVersion: () => number;
  getFallbackSource: () => FileViewerLifecycleContext['source'];
  getFallbackSourceUrl: () => string | undefined;
  emitLifecycle: (event: FileViewerLifecyclePhase, context: FileViewerLifecycleContext) => void;
  emitOperationBefore: (context: FileViewerOperationContext) => void;
  emitOperationCancel: (context: FileViewerOperationContext) => void;
  handleLifecycleError: (error: unknown, context: FileViewerLifecycleContext) => void;
  handleOperationError: (error: unknown, context: FileViewerOperationContext) => void;
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
  getFallbackSource,
  getFallbackSourceUrl,
  emitLifecycle,
  emitOperationBefore,
  emitOperationCancel,
  handleLifecycleError,
  handleOperationError
}: UseViewerLifecycleOptions) => {
  const lifecycleState = createFileViewerLifecycleStateController()

  const markLoadStarted = lifecycleState.markLoadStarted
  const clearLoadStarted = lifecycleState.clearLoadStarted

  const buildLifecycleContext = ({
    phase,
    version,
    source,
    file,
    sourceUrl,
    reason
  }: BuildViewerLifecycleContextInput): FileViewerLifecycleContext => {
    return buildFileViewerLifecycleContext({
      phase,
      source,
      version,
      file,
      filename: getFilename(),
      url: sourceUrl,
      bufferSize: getBufferSize(),
      startedAt: lifecycleState.getLoadStartedAt(version),
      reason
    })
  }

  const notifyLifecycle = (context: FileViewerLifecycleContext) => {
    emitLifecycle(context.phase, context)
    void runFileViewerLifecycleHook(context, getOptions()?.hooks, handleLifecycleError)
    postFileViewerLifecycleEvent(context)
  }

  const notifyActiveUnloadStart = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    const context = lifecycleState.getActiveDocumentContext()
    const unloadContext = lifecycleState.buildActiveUnloadContext('unload-start', context, reason)
    if (!unloadContext) {
      return null
    }

    notifyLifecycle(unloadContext)
    return context
  }

  const notifyActiveUnloadComplete = (
    context: FileViewerLifecycleContext | null,
    reason: FileViewerLifecycleContext['reason'] = 'replace'
  ) => {
    if (!context) {
      return
    }

    const unloadContext = lifecycleState.buildActiveUnloadContext('unload-complete', context, reason)
    if (unloadContext) {
      notifyLifecycle(unloadContext)
    }
  }

  const buildOperationContext = (operation: FileViewerOperationType): FileViewerOperationContext => {
    const base = lifecycleState.getActiveDocumentContext() || buildLifecycleContext({
      phase: 'load-complete',
      version: getCurrentVersion(),
      source: getFallbackSource(),
      file: getCurrentFile(),
      sourceUrl: getFallbackSourceUrl()
    })
    return buildFileViewerOperationContext(operation, base)
  }

  const runBeforeOperation = async (operation: FileViewerOperationType) => {
    const context = buildOperationContext(operation)
    return runFileViewerBeforeOperation({
      context,
      options: getOptions(),
      onBefore: nextContext => {
        emitOperationBefore(nextContext)
        postFileViewerOperationContextEvent('operation-before', nextContext)
      },
      onCancel: nextContext => {
        emitOperationCancel(nextContext)
        postFileViewerOperationContextEvent('operation-cancel', nextContext)
      },
      onError: handleOperationError
    })
  }

  return {
    markLoadStarted,
    clearLoadStarted,
    buildLifecycleContext,
    notifyLifecycle,
    notifyActiveUnloadStart,
    notifyActiveUnloadComplete,
    setActiveDocumentContext: lifecycleState.setActiveDocumentContext,
    clearActiveDocumentContext: lifecycleState.clearActiveDocumentContext,
    buildOperationContext,
    runBeforeOperation
  }
}
