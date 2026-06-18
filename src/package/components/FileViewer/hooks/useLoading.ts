import { computed, reactive, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  createFileViewerLoadingController,
  runFileViewerLoadingControllerAction,
  runFileViewerLoadingExtensionSync,
  resolveFileViewerLoadingTheme,
  syncFileViewerLoadingControllerState,
  type FileViewerLoadingRuntimeState,
  type FileViewerStateTheme
} from '@file-viewer/core'

export type LoadingTheme = FileViewerStateTheme

export const resolveLoadingTheme = resolveFileViewerLoadingTheme

/**
 * FileViewer loading 响应式门面。
 *
 * 真实 loading 状态机和主题矩阵在 `@file-viewer/core` 中维护，
 * 这里仅把纯 TS controller 的快照同步成组件需要的 Vue ref/computed 形态。
 */
export const useLoading = (extendSource: MaybeRefOrGetter<string>) => {
  const controller = createFileViewerLoadingController(toValue(extendSource))
  const state = reactive<FileViewerLoadingRuntimeState>(controller.getState())

  watch(
    () => toValue(extendSource),
    nextExtend => {
      runFileViewerLoadingExtensionSync({
        target: state,
        controller,
        extension: nextExtend
      })
    }
  )

  return {
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    message: computed(() => state.message),
    theme: computed(() => state.theme),
    styleVars: computed(() => state.styleVars),
    startLoading: (nextMessage: string) => runFileViewerLoadingControllerAction(
      state,
      () => controller.startLoading(nextMessage)
    ),
    setLoadingMessage: (nextMessage: string) => runFileViewerLoadingControllerAction(
      state,
      () => controller.setLoadingMessage(nextMessage)
    ),
    stopLoading: () => runFileViewerLoadingControllerAction(state, () => controller.stopLoading()),
    showError: (nextMessage: string) => runFileViewerLoadingControllerAction(
      state,
      () => controller.showError(nextMessage)
    ),
    clearError: () => runFileViewerLoadingControllerAction(state, () => controller.clearError()),
    resetLoading: () => runFileViewerLoadingControllerAction(state, () => controller.resetLoading()),
    syncLoadingState: () => syncFileViewerLoadingControllerState(state, controller)
  }
}
