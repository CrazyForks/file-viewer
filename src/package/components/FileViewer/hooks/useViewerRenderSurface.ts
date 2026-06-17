import { nextTick, ref, shallowRef, type Ref } from 'vue'
import {
  getExtension,
  waitForFileViewerNextPaint
} from '@file-viewer/core'
import type {
  FileRenderExportAdapter,
  FileViewerLifecycleContext,
  FileViewerOptions
} from '@/package/common/type'
import { renderSession, type FileViewerVueRenderSession } from '../util'

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

const waitForBrowserPaint = () => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return new Promise<void>(resolve => setTimeout(resolve, 0))
  }

  return waitForFileViewerNextPaint()
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
  let activeRenderSession: FileViewerVueRenderSession | null = null

  const destroyRenderSession = (session?: FileViewerVueRenderSession | null) => {
    if (!session) {
      return
    }

    try {
      const result = session.destroy?.()
      if (result && typeof result === 'object' && 'then' in result) {
        void (result as Promise<void>).catch(nextError => {
          console.warn('预览内容卸载失败', nextError)
        })
      }
    } catch (nextError) {
      console.warn('预览内容卸载失败', nextError)
    }
  }

  const setActiveRenderSession = (session: FileViewerVueRenderSession | null) => {
    activeRenderSession = session
  }

  const clearRenderedContent = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    const context = notifyActiveUnloadStart(reason)

    try {
      destroyRenderSession(activeRenderSession)
    } finally {
      activeRenderSession = null
      clearActiveDocumentContext()
      activeExportAdapter.value = null
      renderedReady.value = false
      progressiveReady.value = false
      clearDocumentState()
      stopZoomObserver()
      clearZoomProvider()

      const out = output.value
      if (out) {
        while (out.firstChild) {
          out.removeChild(out.firstChild)
        }
      }
    }

    notifyActiveUnloadComplete(context, reason)
  }

  const registerExportAdapter = (adapter: FileRenderExportAdapter | null) => {
    activeExportAdapter.value = adapter
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

    const child = document.createElement('div')
    child.className = 'file-render'
    out.appendChild(child)
    startZoomObserver()
    await nextTick()
    await waitForBrowserPaint()

    if (!isCurrentRequest(version)) {
      if (child.parentNode === out) {
        out.removeChild(child)
      }
      return undefined
    }

    try {
      const session = await renderSession(buffer, getExtension(file.name), child, {
        filename: file.name,
        url: sourceUrl,
        streamUrl,
        options: getOptions(),
        registerExportAdapter,
        onProgressiveRender: () => {
          if (isCurrentRequest(version)) {
            progressiveReady.value = true
          }
        }
      })
      if (!isCurrentRequest(version)) {
        destroyRenderSession(session)
        if (child.parentNode === out) {
          out.removeChild(child)
        }
        return undefined
      }
      void refreshDocumentIndex()
      refreshZoomProvider()
      return session
    } catch (nextError) {
      if (child.parentNode === out) {
        out.removeChild(child)
      }
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
