import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type IframeHTMLAttributes,
  type SyntheticEvent
} from 'react'
import {
  buildViewerSrc,
  createViewerDirectFrameController,
  createViewerDirectFrameHandle,
  type ViewerDirectFrameHandle,
  type ViewerFrameComponentProps,
  type ViewerDirectFrameController,
  type ViewerFrameOptions
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerAiOptions,
  ViewerArchiveOptions,
  ViewerCadOptions,
  ViewerDocxOptions,
  ViewerDirectFrameController,
  ViewerDirectFrameControllerAccessor,
  ViewerDirectFrameControllerOptions,
  ViewerDirectFrameHandle,
  ViewerFrameComponentBridgeOptions,
  ViewerFrameComponentProps,
  ViewerFrameContainerComponentProps,
  ViewerFrameControllerAccessor,
  ViewerFrameController,
  ViewerFrameControllerHandle,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameEventType,
  ViewerFrameFilePostController,
  ViewerFrameFilePostControllerOptions,
  ViewerFrameHostComponentProps,
  ViewerFrameIframeComponentProps,
  ViewerFrameOptions,
  ViewerFrameParamValue,
  ViewerMountedFrameHandle,
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
  const srcRef = useRef(src)
  const onViewerEventRef = useRef(onViewerEvent)
  frameOptionsRef.current = frameOptions
  srcRef.current = src
  onViewerEventRef.current = onViewerEvent

  const directFrameControllerRef = useRef<ViewerDirectFrameController | null>(null)
  if (!directFrameControllerRef.current) {
    directFrameControllerRef.current = createViewerDirectFrameController({
      getFrame: () => iframeRef.current,
      getOptions: () => frameOptionsRef.current,
      getSrc: () => srcRef.current,
      getOnEvent: () => onViewerEventRef.current
    })
  }
  const directFrameController = directFrameControllerRef.current

  useImperativeHandle(forwardedRef, () => createViewerDirectFrameHandle(
    () => iframeRef.current,
    () => directFrameController
  ), [directFrameController])

  useEffect(() => {
    directFrameController.resetForSrcChange()
  }, [directFrameController, src])

  useEffect(() => {
    directFrameController.syncOptions()
  }, [directFrameController, frameOptions])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      directFrameController.handleMessage(event)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [directFrameController])

  useEffect(() => {
    return () => directFrameController.destroy()
  }, [directFrameController])

  const handleLoad = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    directFrameController.handleLoad()
    onLoad?.(event)
  }, [directFrameController, onLoad])

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
