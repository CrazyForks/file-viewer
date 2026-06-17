import {
  DEFAULT_FILE_VIEWER_PUBLIC_DIR,
  DEFAULT_FILE_VIEWER_URL,
  buildFileViewerFrameSrc,
  canUseFileViewerDom,
  createFileViewerFrameFilePostController,
  getFileViewerCurrentOrigin,
  getFileViewerFrameOrigin,
  getFileViewerFrameSourceFilename,
  getFileViewerFrameUrl,
  isFileViewerFrameEvent,
  postFileToFileViewerFrame,
  toFileViewerFrameMessageBlob
} from '@file-viewer/core'
import type {
  FileViewerFileRef,
  FileViewerAiOptions,
  FileViewerArchiveOptions,
  FileViewerFrameEventHandler,
  FileViewerFrameEventPayload,
  FileViewerFrameOptions,
  FileViewerFrameParamValue,
  FileViewerPdfOptions,
  FileViewerPostMessageType,
  FileViewerSearchOptions,
  FileViewerSerializableOptions,
  FileViewerSerializableToolbarOptions,
  FileViewerThemeMode,
  FileViewerToolbarPosition,
  FileViewerWatermarkOptions
} from '@file-viewer/core'

export type FileRef = FileViewerFileRef

export type ViewerFrameParamValue = FileViewerFrameParamValue

export type ViewerWatermarkOptions = FileViewerWatermarkOptions
export type ViewerToolbarPosition = FileViewerToolbarPosition
export type ViewerToolbarOptions = FileViewerSerializableToolbarOptions
export type ViewerArchiveOptions = FileViewerArchiveOptions
export type ViewerPdfOptions = FileViewerPdfOptions
export type ViewerSearchOptions = FileViewerSearchOptions
export type ViewerAiOptions = FileViewerAiOptions
export type ViewerThemeMode = FileViewerThemeMode
export type ViewerRuntimeOptions = FileViewerSerializableOptions

export type ViewerFrameEventType = FileViewerPostMessageType
export type ViewerFrameEventPayload = FileViewerFrameEventPayload<Record<string, unknown> | null>
export type ViewerFrameEventHandler = FileViewerFrameEventHandler<Record<string, unknown> | null>

export interface ViewerFrameOptions extends FileViewerFrameOptions {}

export interface CreateViewerFrameOptions extends ViewerFrameOptions {
  autoPostFile?: boolean
  className?: string
  style?: Partial<CSSStyleDeclaration>
  title?: string
}

export interface ViewerFrameController {
  readonly frame: HTMLIFrameElement
  readonly src: string
  destroy(): void
  postFile(): boolean
  reload(): void
  update(options: ViewerFrameOptions): string
}

export const DEFAULT_VIEWER_PUBLIC_DIR = DEFAULT_FILE_VIEWER_PUBLIC_DIR
export const DEFAULT_VIEWER_URL = DEFAULT_FILE_VIEWER_URL
export const VIEWER_FRAME_CACHE_KEY = '1.0.23'
const DEFAULT_FRAME_TITLE = 'Flyfish Viewer 文件预览'

const canUseDom = canUseFileViewerDom

export const isViewerFrameEvent = (value: unknown): value is ViewerFrameEventPayload => {
  return isFileViewerFrameEvent(value)
}

export const getCurrentOrigin = getFileViewerCurrentOrigin

export const getViewerUrl = (viewerUrl?: string) => getFileViewerFrameUrl(viewerUrl, DEFAULT_VIEWER_URL)

export const getViewerOrigin = (viewerUrl?: string) => {
  return getFileViewerFrameOrigin(viewerUrl, DEFAULT_VIEWER_URL)
}

export const getSourceFilename = getFileViewerFrameSourceFilename

export const buildViewerSrc = (options: ViewerFrameOptions = {}) => {
  return buildFileViewerFrameSrc({
    ...options,
    defaultViewerUrl: DEFAULT_VIEWER_URL,
    defaultCacheKey: VIEWER_FRAME_CACHE_KEY
  })
}

export const toMessageBlob = toFileViewerFrameMessageBlob

export const postFileToViewer = (
  frame: HTMLIFrameElement | null | undefined,
  options: ViewerFrameOptions
) => {
  return postFileToFileViewerFrame(frame, options)
}

export const syncViewerFrame = (
  frame: HTMLIFrameElement | null | undefined,
  options: ViewerFrameOptions
) => {
  if (!frame || !canUseDom()) {
    return ''
  }
  const nextSrc = buildViewerSrc(options)
  if (frame.getAttribute('src') !== nextSrc) {
    frame.setAttribute('src', nextSrc)
  }
  return nextSrc
}

export const createViewerFrame = (options: CreateViewerFrameOptions = {}) => {
  if (!canUseDom()) {
    throw new Error('createViewerFrame 只能在浏览器环境中使用')
  }

  const frame = document.createElement('iframe')
  frame.setAttribute('src', buildViewerSrc(options))
  frame.title = options.title || DEFAULT_FRAME_TITLE
  frame.style.width = '100%'
  frame.style.height = '100%'
  frame.style.border = '0'
  frame.style.display = 'block'

  if (options.className) {
    frame.className = options.className
  }
  if (options.style) {
    Object.assign(frame.style, options.style)
  }

  if (options.autoPostFile !== false) {
    frame.addEventListener('load', () => {
      postFileToViewer(frame, options)
    })
  }

  return frame
}

export const mountViewerFrame = (
  container: HTMLElement,
  initialOptions: CreateViewerFrameOptions = {}
): ViewerFrameController => {
  let options = initialOptions
  let src = buildViewerSrc(options)
  const frame = createViewerFrame({ ...options, autoPostFile: false })
  const filePostController = createFileViewerFrameFilePostController({
    getFrame: () => frame,
    getOptions: () => options
  })

  const handleLoad = () => {
    filePostController.schedule()
  }
  const handleMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || !isViewerFrameEvent(event.data)) {
      return
    }
    filePostController.handleFrameEvent(event.data)
    options.onEvent?.(event.data, event)
  }

  frame.addEventListener('load', handleLoad)
  window.addEventListener('message', handleMessage)
  container.appendChild(frame)

  return {
    frame,
    get src() {
      return src
    },
    destroy() {
      filePostController.cancel()
      frame.removeEventListener('load', handleLoad)
      window.removeEventListener('message', handleMessage)
      frame.remove()
    },
    postFile() {
      return filePostController.postNow()
    },
    reload() {
      frame.src = src
    },
    update(nextOptions: ViewerFrameOptions) {
      options = { ...options, ...nextOptions }
      const previousSrc = frame.src
      src = syncViewerFrame(frame, options)
      if (frame.src === previousSrc) {
        filePostController.schedule()
      }
      return src
    }
  }
}
