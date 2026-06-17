import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type IframeHTMLAttributes,
  type SyntheticEvent
} from 'react'
import {
  DEFAULT_FILE_VIEWER_URL,
  buildFileViewerFrameSrc,
  isFileViewerFrameEvent,
  postFileToFileViewerFrame
} from '@file-viewer/core'
import type {
  FileViewerFileRef,
  FileViewerFrameEventHandler,
  FileViewerFrameEventPayload,
  FileViewerFrameOptions,
  FileViewerPostMessageType,
  FileViewerSerializableOptions,
  FileViewerSerializableToolbarOptions,
  FileViewerThemeMode,
  FileViewerToolbarPosition
} from '@file-viewer/core'

export type FileRef = FileViewerFileRef
export type ViewerFrameOptions = FileViewerFrameOptions
export type ViewerFrameEventType = FileViewerPostMessageType
export type ViewerFrameEventPayload = FileViewerFrameEventPayload<Record<string, unknown> | null>
export type ViewerFrameEventHandler = FileViewerFrameEventHandler<Record<string, unknown> | null>
export type ViewerRuntimeOptions = FileViewerSerializableOptions
export type ViewerToolbarOptions = FileViewerSerializableToolbarOptions
export type ViewerToolbarPosition = FileViewerToolbarPosition
export type ViewerThemeMode = FileViewerThemeMode

export interface FileViewerHandle {
  iframe: HTMLIFrameElement | null
  postFile(): boolean
  reload(): void
}

export interface FileViewerProps extends Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'children' | 'src'> {
  /**
   * 私有化部署后的 Vue 基线预览器页面地址。
   *
   * 不传时默认使用 `@flyfish-group/file-viewer-web` 安装后复制到宿主项目的 `/file-viewer/index.html`。
   */
  viewerUrl?: string
  /**
   * 远端文件地址。会透传给 iframe 里的 Vue 基线预览器。
   */
  url?: string
  /**
   * 本地二进制输入。优先级高于 url，会通过 postMessage 推送给 iframe。
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
   * 预留给 Vue 基线页面的查询参数。
   */
  params?: ViewerFrameOptions['params']
  /**
   * iframe 入口页的缓存标识。默认使用 web 包版本；传 false 可关闭。
   */
  cacheKey?: ViewerFrameOptions['cacheKey']
  /**
   * 透传给 Vue 基线预览器的运行时选项，例如水印、工具栏和压缩包缓存限制。
   */
  options?: ViewerFrameOptions['options']
  /**
   * iframe 模式下接收基线预览器抛出的生命周期和操作事件。
   */
  onViewerEvent?: ViewerFrameEventHandler
}

const defaultStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 0,
  display: 'block'
}

const REACT_VIEWER_FRAME_CACHE_KEY = '1.0.23'

const isReactViewerFrameEvent = (value: unknown): value is ViewerFrameEventPayload => {
  return isFileViewerFrameEvent(value)
}

const buildReactViewerSrc = (options: ViewerFrameOptions) => {
  return buildFileViewerFrameSrc({
    ...options,
    defaultViewerUrl: DEFAULT_FILE_VIEWER_URL,
    defaultCacheKey: REACT_VIEWER_FRAME_CACHE_KEY
  })
}

export const FileViewer = forwardRef<FileViewerHandle, FileViewerProps>((props, forwardedRef) => {
  const {
    viewerUrl,
    url,
    file,
    name,
    from,
    targetOrigin,
    params,
    cacheKey,
    options,
    onViewerEvent,
    onLoad,
    style,
    title = 'Flyfish Viewer 文件预览',
    ...iframeProps
  } = props

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [frameReady, setFrameReady] = useState(false)

  const frameOptions = useMemo<ViewerFrameOptions>(() => ({
    viewerUrl,
    url,
    file,
    name,
    from,
    targetOrigin,
    params,
    cacheKey,
    options
  }), [viewerUrl, url, file, name, from, targetOrigin, params, cacheKey, options])

  const src = useMemo(() => buildReactViewerSrc(frameOptions), [frameOptions])
  const retryTimerRef = useRef<number | undefined>(undefined)
  const retryCountRef = useRef(0)
  const lifecycleAcknowledgedRef = useRef(false)

  const postFile = useCallback(() => {
    return postFileToFileViewerFrame(iframeRef.current, frameOptions)
  }, [frameOptions])

  const clearFilePostRetry = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = undefined
    }
  }, [])

  const scheduleFilePost = useCallback(() => {
    clearFilePostRetry()
    retryCountRef.current = 0
    lifecycleAcknowledgedRef.current = false

    if (!frameOptions.file) {
      return
    }

    const post = () => {
      if (lifecycleAcknowledgedRef.current) {
        clearFilePostRetry()
        return
      }

      postFile()
      retryCountRef.current += 1

      if (retryCountRef.current < 8) {
        retryTimerRef.current = window.setTimeout(post, 120)
      } else {
        retryTimerRef.current = undefined
      }
    }

    post()
  }, [clearFilePostRetry, frameOptions.file, postFile])

  const reload = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = src
    }
  }, [src])

  useImperativeHandle(forwardedRef, () => ({
    get iframe() {
      return iframeRef.current
    },
    postFile,
    reload
  }), [postFile, reload])

  useEffect(() => {
    clearFilePostRetry()
    lifecycleAcknowledgedRef.current = false
    setFrameReady(false)
  }, [clearFilePostRetry, src])

  useEffect(() => {
    if (frameReady) {
      scheduleFilePost()
    }
  }, [frameReady, scheduleFilePost])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }
      if (!isReactViewerFrameEvent(event.data)) {
        return
      }
      if (event.data.type === 'flyfish-viewer:lifecycle') {
        lifecycleAcknowledgedRef.current = true
        clearFilePostRetry()
      }
      onViewerEvent?.(event.data, event)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [clearFilePostRetry, onViewerEvent])

  useEffect(() => {
    return () => clearFilePostRetry()
  }, [clearFilePostRetry])

  const handleLoad = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    setFrameReady(true)
    onLoad?.(event)
  }, [onLoad])

  return (
    <iframe
      {...iframeProps}
      ref={iframeRef}
      src={src}
      title={title}
      style={{ ...defaultStyle, ...style }}
      onLoad={handleLoad}
    />
  )
})

FileViewer.displayName = 'FileViewer'

export default FileViewer
