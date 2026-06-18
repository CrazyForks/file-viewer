import { nextTick, ref, shallowRef, type Ref } from 'vue'
import {
  applyFileViewerRenderSurfaceState,
  createFileViewerRenderReadinessTarget,
  createFileViewerRenderSurfaceStateTarget,
  disposeFileViewerRendererSession,
  runFileViewerRenderSurfaceClear,
  runFileViewerRenderSurfaceMount
} from '@file-viewer/core'
import type {
  FileRenderExportAdapter,
  FileViewerLifecycleContext,
  FileViewerOptions
} from '@file-viewer/core'
import { createVueRenderSession, type FileViewerVueRenderSession } from '../rendererBridge'

interface UseViewerRenderSurfaceOptions {
  output: Ref<HTMLDivElement | null>;
  getOptions: () => FileViewerOptions | undefined;
  isCurrentRequest: (version: number) => boolean;
  notifyActiveUnloadStart: (
    reason?: FileViewerLifecycleContext['reason']
  ) => FileViewerLifecycleContext | null;
  notifyActiveUnloadComplete: (
    context: FileViewerLifecycleContext | null,
    reason?: FileViewerLifecycleContext['reason']
  ) => void;
  clearActiveDocumentContext: () => void;
  clearDocumentState: () => void;
  refreshDocumentIndex: () => Promise<unknown> | unknown;
  startZoomObserver: () => void;
  stopZoomObserver: () => void;
  clearZoomProvider: () => void;
  refreshZoomProvider: () => void;
}

/**
 * FileViewer 组件层的渲染面板门面。
 *
 * 它只管理 Vue wrapper 的 DOM surface、渲染 session 和 export adapter；
 * 具体格式派发仍由 core registry + Vue renderer bridge 完成。
 */
export const useViewerRenderSurface = ({
  output,
  getOptions,
  isCurrentRequest,
  notifyActiveUnloadStart,
  notifyActiveUnloadComplete,
  clearActiveDocumentContext,
  clearDocumentState,
  refreshDocumentIndex,
  startZoomObserver,
  stopZoomObserver,
  clearZoomProvider,
  refreshZoomProvider
}: UseViewerRenderSurfaceOptions) => {
  const activeExportAdapter = shallowRef<FileRenderExportAdapter | null>(null)
  const renderedReady = ref(false)
  const progressiveReady = ref(false)
  const renderReadinessTarget = createFileViewerRenderReadinessTarget({
    renderedReady: {
      get: () => renderedReady.value,
      set: value => {
        renderedReady.value = value
      }
    },
    progressiveReady: {
      get: () => progressiveReady.value,
      set: value => {
        progressiveReady.value = value
      }
    }
  })
  let activeRenderSession: FileViewerVueRenderSession | null = null
  const renderSurfaceStateTarget = createFileViewerRenderSurfaceStateTarget<FileViewerVueRenderSession>({
    session: {
      get: () => activeRenderSession,
      set: value => {
        activeRenderSession = value
      }
    },
    exportAdapter: {
      get: () => activeExportAdapter.value,
      set: value => {
        activeExportAdapter.value = value
      }
    }
  })

  const destroyRenderSession = (session?: FileViewerVueRenderSession | null) => {
    disposeFileViewerRendererSession(session, {
      onError: nextError => {
        console.warn('预览内容卸载失败', nextError)
      }
    })
  }

  const setActiveRenderSession = (session: FileViewerVueRenderSession | null) => {
    applyFileViewerRenderSurfaceState(renderSurfaceStateTarget, { session })
  }

  const clearRenderedContent = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    runFileViewerRenderSurfaceClear({
      reason,
      surfaceState: renderSurfaceStateTarget,
      readinessState: renderReadinessTarget,
      container: output.value,
      disposeOptions: {
        onError: nextError => {
          console.warn('预览内容卸载失败', nextError)
        }
      },
      onUnloadStart: notifyActiveUnloadStart,
      onUnloadComplete: (context, nextReason) => {
        notifyActiveUnloadComplete(context ?? null, nextReason)
      },
      onClearActiveDocumentContext: clearActiveDocumentContext,
      onClearDocumentState: clearDocumentState,
      onStopZoomObserver: stopZoomObserver,
      onClearZoomProvider: clearZoomProvider
    })
  }

  const mountRenderedContent = async (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string
  ) => {
    return await runFileViewerRenderSurfaceMount({
      buffer,
      file,
      version,
      sourceUrl,
      streamUrl,
      getContainer: () => output.value,
      surfaceState: renderSurfaceStateTarget,
      readinessState: renderReadinessTarget,
      isCurrent: isCurrentRequest,
      clearRenderedContent,
      waitForContainer: nextTick,
      disposeSession: destroyRenderSession,
      onStartZoomObserver: startZoomObserver,
      onRefreshDocumentIndex: refreshDocumentIndex,
      onRefreshZoomProvider: refreshZoomProvider,
      render: async ({
        buffer: nextBuffer,
        type,
        target,
        filename,
        sourceUrl: nextSourceUrl,
        streamUrl: nextStreamUrl,
        registerExportAdapter,
        onProgressiveRender
      }) => {
        return await createVueRenderSession(nextBuffer, type, target as HTMLDivElement, {
          filename,
          url: nextSourceUrl,
          streamUrl: nextStreamUrl,
          options: getOptions(),
          registerExportAdapter,
          onProgressiveRender
        })
      }
    })
  }

  return {
    activeExportAdapter,
    renderedReady,
    progressiveReady,
    clearRenderedContent,
    destroyRenderSession,
    mountRenderedContent,
    setActiveRenderSession
  }
}
