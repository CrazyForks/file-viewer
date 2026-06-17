import { computed, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import {
  createFileViewerRawPostMessagePayload,
  postFileViewerMessageToParent,
  resolveFileViewerOperationAvailability,
  resolveFileViewerToolbarPosition,
  resolveVisibleFileViewerToolbar
} from '@file-viewer/core'
import type {
  FileRenderExportAdapter,
  FileViewerOperationAvailability,
  FileViewerOptions,
  FileViewerToolbarOptions,
  FileViewerToolbarPosition,
  FileViewerZoomState
} from '@/package/common/type'

interface UseViewerToolbarOptions {
  activeExportAdapter: ShallowRef<FileRenderExportAdapter | null>;
  currentBuffer: Ref<ArrayBuffer | null>;
  currentExtend: ComputedRef<string>;
  currentSourceUrl: Ref<string | null>;
  error: Ref<string>;
  getOptions: () => FileViewerOptions | undefined;
  getZoomState: () => FileViewerZoomState;
  loading: Ref<boolean>;
  normalizedToolbar: ComputedRef<FileViewerToolbarOptions>;
  renderedReady: Ref<boolean>;
  zoomState: FileViewerZoomState;
  emitOperationAvailabilityChange: (availability: FileViewerOperationAvailability) => void;
  emitZoomChange: (state: FileViewerZoomState) => void;
}

const postViewerAvailability = (availability: FileViewerOperationAvailability) => {
  postFileViewerMessageToParent(
    createFileViewerRawPostMessagePayload('flyfish-viewer:operation', 'operation-availability-change', availability)
  )
}

const postViewerZoomState = (state: FileViewerZoomState) => {
  postFileViewerMessageToParent(
    createFileViewerRawPostMessagePayload('flyfish-viewer:operation', 'zoom-change', state)
  )
}

/**
 * FileViewer 组件层的工具栏与能力状态门面。
 *
 * 按钮显隐、PDF 默认悬浮位置和能力矩阵由 `@file-viewer/core` 统一计算；
 * 这里只负责把 Vue 响应式状态、组件事件和 iframe postMessage 串起来。
 */
export const useViewerToolbar = ({
  activeExportAdapter,
  currentBuffer,
  currentExtend,
  currentSourceUrl,
  error,
  getOptions,
  getZoomState,
  loading,
  normalizedToolbar,
  renderedReady,
  zoomState,
  emitOperationAvailabilityChange,
  emitZoomChange
}: UseViewerToolbarOptions) => {
  const operationAvailability = computed<FileViewerOperationAvailability>(() => {
    return resolveFileViewerOperationAvailability({
      extension: currentExtend.value,
      hasOriginalSource: !!currentBuffer.value || !!currentSourceUrl.value,
      renderedReady: renderedReady.value,
      hasError: !!error.value,
      adapter: activeExportAdapter.value,
      zoomState
    })
  })

  const visibleToolbar = computed<FileViewerToolbarOptions>(() => {
    return resolveVisibleFileViewerToolbar(normalizedToolbar.value, operationAvailability.value)
  })

  const showToolbar = computed(() => {
    const toolbar = visibleToolbar.value
    return toolbar.download || toolbar.print || toolbar.exportHtml || toolbar.zoom
  })

  const toolbarPosition = computed<FileViewerToolbarPosition>(() => {
    return resolveFileViewerToolbarPosition(getOptions(), currentExtend.value)
  })

  const toolbarDisabled = computed(() => loading.value || !!error.value)

  const zoomButtonDisabled = (
    action: keyof Pick<FileViewerZoomState, 'canZoomIn' | 'canZoomOut' | 'canReset'>
  ) => {
    return toolbarDisabled.value || !operationAvailability.value.zoom || !zoomState[action]
  }

  watch(operationAvailability, availability => {
    const payload = { ...availability }
    emitOperationAvailabilityChange(payload)
    postViewerAvailability(payload)
  }, { immediate: true })

  watch(
    () => [
      zoomState.scale,
      zoomState.label,
      zoomState.canZoomIn,
      zoomState.canZoomOut,
      zoomState.canReset
    ] as const,
    () => {
      const state = getZoomState()
      emitZoomChange(state)
      postViewerZoomState(state)
    },
    { immediate: true }
  )

  return {
    operationAvailability,
    visibleToolbar,
    showToolbar,
    toolbarPosition,
    toolbarDisabled,
    zoomButtonDisabled
  }
}
