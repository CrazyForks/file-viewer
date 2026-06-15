import type { Ref } from 'vue'
import type { FileViewerOperationType, FileViewerZoomState } from '@/package/common/type'
import { useViewerZoom as useBaseViewerZoom } from '@/package/use/viewerZoom'

interface UseFileViewerZoomOptions {
  output: Ref<HTMLDivElement | null>;
  enabled: () => boolean;
  runBeforeOperation: (operation: FileViewerOperationType) => Promise<boolean>;
}

/**
 * FileViewer 组件层的缩放门面。
 *
 * 通用 provider 协议放在 `src/package/use` 里供各渲染器注册；
 * 这里只负责把缩放按钮接入现有操作前置钩子和组件 ref API。
 */
export const useViewerZoom = ({
  output,
  enabled,
  runBeforeOperation
}: UseFileViewerZoomOptions) => {
  const zoom = useBaseViewerZoom({
    root: output,
    enabled,
    beforeZoom: operation => runBeforeOperation(operation)
  })

  const cloneZoomState = (): FileViewerZoomState => ({
    scale: zoom.zoomState.scale,
    label: zoom.zoomState.label,
    canZoomIn: zoom.zoomState.canZoomIn,
    canZoomOut: zoom.zoomState.canZoomOut,
    canReset: zoom.zoomState.canReset,
    minScale: zoom.zoomState.minScale,
    maxScale: zoom.zoomState.maxScale
  })

  return {
    ...zoom,
    getZoomState: cloneZoomState
  }
}
