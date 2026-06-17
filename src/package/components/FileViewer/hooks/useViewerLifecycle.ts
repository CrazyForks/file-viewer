import {
  buildFileViewerLifecycleContext,
  buildFileViewerOperationContext,
  createFileViewerPostMessagePayload,
  postFileViewerMessageToParent,
  runFileViewerBeforeOperation,
  runFileViewerLifecycleHook
} from '@file-viewer/core'
import type {
  FileViewerLifecycleContext,
  FileViewerLifecyclePhase,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerOptions
} from '@/package/common/type'

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
  let activeDocumentContext: FileViewerLifecycleContext | null = null
  const loadStartedAt = new Map<number, number>()

  const markLoadStarted = (version: number, timestamp = Date.now()) => {
    loadStartedAt.set(version, timestamp)
  }

  const clearLoadStarted = (version: number) => {
    loadStartedAt.delete(version)
  }

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
      startedAt: loadStartedAt.get(version),
      reason
    })
  }

  const notifyLifecycle = (context: FileViewerLifecycleContext) => {
    emitLifecycle(context.phase, context)
    void runFileViewerLifecycleHook(context, getOptions()?.hooks, handleLifecycleError)
    postFileViewerMessageToParent(
      createFileViewerPostMessagePayload('flyfish-viewer:lifecycle', context.phase, context)
    )
  }

  const notifyActiveUnloadStart = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    const context = activeDocumentContext
    if (!context) {
      return null
    }

    notifyLifecycle({
      ...context,
      phase: 'unload-start',
      timestamp: Date.now(),
      reason
    })
    return context
  }

  const notifyActiveUnloadComplete = (
    context: FileViewerLifecycleContext | null,
    reason: FileViewerLifecycleContext['reason'] = 'replace'
  ) => {
    if (!context) {
      return
    }

    notifyLifecycle({
      ...context,
      phase: 'unload-complete',
      timestamp: Date.now(),
      reason
    })
  }

  const setActiveDocumentContext = (context: FileViewerLifecycleContext) => {
    activeDocumentContext = context
  }

  const clearActiveDocumentContext = () => {
    activeDocumentContext = null
  }

  const buildOperationContext = (operation: FileViewerOperationType): FileViewerOperationContext => {
    const base = activeDocumentContext || buildLifecycleContext({
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
        postFileViewerMessageToParent(
          createFileViewerPostMessagePayload('flyfish-viewer:operation', 'operation-before', nextContext)
        )
      },
      onCancel: nextContext => {
        emitOperationCancel(nextContext)
        postFileViewerMessageToParent(
          createFileViewerPostMessagePayload('flyfish-viewer:operation', 'operation-cancel', nextContext)
        )
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
    setActiveDocumentContext,
    clearActiveDocumentContext,
    buildOperationContext,
    runBeforeOperation
  }
}
