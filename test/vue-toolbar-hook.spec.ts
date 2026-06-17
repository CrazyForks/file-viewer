import { computed, effectScope, nextTick, reactive, ref, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useViewerToolbar } from '../src/package/components/FileViewer/hooks/useViewerToolbar'
import type {
  FileViewerOperationAvailability,
  FileViewerToolbarOptions,
  FileViewerZoomState
} from '../src/package/common/type'

describe('Vue FileViewer toolbar hook', () => {
  it('keeps toolbar visibility, PDF floating position and emitted capability states in one facade', async () => {
    const activeExportAdapter = shallowRef(null)
    const currentBuffer = ref(new ArrayBuffer(8))
    const currentExtend = computed(() => 'pdf')
    const currentSourceUrl = ref<string | null>(null)
    const error = ref('')
    const loading = ref(false)
    const renderedReady = ref(true)
    const normalizedToolbar = computed<FileViewerToolbarOptions>(() => ({
      download: true,
      print: true,
      exportHtml: true,
      zoom: true
    }))
    const zoomState = reactive<FileViewerZoomState>({
      scale: 1,
      label: '100%',
      canZoomIn: true,
      canZoomOut: false,
      canReset: false,
      minScale: 0.25,
      maxScale: 4
    })
    const availabilityEvents: FileViewerOperationAvailability[] = []
    const zoomEvents: FileViewerZoomState[] = []
    const scope = effectScope()

    const toolbar = scope.run(() => useViewerToolbar({
      activeExportAdapter,
      currentBuffer,
      currentExtend,
      currentSourceUrl,
      error,
      getOptions: () => undefined,
      getZoomState: () => ({ ...zoomState }),
      loading,
      normalizedToolbar,
      renderedReady,
      zoomState,
      emitOperationAvailabilityChange: availability => {
        availabilityEvents.push(availability)
      },
      emitZoomChange: state => {
        zoomEvents.push(state)
      }
    }))

    expect(toolbar).toBeTruthy()
    expect(toolbar?.operationAvailability.value).toMatchObject({
      download: true,
      print: false,
      exportHtml: true,
      zoom: true,
      zoomIn: true,
      zoomOut: false
    })
    expect(toolbar?.visibleToolbar.value).toMatchObject({
      download: true,
      print: false,
      exportHtml: true,
      zoom: true
    })
    expect(toolbar?.showToolbar.value).toBe(true)
    expect(toolbar?.toolbarPosition.value).toBe('bottom-right')
    expect(toolbar?.zoomButtonDisabled('canZoomIn')).toBe(false)
    expect(toolbar?.zoomButtonDisabled('canZoomOut')).toBe(true)
    expect(availabilityEvents[0]).toMatchObject(toolbar?.operationAvailability.value || {})
    expect(zoomEvents[0]).toMatchObject({ label: '100%' })

    error.value = 'render failed'
    await nextTick()

    expect(toolbar?.toolbarDisabled.value).toBe(true)
    expect(availabilityEvents.at(-1)).toMatchObject({
      download: true,
      print: false,
      exportHtml: false,
      zoom: false
    })

    scope.stop()
  })
})
