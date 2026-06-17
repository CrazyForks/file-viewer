import { nextTick, onBeforeUnmount, reactive, shallowRef, type Ref } from 'vue'
import {
  cloneFileViewerSearchState,
  createEmptyFileViewerSearchState,
  createFileViewerDomSearchController
} from '@file-viewer/core'
export {
  registerFileViewerSearchProvider,
  unregisterFileViewerSearchProvider
} from '@file-viewer/core'
import type {
  FileViewerDocumentAnchor,
  FileViewerSearchOptions,
  FileViewerSearchState
} from '@/package/common/type'

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
