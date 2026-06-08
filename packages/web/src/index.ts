export type FileRef = File | Blob | ArrayBuffer

export type ViewerFrameParamValue = string | number | boolean | null | undefined

export interface ViewerWatermarkOptions {
  enabled?: boolean
  text?: string
  image?: string
  opacity?: number
  rotate?: number
  gapX?: number
  gapY?: number
  width?: number
  height?: number
  fontSize?: number
  color?: string
  fontFamily?: string
}

export interface ViewerToolbarOptions {
  download?: boolean
  print?: boolean
  exportHtml?: boolean
}

export interface ViewerArchiveOptions {
  workerUrl?: string
  cache?: boolean
  maxArchiveSize?: number
  maxEntryPreviewSize?: number
}

export interface ViewerRuntimeOptions {
  watermark?: boolean | ViewerWatermarkOptions
  toolbar?: boolean | ViewerToolbarOptions
  archive?: ViewerArchiveOptions
}

export type ViewerFrameEventType = 'flyfish-viewer:lifecycle' | 'flyfish-viewer:operation'

export interface ViewerFrameEventPayload {
  type: ViewerFrameEventType
  event: string
  payload: Record<string, unknown>
}

export type ViewerFrameEventHandler = (
  event: ViewerFrameEventPayload,
  rawEvent: MessageEvent
) => void

export interface ViewerFrameOptions {
  /**
   * 私有化部署后的 Vue 基线预览器页面地址。
   *
   * 默认使用安装后复制到宿主项目的 `/file-viewer/index.html`。
   */
  viewerUrl?: string
  /**
   * 远端文件地址。会透传为预览器的 `url` 查询参数。
   */
  url?: string
  /**
   * 本地二进制输入。优先级高于 `url`，会通过 postMessage 推送给 iframe。
   */
  file?: FileRef
  /**
   * 当 file 是 Blob 或 ArrayBuffer 时用于识别扩展名。
   */
  name?: string
  /**
   * 允许推送二进制的宿主 origin。默认取当前页面 origin。
   */
  from?: string
  /**
   * postMessage 的目标 origin。默认从 viewerUrl 推导。
   */
  targetOrigin?: string
  /**
   * 预留给后续 Vue 基线页面扩展的查询参数。
   */
  params?: Record<string, ViewerFrameParamValue>
  /**
   * iframe 入口页的缓存标识。默认使用当前 web 包版本，避免部署后浏览器继续命中旧 index.html。
   *
   * 传入 false 可关闭自动追加。
   */
  cacheKey?: string | false
  /**
   * 透传给 Vue 基线预览器的运行时选项，例如水印、工具栏和压缩包缓存限制。
   */
  options?: ViewerRuntimeOptions
  /**
   * iframe 模式下接收基线预览器抛出的生命周期和操作事件。
   */
  onEvent?: ViewerFrameEventHandler
}

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

export const DEFAULT_VIEWER_PUBLIC_DIR = '/file-viewer'
export const DEFAULT_VIEWER_URL = `${DEFAULT_VIEWER_PUBLIC_DIR}/index.html`
export const VIEWER_FRAME_CACHE_KEY = '1.0.20'
const DEFAULT_FRAME_TITLE = 'Flyfish Viewer 文件预览'
const FILE_POST_RETRY_LIMIT = 8
const FILE_POST_RETRY_INTERVAL = 120

const canUseDom = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const isFile = (value: unknown): value is File => {
  return typeof File !== 'undefined' && value instanceof File
}

const isBlob = (value: unknown): value is Blob => {
  return typeof Blob !== 'undefined' && value instanceof Blob
}

const isArrayBuffer = (value: unknown): value is ArrayBuffer => {
  return typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer
}

const normalizeViewerUrl = (viewerUrl?: string) => {
  const value = viewerUrl || DEFAULT_VIEWER_URL
  return value.endsWith('/') ? `${value}index.html` : value
}

const createUrl = (viewerUrl?: string) => {
  if (canUseDom()) {
    return new URL(normalizeViewerUrl(viewerUrl), window.location.href)
  }
  return new URL(normalizeViewerUrl(viewerUrl), 'http://localhost')
}

const isAbsoluteUrl = (value?: string) => {
  return !!value && (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) || value.startsWith('//'))
}

const serializeViewerUrl = (url: URL, viewerUrl?: string) => {
  if (isAbsoluteUrl(viewerUrl)) {
    return url.toString()
  }
  return url.pathname + url.search + url.hash
}

const appendSearchParam = (target: URL, key: string, value: ViewerFrameParamValue) => {
  if (value === undefined || value === null || value === '') {
    target.searchParams.delete(key)
    return
  }
  target.searchParams.set(key, String(value))
}

