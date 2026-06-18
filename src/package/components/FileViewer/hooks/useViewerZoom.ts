import { reactive, type Ref } from 'vue'
import {
  clearFileViewerZoomControllerProvider,
  createFileViewerZoomChangeState,
  createFileViewerZoomController,
  createFileViewerZoomState,
  destroyFileViewerZoomController,
  observeFileViewerZoomController,
  refreshFileViewerZoomControllerProvider,
  runFileViewerZoomControllerAction,
  type FileViewerOperationType,
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

  return {
    zoomState: state,
    hasZoomProvider: () => {
      const nextProvider = refreshFileViewerZoomControllerProvider(state, controller)
      return !!nextProvider
    },
    refreshZoomProvider: () => refreshFileViewerZoomControllerProvider(state, controller),
    startZoomObserver: () => {
      observeFileViewerZoomController(state, controller)
    },
    stopZoomObserver: () => {
      destroyFileViewerZoomController(state, controller)
    },
    clearZoomProvider: () => {
      clearFileViewerZoomControllerProvider(state, controller)
    },
    getZoomState: () => createFileViewerZoomChangeState(state),
    zoomIn: () => runFileViewerZoomControllerAction(state, () => controller.zoomIn()),
    zoomOut: () => runFileViewerZoomControllerAction(state, () => controller.zoomOut()),
    resetZoom: () => runFileViewerZoomControllerAction(state, () => controller.resetZoom())
  }
}
