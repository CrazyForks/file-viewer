import axios from 'axios'
import type { Ref } from 'vue'
import {
  DEFAULT_FILE_VIEWER_SOURCE_FILENAME,
  FILE_VIEWER_PREVIEW_MESSAGES,
  createFileViewerEmptyPreviewState,
  createFileViewerStreamingPdfPlaceholderFile,
  isFileViewerAbortError,
  normalizeFileViewerSourceUrl,
  resolveFileViewerPreviewRequestReason,
  readFileViewerBuffer,
  resolveFileViewerRemoteSourcePlan,
  resolveFileViewerSourceFilename,
  wrapFileViewerFileRef
} from '@file-viewer/core'
import type { FileViewerRequestController } from '@file-viewer/core'
import type {
  FileViewerFileRef as FileRef,
  FileViewerLifecycleContext,
  FileViewerOptions
} from '@file-viewer/core'
import type { FileViewerVueRenderSession } from '../rendererBridge'

interface UseViewerSourceLoadingOptions {
  getFile: () => FileRef | undefined;
  getUrl: () => string | undefined;
  getOptions: () => FileViewerOptions | undefined;
  filename: Ref<string>;
  currentFile: Ref<File | null>;
  currentBuffer: Ref<ArrayBuffer | null>;
  currentSourceUrl: Ref<string | null>;
  renderedReady: Ref<boolean>;
  progressiveReady: Ref<boolean>;
  requestController: FileViewerRequestController;
  clearRenderedContent: (reason?: FileViewerLifecycleContext['reason']) => void;
  mountRenderedContent: (
    buffer: ArrayBuffer,
    file: File,
    version: number,
    sourceUrl?: string,
    streamUrl?: string
  ) => Promise<FileViewerVueRenderSession | undefined>;
  destroyRenderSession: (session?: FileViewerVueRenderSession | null) => void;
  setActiveRenderSession: (session: FileViewerVueRenderSession | null) => void;
  buildLifecycleContext: (input: {
    phase: FileViewerLifecycleContext['phase'];
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string;
  }) => FileViewerLifecycleContext;
  notifyLifecycle: (context: FileViewerLifecycleContext) => void;
  setActiveDocumentContext: (context: FileViewerLifecycleContext) => void;
  markLoadStarted: (version: number) => void;
  clearLoadStarted: (version: number) => void;
  startLoading: (message: string) => void;
  setLoadingMessage: (message: string) => void;
  stopLoading: () => void;
  showError: (message: string) => void;
  clearError: () => void;
  resetLoading: () => void;
  formatErrorMessage: (prefix: string, nextError: unknown) => string;
}

/**
 * FileViewer 组件层的来源加载门面。
 *
 * 请求版本、取消错误、文件包装、PDF URL 流式判断等通用能力来自
 * `@file-viewer/core`；这里只把 Vue 状态、加载态和渲染挂载回调串起来。
 */
