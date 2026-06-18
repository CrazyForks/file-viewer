import axios from 'axios'
import type { Ref } from 'vue'
import {
  FILE_VIEWER_PREVIEW_MESSAGES,
  applyFileViewerPreviewSourceUrlState,
  applyFileViewerReadPreviewState,
  commitFileViewerEmptyPreviewResetState,
  commitFileViewerLoadStartState,
  commitFileViewerPreviewRequestStartState,
  commitFileViewerRenderCompleteState,
  commitFileViewerRemoteDownloadState,
  createFileViewerReadPreviewState,
  createFileViewerStreamingPdfPlaceholderFile,
  finalizeFileViewerPreviewLoadState,
  isFileViewerAbortError,
  resolveFileViewerFileRefSourcePlan,
  resolveFileViewerPreviewRequestReason,
  readFileViewerBuffer,
  resolveFileViewerRemoteSourcePlan,
  resolveFileViewerRuntimePageHref,
} from '@file-viewer/core'
import type { FileViewerRequestController } from '@file-viewer/core'
import type {
  FileViewerFileRef as FileRef,
  FileViewerLifecycleContext,
  FileViewerLoadStartState,
  FileViewerOptions,
  FileViewerRenderCompleteState
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
  buildLoadStartState: (input: {
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerLoadStartState;
  buildRenderCompleteState: (input: {
    version: number;
    source: FileViewerLifecycleContext['source'];
    file?: File | null;
    sourceUrl?: string | null;
  }) => FileViewerRenderCompleteState;
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
  buildLoadStartState,
  buildRenderCompleteState,
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
  const previewStateTarget = {
    get filename(): string {
      return filename.value
    },
    set filename(value: string) {
      filename.value = value
    },
    get file(): File | null {
      return currentFile.value
    },
    set file(value: File | null) {
      currentFile.value = value
    },
    get buffer(): ArrayBuffer | null {
      return currentBuffer.value
    },
    set buffer(value: ArrayBuffer | null) {
      currentBuffer.value = value
    },
    get sourceUrl(): string | null {
      return currentSourceUrl.value
    },
    set sourceUrl(value: string | null) {
      currentSourceUrl.value = value
    },
    get renderedReady(): boolean {
      return renderedReady.value
    },
    set renderedReady(value: boolean) {
      renderedReady.value = value
    },
    get progressiveReady(): boolean {
      return progressiveReady.value
    },
    set progressiveReady(value: boolean) {
      progressiveReady.value = value
    }
  }

  const createRequestVersion = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
    return commitFileViewerPreviewRequestStartState({
      reason,
      requestController,
      previewTarget: previewStateTarget,
      onClearRenderedContent: clearRenderedContent,
      onClearError: clearError
    })
  }

  const isCurrentRequest = (version: number) => {
    return requestController.isCurrent(version)
  }

  const readAndRenderFile = async (
    file: File,
    version: number,
    sourceUrl?: string,
    source: FileViewerLifecycleContext['source'] = sourceUrl ? 'url' : 'file'
  ) => {
    const arrayBuffer = await readFileViewerBuffer(file)
    if (!isCurrentRequest(version)) {
      return
    }
    applyFileViewerReadPreviewState(previewStateTarget, createFileViewerReadPreviewState({
      file,
      buffer: arrayBuffer,
      sourceUrl,
      fallbackFilename: ''
    }))

    const session = await mountRenderedContent(arrayBuffer, file, version, sourceUrl)
    if (!isCurrentRequest(version)) {
      destroyRenderSession(session)
      return
    }
    commitFileViewerRenderCompleteState({
      version,
      session,
      readinessTarget: previewStateTarget,
      buildState: () => buildRenderCompleteState({
        version,
        source,
        file,
        sourceUrl
      }),
      onSession: setActiveRenderSession,
      onActiveDocumentContext: setActiveDocumentContext,
      onLifecycle: notifyLifecycle,
      onClearLoadStarted: clearLoadStarted
    })
  }

  const previewRemotePdfStream = async (url: string, version: number, nextFilename: string) => {
    startLoading(FILE_VIEWER_PREVIEW_MESSAGES.streamingPdf)

    try {
      const placeholderFile = createFileViewerStreamingPdfPlaceholderFile(nextFilename)
      applyFileViewerPreviewSourceUrlState(previewStateTarget, url)
      const session = await mountRenderedContent(new ArrayBuffer(0), placeholderFile, version, url, url)
      if (!isCurrentRequest(version)) {
        destroyRenderSession(session)
        return
      }
      commitFileViewerRenderCompleteState({
        version,
        session,
        readinessTarget: previewStateTarget,
        buildState: () => buildRenderCompleteState({
          version,
          source: 'url',
          sourceUrl: url
        }),
        onSession: setActiveRenderSession,
        onActiveDocumentContext: setActiveDocumentContext,
        onLifecycle: notifyLifecycle,
        onClearLoadStarted: clearLoadStarted
      })
    } catch (nextError) {
      if (!isCurrentRequest(version)) {
        return
      }
      console.error(nextError)
      showError(formatErrorMessage('加载 PDF 流式预览异常', nextError))
    } finally {
      finalizeFileViewerPreviewLoadState({
        version,
        isCurrent: isCurrentRequest,
        onClearLoadStarted: clearLoadStarted,
        onStopLoading: stopLoading
      })
    }
  }

  const previewLocalFile = async (source: FileRef, version: number) => {
    const localSource = resolveFileViewerFileRefSourcePlan({
      source,
      currentFilename: filename.value
    })
    const { file } = localSource
    commitFileViewerLoadStartState({
      version,
      filename: localSource.filename,
      filenameTarget: previewStateTarget,
      buildState: () => buildLoadStartState({
        version,
        source: 'file',
        file
      }),
      onMarkLoadStarted: markLoadStarted,
      onLifecycle: notifyLifecycle,
      onStartLoading: startLoading
    })

    try {
      await readAndRenderFile(file, version, undefined, 'file')
    } catch (nextError) {
      if (!isCurrentRequest(version)) {
        return
      }
      console.error(nextError)
      showError(formatErrorMessage('读取文件异常', nextError))
    } finally {
      finalizeFileViewerPreviewLoadState({
        version,
        isCurrent: isCurrentRequest,
        onClearLoadStarted: clearLoadStarted,
        onStopLoading: stopLoading
      })
    }
  }

  const previewRemoteFile = async (url: string, version: number) => {
    const remoteSource = resolveFileViewerRemoteSourcePlan({
      pageHref: resolveFileViewerRuntimePageHref(),
      streaming: getOptions()?.pdf?.streaming,
      url
    })
    const nextFilename = remoteSource.filename
    commitFileViewerLoadStartState({
      version,
      filename: nextFilename,
      filenameTarget: previewStateTarget,
      buildState: () => buildLoadStartState({
        version,
        source: 'url',
        sourceUrl: url
      }),
      onMarkLoadStarted: markLoadStarted,
      onLifecycle: notifyLifecycle,
      onStartLoading: startLoading
    })

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

      const downloadState = commitFileViewerRemoteDownloadState({
        version,
        data,
        currentFilename: nextFilename,
        isCurrent: isCurrentRequest,
        onMissingData: () => showError('文件下载失败'),
        onSetLoadingMessage: setLoadingMessage
      })
      if (downloadState.stale || downloadState.missing) {
        return
      }

      await readAndRenderFile(downloadState.source.file, version, url, 'url')
    } catch (nextError) {
      if (!isCurrentRequest(version) || isFileViewerAbortError(nextError)) {
        return
      }
      console.error(nextError)
      showError(formatErrorMessage('加载文件异常', nextError))
    } finally {
      requestController.clearAbortController(controller)
      finalizeFileViewerPreviewLoadState({
        version,
        isCurrent: isCurrentRequest,
        onClearLoadStarted: clearLoadStarted,
        onStopLoading: stopLoading
      })
    }
  }

  const resetViewer = () => {
    commitFileViewerEmptyPreviewResetState({
      previewTarget: previewStateTarget,
      onClearRenderedContent: clearRenderedContent,
      onResetLoading: resetLoading
    })
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
