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
  createFileViewerFrameFilePostController,
  isFileViewerFrameEvent,
} from '@file-viewer/core'
import type {
  FileViewerFileRef,
  FileViewerFrameComponentBridgeOptions,
  FileViewerFrameContainerComponentProps,
  FileViewerDirectFrameHandle,
  FileViewerFrameControllerAccessor,
  FileViewerFrameComponentProps,
  FileViewerFrameHostComponentProps,
  FileViewerFrameIframeComponentProps,
  FileViewerFrameFilePostController,
  FileViewerFrameFilePostControllerOptions,
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
export type ViewerDirectFrameHandle = FileViewerDirectFrameHandle
export type ViewerFrameComponentBridgeOptions = FileViewerFrameComponentBridgeOptions
export type ViewerFrameControllerAccessor = FileViewerFrameControllerAccessor
export type ViewerFrameComponentProps = FileViewerFrameComponentProps
export type ViewerFrameContainerComponentProps<
  ContainerClass = unknown,
  ContainerStyle = unknown
> = FileViewerFrameContainerComponentProps<ContainerClass, ContainerStyle>
export type ViewerFrameHostComponentProps<
  ContainerClass = unknown,
  ContainerStyle = unknown
> = FileViewerFrameHostComponentProps<ContainerClass, ContainerStyle>
export type ViewerFrameIframeComponentProps = FileViewerFrameIframeComponentProps
export type ViewerFrameFilePostController = FileViewerFrameFilePostController
export type ViewerFrameFilePostControllerOptions = FileViewerFrameFilePostControllerOptions
export type ViewerFrameOptions = FileViewerFrameOptions
export type ViewerFrameEventType = FileViewerPostMessageType
export type ViewerFrameEventPayload = FileViewerFrameEventPayload<Record<string, unknown> | null>
export type ViewerFrameEventHandler = FileViewerFrameEventHandler<Record<string, unknown> | null>
export type ViewerRuntimeOptions = FileViewerSerializableOptions
export type ViewerToolbarOptions = FileViewerSerializableToolbarOptions
export type ViewerToolbarPosition = FileViewerToolbarPosition
export type ViewerThemeMode = FileViewerThemeMode

export interface FileViewerHandle extends ViewerDirectFrameHandle {}

export interface FileViewerProps
  extends Omit<IframeHTMLAttributes<HTMLIFrameElement>, 'children' | 'src'>,
    ViewerFrameComponentProps {}

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
  const frameOptionsRef = useRef<ViewerFrameOptions>(frameOptions)
  frameOptionsRef.current = frameOptions
  const filePostControllerRef = useRef<FileViewerFrameFilePostController | null>(null)
  if (!filePostControllerRef.current) {
    filePostControllerRef.current = createFileViewerFrameFilePostController({
      getFrame: () => iframeRef.current,
      getOptions: () => frameOptionsRef.current
    })
  }
  const filePostController = filePostControllerRef.current

  const postFile = useCallback(() => {
    return filePostController.postNow()
  }, [filePostController])

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
    filePostController.reset()
    setFrameReady(false)
  }, [filePostController, src])

  useEffect(() => {
    if (frameReady) {
      filePostController.schedule()
    }
  }, [frameReady, filePostController, frameOptions])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }
      if (!isReactViewerFrameEvent(event.data)) {
        return
      }
      filePostController.handleFrameEvent(event.data)
      onViewerEvent?.(event.data, event)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [filePostController, onViewerEvent])

  useEffect(() => {
    return () => filePostController.cancel()
  }, [filePostController])

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
