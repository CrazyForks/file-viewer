import { reactive, type Ref } from 'vue'
import {
  cloneFileViewerZoomState,
  createFileViewerZoomController,
  createFileViewerZoomState
} from '@file-viewer/core'
export {
  findFileViewerZoomProvider,
  registerFileViewerZoomProvider,
  unregisterFileViewerZoomProvider
} from '@file-viewer/core'
import type { FileViewerOperationType, FileViewerZoomProvider, FileViewerZoomState } from '@/package/common/type'

export const createZoomChangeEmitter = () => {
  const listeners = new Set<() => void>()
  return {
    emit() {
      listeners.forEach(listener => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

interface UseViewerZoomOptions {
  root: Ref<HTMLElement | null>;
  enabled?: () => boolean;
  beforeZoom?: (operation: Extract<FileViewerOperationType, 'zoom-in' | 'zoom-out' | 'zoom-reset'>) => Promise<boolean> | boolean;
}

/**
 * FileViewer 内部的统一缩放门面。
 *
 * 这里只寻找并调用当前渲染器注册的 provider，不做通用 CSS 缩放兜底。
 * 这样可以确保虚拟表格、PDF 文本层、CAD canvas 等交互坐标仍由各自渲染器掌控。
 */
export const useViewerZoom = ({
  root,
  enabled,
  beforeZoom
}: UseViewerZoomOptions) => {
  const state = reactive(createFileViewerZoomState())
  const controller = createFileViewerZoomController({
    root: () => root.value,
    enabled,
    beforeZoom
  })

  const applyState = (nextState?: FileViewerZoomState | null) => {
    const normalized = createFileViewerZoomState(nextState || {})
    state.scale = normalized.scale
    state.label = normalized.label
    state.canZoomIn = normalized.canZoomIn
    state.canZoomOut = normalized.canZoomOut
    state.canReset = normalized.canReset
    state.minScale = normalized.minScale
    state.maxScale = normalized.maxScale
  }

  const syncFromController = (nextProvider: FileViewerZoomProvider | null = controller.provider) => {
    applyState(controller.state)
    return nextProvider
  }

  return {
    zoomState: state,
    hasZoomProvider: () => {
      const nextProvider = controller.refreshProvider()
      syncFromController(nextProvider)
      return !!nextProvider
    },
    refreshZoomProvider: () => {
      const nextProvider = controller.refreshProvider()
      return syncFromController(nextProvider)
    },
    startZoomObserver: () => {
      controller.observe()
      syncFromController()
    },
    stopZoomObserver: () => {
      controller.destroy()
      syncFromController(null)
    },
    clearZoomProvider: () => {
      controller.clearProvider()
      syncFromController(null)
    },
    getZoomState: () => cloneFileViewerZoomState(state),
    zoomIn: async () => {
      const nextState = await controller.zoomIn()
      applyState(nextState)
      return cloneFileViewerZoomState(state)
    },
    zoomOut: async () => {
      const nextState = await controller.zoomOut()
      applyState(nextState)
      return cloneFileViewerZoomState(state)
    },
    resetZoom: async () => {
      const nextState = await controller.resetZoom()
      applyState(nextState)
      return cloneFileViewerZoomState(state)
    }
  }
}
