import type { Ref } from 'vue'
import type {
  FileViewerDocumentAnchor,
  FileViewerDocumentChunk,
  FileViewerOptions,
  FileViewerSearchState
} from '@/package/common/type'
import {
  buildDocumentTextChunks,
  getCurrentDocumentAnchor,
  scrollToDocumentAnchor,
  useDocumentSearch
} from '@/package/use'

interface UseViewerDocumentFeaturesOptions {
  output: Ref<HTMLDivElement | null>;
  getOptions: () => FileViewerOptions | undefined;
  emitSearchChange: (state: FileViewerSearchState) => void;
  emitLocationChange: (anchor: FileViewerDocumentAnchor | null) => void;
}

const canPostToParent = () => typeof window !== 'undefined' && window.parent !== window

const postViewerPayload = (
  type: 'flyfish-viewer:search' | 'flyfish-viewer:location',
  event: string,
  payload: FileViewerSearchState | FileViewerDocumentAnchor | null
) => {
  if (!canPostToParent()) {
    return
  }
  window.parent.postMessage({
    type,
    event,
    payload
  }, '*')
}

const getScrollableRange = (element: HTMLElement) => {
  return Math.max(0, element.scrollHeight - element.clientHeight)
}

const isScrollableElement = (element: HTMLElement) => {
  if (typeof window === 'undefined') {
    return false
  }
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY || style.overflow
  return getScrollableRange(element) > 2 && ['auto', 'scroll', 'overlay'].includes(overflowY)
}

const cloneSearchState = (state: FileViewerSearchState): FileViewerSearchState => ({
  query: state.query,
  total: state.total,
  currentIndex: state.currentIndex,
  current: state.current ? { ...state.current } : null,
  matches: state.matches.map(match => ({ ...match }))
})

/**
 * FileViewer 的文档交互门面。
 *
 * 底层搜索、高亮、锚点收集继续放在 `src/package/use` 的通用 hooks 中；
 * 这里只负责把这些能力组合成组件对外暴露的 API，并处理 iframe 事件桥接。
 */
export const useViewerDocumentFeatures = ({
  output,
  getOptions,
  emitSearchChange,
  emitLocationChange
}: UseViewerDocumentFeaturesOptions) => {
  const getScrollContainer = () => {
    const out = output.value
    if (!out) {
      return null
    }

    const preferred = out.querySelector<HTMLElement>('[data-viewer-scroll-container], .pdf-wrapper')
    if (preferred && isScrollableElement(preferred)) {
      return preferred
    }
    if (isScrollableElement(out)) {
      return out
    }

    const scrollableChildren = Array.from(out.querySelectorAll<HTMLElement>('div, section, article, pre'))
      .filter(isScrollableElement)
      .sort((a, b) => getScrollableRange(b) - getScrollableRange(a))
    return scrollableChildren[0] || preferred || out
  }

  const documentSearch = useDocumentSearch(
    output,
    () => getOptions()?.search,
    getScrollContainer
  )

  const getSearchState = () => cloneSearchState(documentSearch.state)

  const notifySearchChange = () => {
    const state = getSearchState()
    emitSearchChange(state)
    postViewerPayload('flyfish-viewer:search', 'search-change', state)
    return state
  }

  const notifyLocationChange = () => {
    const anchor = getCurrentDocumentAnchor(output.value, documentSearch.anchors.value)
    emitLocationChange(anchor)
    postViewerPayload('flyfish-viewer:location', 'location-change', anchor)
    return anchor
  }

  const refreshDocumentIndex = async () => {
    documentSearch.observe()
    await documentSearch.refreshAnchors()
    notifyLocationChange()
    return documentSearch.anchors.value
  }

  const searchDocument = async (query: string) => {
    await documentSearch.search(query)
    return notifySearchChange()
  }

  const clearDocumentSearch = () => {
    documentSearch.clear()
    return notifySearchChange()
  }

  const clearDocumentState = () => {
    documentSearch.clear()
  }

  const nextSearchResult = () => {
    documentSearch.next()
    notifyLocationChange()
    return notifySearchChange()
  }

  const previousSearchResult = () => {
    documentSearch.previous()
    notifyLocationChange()
    return notifySearchChange()
  }

  const collectDocumentAnchors = async () => {
    await refreshDocumentIndex()
    return documentSearch.anchors.value
  }

  const scrollToAnchor = async (anchor: FileViewerDocumentAnchor | string) => {
    if (!documentSearch.anchors.value.length) {
      await refreshDocumentIndex()
    }
    const result = scrollToDocumentAnchor(output.value, anchor)
    notifyLocationChange()
    return result
  }

  const scrollToLine = async (line: number) => {
    if (!documentSearch.anchors.value.length) {
      await refreshDocumentIndex()
    }
    const result = scrollToDocumentAnchor(output.value, line)
    notifyLocationChange()
    return result
  }

  const getDocumentTextChunks = (): FileViewerDocumentChunk[] => {
    return buildDocumentTextChunks(documentSearch.anchors.value, getOptions()?.ai)
  }

  return {
    refreshDocumentIndex,
    clearDocumentState,
    getScrollContainer,
    searchDocument,
    clearDocumentSearch,
    nextSearchResult,
    previousSearchResult,
    getSearchState,
    collectDocumentAnchors,
    scrollToAnchor,
    scrollToLine,
    getDocumentTextChunks
  }
}
