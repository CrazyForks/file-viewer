import { nextTick, ref, shallowRef, type Ref } from 'vue'
import {
  applyFileViewerRenderReadinessState,
  applyFileViewerRenderSurfaceState,
  createFileViewerRenderTarget,
  disposeFileViewerRendererSession,
  getExtension,
  removeFileViewerRenderTarget,
  resetFileViewerRenderSurface,
  waitForFileViewerNextPaint
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
  const renderReadinessTarget = {
    get renderedReady(): boolean {
      return renderedReady.value
    },
    set renderedReady(value: boolean) {
      renderedReady.value = value
    },
    get progressiveReady(): boolean {
      return progressiveReady.value
    },
    set progressiveReady(value: boolean) {
      progressiveReady.value = value
    }
  }
  let activeRenderSession: FileViewerVueRenderSession | null = null
  const renderSurfaceStateTarget = {
    get session(): FileViewerVueRenderSession | null {
      return activeRenderSession
    },
    set session(value: FileViewerVueRenderSession | null) {
      activeRenderSession = value
    },
    get exportAdapter(): FileRenderExportAdapter | null {
      return activeExportAdapter.value
    },
    set exportAdapter(value: FileRenderExportAdapter | null) {
      activeExportAdapter.value = value
    }
  }

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
    const context = notifyActiveUnloadStart(reason)

    try {
      resetFileViewerRenderSurface({
        surfaceState: renderSurfaceStateTarget,
        readinessState: renderReadinessTarget,
        container: output.value,
        disposeOptions: {
          onError: nextError => {
            console.warn('预览内容卸载失败', nextError)
          }
        }
      })
    } finally {
      clearActiveDocumentContext()
      clearDocumentState()
      stopZoomObserver()
      clearZoomProvider()
    }

    notifyActiveUnloadComplete(context, reason)
  }

  const registerExportAdapter = (adapter: FileRenderExportAdapter | null) => {
    applyFileViewerRenderSurfaceState(renderSurfaceStateTarget, { exportAdapter: adapter })
  }

  const mountRenderedContent = async (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string
  ) => {
    if (!output.value) {
      await nextTick()
    }

    const out = output.value
    if (!out || !isCurrentRequest(version)) {
      return undefined
    }

    clearRenderedContent('replace')

    const child = createFileViewerRenderTarget(out)
    startZoomObserver()
    await nextTick()
    await waitForFileViewerNextPaint()

    if (!isCurrentRequest(version)) {
      removeFileViewerRenderTarget(out, child)
      return undefined
    }

    try {
      const session = await createVueRenderSession(buffer, getExtension(file.name), child, {
        filename: file.name,
        url: sourceUrl,
        streamUrl,
        options: getOptions(),
        registerExportAdapter,
        onProgressiveRender: () => {
          if (isCurrentRequest(version)) {
            applyFileViewerRenderReadinessState(renderReadinessTarget, { progressiveReady: true })
          }
        }
      })
      if (!isCurrentRequest(version)) {
        destroyRenderSession(session)
        removeFileViewerRenderTarget(out, child)
        return undefined
      }
      void refreshDocumentIndex()
      refreshZoomProvider()
      return session
    } catch (nextError) {
      removeFileViewerRenderTarget(out, child)
      throw nextError
    }
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