const appendJsonSearchParam = (target: URL, key: string, value: unknown) => {
  if (value === undefined || value === null) {
    target.searchParams.delete(key)
    return
  }
  target.searchParams.set(key, JSON.stringify(value))
}

const isViewerFrameEvent = (value: unknown): value is ViewerFrameEventPayload => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as ViewerFrameEventPayload
  return candidate.type === 'flyfish-viewer:lifecycle' || candidate.type === 'flyfish-viewer:operation'
}

export const getCurrentOrigin = () => {
  return canUseDom() ? window.location.origin : ''
}

export const getViewerUrl = (viewerUrl?: string) => normalizeViewerUrl(viewerUrl)

export const getViewerOrigin = (viewerUrl?: string) => {
  if (!viewerUrl && !canUseDom()) {
    return ''
  }
  return createUrl(viewerUrl).origin
}

export const getSourceFilename = (options: Pick<ViewerFrameOptions, 'file' | 'name' | 'url'>) => {
  if (isFile(options.file) && options.file.name) {
    return options.file.name
  }
  if (options.name) {
    return options.name
  }
  if (options.url) {
    const clean = options.url.split('?')[0]?.split('#')[0] || options.url
    return clean.substring(clean.lastIndexOf('/') + 1) || clean
  }
  return 'preview.bin'
}

export const buildViewerSrc = (options: ViewerFrameOptions = {}) => {
  const src = createUrl(options.viewerUrl)

  Object.entries(options.params || {}).forEach(([key, value]) => {
    appendSearchParam(src, key, value)
  })
  appendSearchParam(
    src,
    '__flyfish_viewer_version',
    options.cacheKey === false ? undefined : (options.cacheKey || VIEWER_FRAME_CACHE_KEY)
  )
  appendJsonSearchParam(src, 'options', options.options)

  if (options.file) {
    appendSearchParam(src, 'url', undefined)
    appendSearchParam(src, 'name', getSourceFilename(options))
    appendSearchParam(src, 'from', options.from || getCurrentOrigin())
    return serializeViewerUrl(src, options.viewerUrl)
  }

  appendSearchParam(src, 'name', undefined)
  appendSearchParam(src, 'from', undefined)
  appendSearchParam(src, 'url', options.url)
  return serializeViewerUrl(src, options.viewerUrl)
}

export const toMessageBlob = (file?: FileRef) => {
  if (!file) {
    return undefined
  }
  if (isBlob(file)) {
    return file
  }
  if (isArrayBuffer(file)) {
    return new Blob([file])
  }
  return undefined
}

export const postFileToViewer = (
  frame: HTMLIFrameElement | null | undefined,
  options: ViewerFrameOptions
) => {
  const data = toMessageBlob(options.file)
  const targetWindow = frame?.contentWindow
  if (!data || !targetWindow) {
    return false
  }

  targetWindow.postMessage(data, options.targetOrigin || getViewerOrigin(options.viewerUrl))
  return true
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
  let filePostRetryTimer: number | undefined
  let filePostRetryCount = 0
  let lifecycleAcknowledged = false
  const frame = createViewerFrame({ ...options, autoPostFile: false })

  const clearFilePostRetry = () => {
    if (filePostRetryTimer) {
      window.clearTimeout(filePostRetryTimer)
      filePostRetryTimer = undefined
    }
  }

  const scheduleFilePost = () => {
    clearFilePostRetry()
    filePostRetryCount = 0
    lifecycleAcknowledged = false

    if (!options.file) {
      return
    }

    const post = () => {
      if (lifecycleAcknowledged) {
        clearFilePostRetry()
        return
      }

      postFileToViewer(frame, options)
      filePostRetryCount += 1

      if (filePostRetryCount < FILE_POST_RETRY_LIMIT) {
        filePostRetryTimer = window.setTimeout(post, FILE_POST_RETRY_INTERVAL)
      } else {
        filePostRetryTimer = undefined
      }
    }

    post()
  }

  const handleLoad = () => {
    scheduleFilePost()
  }
  const handleMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || !isViewerFrameEvent(event.data)) {
      return
    }
    if (event.data.type === 'flyfish-viewer:lifecycle') {
      lifecycleAcknowledged = true
      clearFilePostRetry()
    }
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
      clearFilePostRetry()
      frame.removeEventListener('load', handleLoad)
      window.removeEventListener('message', handleMessage)
      frame.remove()
    },
    postFile() {
      return postFileToViewer(frame, options)
    },
    reload() {
      frame.src = src
    },
    update(nextOptions: ViewerFrameOptions) {
      options = { ...options, ...nextOptions }
      const previousSrc = frame.src
      src = syncViewerFrame(frame, options)
      if (frame.src === previousSrc) {
        scheduleFilePost()
      }
      return src
    }
  }
}
