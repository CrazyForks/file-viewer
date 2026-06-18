import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  FILE_VIEWER_PREVIEW_MESSAGES,
  createFileViewerLoadStartState,
  createFileViewerRenderCompleteState,
  createFileViewerRequestController
} from '../packages/core/src'
import { useViewerSourceLoading } from '../src/package/components/FileViewer/hooks/useViewerSourceLoading'
import type { FileViewerLifecycleContext } from '../src/package/common/type'

describe('Vue FileViewer source loading hook', () => {
  it('keeps local file loading state and lifecycle events aligned with the legacy component flow', async () => {
    const file = new File(['hello file viewer'], 'hello.txt', { type: 'text/plain' })
    const filename = ref('')
    const currentFile = ref<File | null>(null)
    const currentBuffer = ref<ArrayBuffer | null>(null)
    const currentSourceUrl = ref<string | null>(null)
    const renderedReady = ref(false)
    const progressiveReady = ref(true)
    const lifecycleEvents: FileViewerLifecycleContext[] = []
    const renderSession = { destroy: vi.fn() }
    const clearRenderedContent = vi.fn()
    const mountRenderedContent = vi.fn(async () => renderSession)
    const setActiveRenderSession = vi.fn()
    const startLoading = vi.fn()
    const stopLoading = vi.fn()

    const startedAt = new Map<number, number>()
    const sourceLoading = useViewerSourceLoading({
      getFile: () => file,
      getUrl: () => undefined,
      getOptions: () => undefined,
      filename,
      currentFile,
      currentBuffer,
      currentSourceUrl,
      renderedReady,
      progressiveReady,
      requestController: createFileViewerRequestController(),
      clearRenderedContent,
      mountRenderedContent,
      destroyRenderSession: vi.fn(),
      setActiveRenderSession,
      buildLoadStartState: input => createFileViewerLoadStartState({
        ...input,
        filename: filename.value,
        bufferSize: currentBuffer.value?.byteLength,
        loadingMessage: input.source === 'url'
          ? FILE_VIEWER_PREVIEW_MESSAGES.downloading
          : FILE_VIEWER_PREVIEW_MESSAGES.reading
      }),
      buildRenderCompleteState: input => createFileViewerRenderCompleteState({
        ...input,
        filename: filename.value,
        bufferSize: currentBuffer.value?.byteLength,
        startedAt: startedAt.get(input.version)
      }),
      notifyLifecycle: context => {
        lifecycleEvents.push(context)
      },
      setActiveDocumentContext: vi.fn(),
      markLoadStarted: version => {
        startedAt.set(version, Date.now())
      },
      clearLoadStarted: version => {
        startedAt.delete(version)
      },
      startLoading,
      setLoadingMessage: vi.fn(),
      stopLoading,
      showError: vi.fn(),
      clearError: vi.fn(),
      resetLoading: vi.fn(),
      formatErrorMessage: (prefix, nextError) => `${prefix}: ${String(nextError)}`
    })

    await sourceLoading.refreshPreview()

    expect(clearRenderedContent).toHaveBeenCalledWith('replace')
    expect(startLoading).toHaveBeenCalledWith(FILE_VIEWER_PREVIEW_MESSAGES.reading)
    expect(stopLoading).toHaveBeenCalledTimes(1)
    expect(filename.value).toBe('hello.txt')
    expect(currentFile.value).toBe(file)
    expect(currentSourceUrl.value).toBeNull()
    expect(currentBuffer.value?.byteLength).toBe(file.size)
    expect(renderedReady.value).toBe(true)
    expect(progressiveReady.value).toBe(false)
    expect(mountRenderedContent).toHaveBeenCalledWith(
      currentBuffer.value,
      file,
      1,
      undefined
    )
    expect(setActiveRenderSession).toHaveBeenCalledWith(renderSession)
    expect(lifecycleEvents.map(item => item.phase)).toEqual(['load-start', 'load-complete'])
    expect(lifecycleEvents[1]).toMatchObject({
      filename: 'hello.txt',
      source: 'file',
      size: file.size
    })
  })
})
