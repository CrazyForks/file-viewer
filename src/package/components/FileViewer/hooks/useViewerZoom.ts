import { reactive, type Ref } from 'vue'
import {
  applyFileViewerZoomState,
  cloneFileViewerZoomState,
  createFileViewerZoomController,
  createFileViewerZoomState,
  type FileViewerOperationType,
  type FileViewerZoomProvider
} from '@file-viewer/core'

interface UseFileViewerZoomOptions {
  output: Ref<HTMLDivElement | null>;
  enabled: () => boolean;
  runBeforeOperation: (operation: FileViewerOperationType) => Promise<boolean>;
}

/**
 * FileViewer 组件层的缩放门面。
 *
 * provider 注册、状态读取和 MutationObserver 调度由 core controller 负责；
 * 这里只保留 Vue 响应式状态同步、操作前置钩子和组件 ref API。
 */
export const useViewerZoom = ({
  output,
  enabled,
  runBeforeOperation
}: UseFileViewerZoomOptions) => {
  const state = reactive(createFileViewerZoomState())
  const controller = createFileViewerZoomController({
    root: () => output.value,
    enabled,
    beforeZoom: operation => runBeforeOperation(operation)
  })

  const syncFromController = (nextProvider: FileViewerZoomProvider | null = controller.provider) => {
    applyFileViewerZoomState(state, controller.state)
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
      applyFileViewerZoomState(state, nextState)
      return cloneFileViewerZoomState(state)
    },
    zoomOut: async () => {
      const nextState = await controller.zoomOut()
      applyFileViewerZoomState(state, nextState)
      return cloneFileViewerZoomState(state)
    },
    resetZoom: async () => {
      const nextState = await controller.resetZoom()
      applyFileViewerZoomState(state, nextState)
      return cloneFileViewerZoomState(state)
    }
  }
}
