import type { Ref } from 'vue'
import type {
  FileViewerDocumentAnchor,
  FileViewerDocumentFeatureActions,
  FileViewerOptions,
  FileViewerSearchState
} from '@file-viewer/core'
import {
  createFileViewerDocumentFeatureActions
} from '@file-viewer/core'
import { useDocumentSearch } from './useDocumentSearch'

interface UseViewerDocumentFeaturesOptions {
  output: Ref<HTMLDivElement | null>;
  getOptions: () => FileViewerOptions | undefined;
  emitSearchChange: (state: FileViewerSearchState) => void;
  emitLocationChange: (anchor: FileViewerDocumentAnchor | null) => void;
}

/**
 * FileViewer 的文档交互门面。
 *
 * 底层锚点、滚动和文本切片由 core 负责，Vue 侧只保留搜索响应式 hook；
 * 这里负责把这些能力组合成组件对外暴露的 API，并处理 iframe 事件桥接。
 */
export const useViewerDocumentFeatures = ({
  output,
  getOptions,
  emitSearchChange,
  emitLocationChange
}: UseViewerDocumentFeaturesOptions) => {
  let documentActions: FileViewerDocumentFeatureActions | null = null

  const getScrollContainer = () => {
    return documentActions?.getScrollContainer() ?? null
  }

  const documentSearch = useDocumentSearch(
    output,
    () => getOptions()?.search,
    getScrollContainer
  )

  documentActions = createFileViewerDocumentFeatureActions({
    root: () => output.value,
    searchController: {
      getAnchors: () => documentSearch.anchors.value,
      getSearchState: () => documentSearch.state,
      observe: documentSearch.observe,
      refreshAnchors: documentSearch.refreshAnchors,
      search: documentSearch.search,
      clear: documentSearch.clear,
      next: documentSearch.next,
      previous: documentSearch.previous
    },
    getAiOptions: () => getOptions()?.ai,
    onSearchChange: emitSearchChange,
    onLocationChange: emitLocationChange
  })

  return {
    refreshDocumentIndex: documentActions.refreshDocumentIndex,
    clearDocumentState: documentActions.clearDocumentState,
    getScrollContainer,
    searchDocument: documentActions.searchDocument,
    clearDocumentSearch: documentActions.clearDocumentSearch,
    nextSearchResult: documentActions.nextSearchResult,
    previousSearchResult: documentActions.previousSearchResult,
    getSearchState: documentActions.getSearchState,
    collectDocumentAnchors: documentActions.collectDocumentAnchors,
    scrollToAnchor: documentActions.scrollToAnchor,
    scrollToLine: documentActions.scrollToLine,
    getDocumentTextChunks: documentActions.getDocumentTextChunks
  }
}