export const useViewerSourceLoading = ({
  getFile,
  getUrl,
  getOptions,
  filename,
  currentFile,
  currentBuffer,
  currentSourceUrl,
  renderedReady,
  progressiveReady,
  requestController,
  clearRenderedContent,
  mountRenderedContent,
  destroyRenderSession,
  setActiveRenderSession,
  buildLifecycleContext,
  notifyLifecycle,
  setActiveDocumentContext,
  markLoadStarted,
  clearLoadStarted,
  startLoading,
  setLoadingMessage,
  stopLoading,
  showError,
  clearError,
  resetLoading,
  formatErrorMessage
}: UseViewerSourceLoadingOptions) => {
  const createRequestVersion = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    const version = requestController.createVersion()
    clearRenderedContent(reason)
    currentFile.value = null
    currentBuffer.value = null
    currentSourceUrl.value = null
    progressiveReady.value = false
    clearError()
    return version
  }

  const isCurrentRequest = (version: number) => {
    return requestController.isCurrent(version)
  }

  const finishLoading = (version: number) => {
    if (isCurrentRequest(version)) {
      stopLoading()
    }
  }

  const readAndRenderFile = async (
    file: File,
    version: number,
    sourceUrl?: string,
    source: FileViewerLifecycleContext['source'] = sourceUrl ? 'url' : 'file'
  ) => {
    filename.value = resolveFileViewerSourceFilename({ file, fallback: '' })
    const arrayBuffer = await readFileViewerBuffer(file)
    if (!isCurrentRequest(version)) {
      return
    }
    currentFile.value = file
    currentBuffer.value = arrayBuffer
    currentSourceUrl.value = normalizeFileViewerSourceUrl(sourceUrl)

    const session = await mountRenderedContent(arrayBuffer, file, version, sourceUrl)
    if (!isCurrentRequest(version)) {
      destroyRenderSession(session)
      return
    }
    setActiveRenderSession(session || null)
    renderedReady.value = true
    const context = buildLifecycleContext({
      phase: 'load-complete',
      version,
      source,
      file,
      sourceUrl
    })
    setActiveDocumentContext(context)
    notifyLifecycle(context)
    clearLoadStarted(version)
  }

  const previewRemotePdfStream = async (url: string, version: number, nextFilename: string) => {
    startLoading(FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf)

    try {
      const placeholderFile = createFileViewerStreamingPdfPlaceholderFile(nextFilename)
      currentSourceUrl.value = url
      const session = await mountRenderedContent(new ArrayBuffer(0), placeholderFile, version, url, url)
      if (!isCurrentRequest(version)) {
        destroyRenderSession(session)
        return
      }
      setActiveRenderSession(session || null)
      renderedReady.value = true
      const context = buildLifecycleContext({
        phase: 'load-complete',
        version,
        source: 'url',
        sourceUrl: url
      })
      setActiveDocumentContext(context)
      notifyLifecycle(context)
      clearLoadStarted(version)
    } catch (nextError) {
      if (!isCurrentRequest(version)) {
        return
      }
      console.error(nextError)
      showError(formatErrorMessage('加载 PDF 流式预览异常', nextError))
    } finally {
      clearLoadStarted(version)
      finishLoading(version)
    }
  }

  const previewLocalFile = async (source: FileRef, version: number) => {
    const file = wrapFileViewerFileRef(source, filename.value || DEFAULT_FILE_VIEWER_SOURCE_FILENAME)
    filename.value = resolveFileViewerSourceFilename({ file, fallback: DEFAULT_FILE_VIEWER_SOURCE_FILENAME })
    markLoadStarted(version)
    notifyLifecycle(buildLifecycleContext({
      phase: 'load-start',
      version,
      source: 'file',
      file
    }))
    startLoading(FILE_VIEWER_PREVIEW_MESSAGES.reading)

    try {
      await readAndRenderFile(file, version, undefined, 'file')
    } catch (nextError) {
      if (!isCurrentRequest(version)) {
        return
      }
      console.error(nextError)
      showError(formatErrorMessage('读取文件异常', nextError))
    } finally {
      clearLoadStarted(version)
      finishLoading(version)
    }
  }

  const previewRemoteFile = async (url: string, version: number) => {
    const remoteSource = resolveFileViewerRemoteSourcePlan({
      pageHref: typeof window === 'undefined' ? undefined : window.location.href,
      streaming: getOptions()?.pdf?.streaming,
      url
    })
    const nextFilename = remoteSource.filename
    filename.value = nextFilename
    markLoadStarted(version)
    notifyLifecycle(buildLifecycleContext({
      phase: 'load-start',
      version,
      source: 'url',
      sourceUrl: url
    }))
    startLoading(FILE_VIEWER_PREVIEW_MESSAGES.downloading)

    if (remoteSource.streamPdf) {
      await previewRemotePdfStream(url, version, nextFilename)
      return
    }

    const controller = requestController.createAbortController()

    try {
      const { data } = await axios({
        url,
        method: 'get',
        responseType: 'blob',
        signal: controller?.signal
      })

      if (!isCurrentRequest(version)) {
        return
      }

      if (!data) {
        showError('文件下载失败')
        return
      }

      setLoadingMessage(FILE_VIEWER_PREVIEW_MESSAGES.reading)
      await readAndRenderFile(wrapFileViewerFileRef(data, nextFilename), version, url, 'url')
    } catch (nextError) {
      if (!isCurrentRequest(version) || isFileViewerAbortError(nextError)) {
        return
      }
      console.error(nextError)
      showError(formatErrorMessage('加载文件异常', nextError))
    } finally {
      requestController.clearAbortController(controller)
      clearLoadStarted(version)
      finishLoading(version)
    }
  }

  const resetViewer = () => {
    const emptyState = createFileViewerEmptyPreviewState()
    filename.value = emptyState.filename
    currentFile.value = emptyState.file
    currentBuffer.value = emptyState.buffer
    currentSourceUrl.value = emptyState.sourceUrl
    renderedReady.value = emptyState.renderedReady
    progressiveReady.value = emptyState.progressiveReady
    clearRenderedContent()
    resetLoading()
  }

  const refreshPreview = async () => {
    const file = getFile()
    const url = getUrl()
    const version = createRequestVersion(resolveFileViewerPreviewRequestReason({ file, url }))

    if (file) {
      await previewLocalFile(file, version)
      return
    }

    if (url) {
      await previewRemoteFile(url, version)
      return
    }

    resetViewer()
  }

  const cancelPreview = (reason: FileViewerLifecycleContext['reason'] = 'component-unmount') => {
    createRequestVersion(reason)
  }

  return {
    cancelPreview,
    isCurrentRequest,
    refreshPreview,
    resetViewer
  }
}
