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
  buildViewerSrc,
  createViewerFrameFilePostController,
  isViewerFrameEvent,
  type ViewerDirectFrameHandle,
  type ViewerFrameFilePostController,
  type ViewerFrameComponentProps,
  type ViewerFrameEventPayload,
  type ViewerFrameOptions
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerAiOptions,
  ViewerArchiveOptions,
  ViewerCadOptions,
  ViewerDocxOptions,
  ViewerFrameComponentBridgeOptions,
  ViewerDirectFrameHandle,
  ViewerFrameComponentProps,
  ViewerFrameContainerComponentProps,
  ViewerFrameControllerAccessor,
  ViewerFrameController,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameEventType,
  ViewerFrameFilePostController,
  ViewerFrameFilePostControllerOptions,
  ViewerFrameHostComponentProps,
  ViewerFrameIframeComponentProps,
  ViewerFrameOptions,
  ViewerPdfOptions,
  ViewerRuntimeOptions,
  ViewerSearchOptions,
  ViewerThemeMode,
  ViewerToolbarOptions,
  ViewerToolbarPosition,
  ViewerTypstOptions,
  ViewerWatermarkOptions
} from '@file-viewer/web'

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

const isReactViewerFrameEvent = (value: unknown): value is ViewerFrameEventPayload => {
  return isViewerFrameEvent(value)
}

const buildReactViewerSrc = (options: ViewerFrameOptions) => {
  return buildViewerSrc(options)
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
  const filePostControllerRef = useRef<ViewerFrameFilePostController | null>(null)
  if (!filePostControllerRef.current) {
    filePostControllerRef.current = createViewerFrameFilePostController({
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
