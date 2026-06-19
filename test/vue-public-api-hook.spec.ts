import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { useViewerPublicApi } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerPublicApi'
import type {
  FileViewerOperationAvailability,
  FileViewerSearchState,
  FileViewerZoomState
} from '../packages/components/vue3/src/package/common/type'

const createAvailability = (): FileViewerOperationAvailability => ({
  download: true,
  print: true,
  exportHtml: false,
  zoom: true,
  zoomIn: true,
  zoomOut: false,
  zoomReset: true
})

const createSearchState = (query = ''): FileViewerSearchState => ({
  query,
  total: query ? 1 : 0,
  currentIndex: query ? 0 : -1,
  current: null,
  matches: []
})

const createZoomState = (): FileViewerZoomState => ({
  scale: 1,
  label: '100%',
  canZoomIn: true,
  canZoomOut: false,
  canReset: false
})

describe('Vue FileViewer public api hook', () => {
  it('exposes a stable api surface and clones operation availability snapshots', async () => {
    const availability = ref(createAvailability())
    const calls: string[] = []
    const api = useViewerPublicApi({
      operationAvailability: computed(() => availability.value),
      downloadOriginalFile: async () => { calls.push('download') },
      printRenderedHtml: async () => { calls.push('print') },
      exportRenderedHtml: async () => { calls.push('export-html') },
      zoomIn: async () => createZoomState(),
      zoomOut: async () => createZoomState(),
      resetZoom: async () => createZoomState(),
      getZoomState: createZoomState,
      getScrollContainer: () => null,
      searchDocument: async query => createSearchState(query),
      clearDocumentSearch: async () => createSearchState(),
      nextSearchResult: async () => createSearchState('next'),
      previousSearchResult: async () => createSearchState('previous'),
      getSearchState: () => createSearchState('current'),
      collectDocumentAnchors: async () => [],
      scrollToAnchor: async () => true,
      scrollToLine: async () => true,
      getDocumentTextChunks: () => []
    })

    expect(Object.keys(api).sort()).toEqual([
      'clearDocumentSearch',
      'collectDocumentAnchors',
      'downloadOriginalFile',
      'exportRenderedHtml',
      'getDocumentTextChunks',
      'getOperationAvailability',
      'getScrollContainer',
      'getSearchState',
      'getZoomState',
      'nextSearchResult',
      'previousSearchResult',
      'printRenderedHtml',
      'resetZoom',
      'scrollToAnchor',
      'scrollToLine',
      'searchDocument',
      'zoomIn',
      'zoomOut'
    ])

    const snapshot = api.getOperationAvailability()
    snapshot.download = false
    expect(api.getOperationAvailability().download).toBe(true)

    availability.value = {
      ...availability.value,
      print: false
    }
    expect(api.getOperationAvailability().print).toBe(false)

    await api.downloadOriginalFile()
    await api.printRenderedHtml()
    await api.exportRenderedHtml()
    expect(calls).toEqual(['download', 'print', 'export-html'])
    await expect(api.searchDocument('pdf')).resolves.toMatchObject({ query: 'pdf', total: 1 })
  })
})
