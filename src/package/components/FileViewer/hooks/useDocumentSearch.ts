import { nextTick, onBeforeUnmount, reactive, shallowRef, type Ref } from 'vue'
import {
  cloneFileViewerSearchState,
  createEmptyFileViewerSearchState,
  createFileViewerDomSearchController,
  type FileViewerDocumentAnchor,
  type FileViewerSearchOptions,
  type FileViewerSearchState
} from '@file-viewer/core'

const applySearchState = (
  target: FileViewerSearchState,
  source: FileViewerSearchState
) => {
  const nextState = cloneFileViewerSearchState(source)
  target.query = nextState.query
  target.total = nextState.total
  target.currentIndex = nextState.currentIndex
  target.current = nextState.current
  target.matches = nextState.matches
}

/**
 * FileViewer 组件内的文档搜索响应式门面。
 *
 * DOM 锚点采集、搜索高亮、命中滚动和 MutationObserver 调度均由 core controller 负责，
 * 这里仅把纯 TS 快照同步为 Vue 响应式状态并绑定组件卸载生命周期。
 */
export const useDocumentSearch = (
  root: Ref<HTMLElement | null>,
  optionsSource?: () => boolean | FileViewerSearchOptions | undefined,
  scrollContainerSource?: () => HTMLElement | null | undefined
) => {
  const anchors = shallowRef<FileViewerDocumentAnchor[]>([])
  const state = reactive<FileViewerSearchState>(createEmptyFileViewerSearchState())
  const controller = createFileViewerDomSearchController({
    root: () => root.value,
    options: optionsSource,
    waitForDomUpdate: () => nextTick(),
    preferredScrollContainer: scrollContainerSource
  })

  const syncFromController = () => {
    anchors.value = controller.anchors
    applySearchState(state, controller.state)
    return state
  }

  const observe = () => {
    controller.observe()
    syncFromController()
  }

  const refreshAnchors = async () => {
    await controller.refreshAnchors()
    syncFromController()
    return anchors.value
  }

  const search = async (query: string) => {
    await controller.search(query)
    return syncFromController()
  }

  const next = async () => {
    await controller.next()
    return syncFromController()
  }

  const previous = async () => {
    await controller.previous()
    return syncFromController()
  }

  const clear = async () => {
    await controller.clear()
    return syncFromController()
  }

  onBeforeUnmount(() => {
    controller.destroy()
    syncFromController()
  })

  return {
    anchors,
    state,
    observe,
    refreshAnchors,
    search,
    next,
    previous,
    clear
  }
}
