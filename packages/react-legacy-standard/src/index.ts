import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes
} from 'react'
import {
  createViewerFrameControllerHandle,
  mountViewerFrame,
  toViewerFrameOptions,
  type CreateViewerFrameOptions,
  type ViewerFrameComponentProps,
  type ViewerFrameIframeComponentProps,
  type ViewerFrameControllerHandle,
  type ViewerFrameController,
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerAiOptions,
  ViewerArchiveOptions,
  ViewerCadOptions,
  ViewerDocxOptions,
  ViewerFrameComponentBridgeOptions,
  ViewerFrameComponentProps,
  ViewerFrameContainerComponentProps,
  ViewerFrameControllerAccessor,
  ViewerFrameHostComponentProps,
  ViewerFrameIframeComponentProps,
  ViewerFrameControllerHandle,
  ViewerFrameController,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameEventType,
  ViewerFrameFilePostController,
  ViewerFrameFilePostControllerOptions,
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

export interface FileViewerLegacyHandle extends ViewerFrameControllerHandle {}

export interface FileViewerLegacyProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    ViewerFrameComponentProps,
    ViewerFrameIframeComponentProps {}

const defaultContainerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 0
}

const destroyController = (
  controllerRef: React.MutableRefObject<ViewerFrameController | null>,
  container: HTMLDivElement | null
) => {
  controllerRef.current?.destroy()
  controllerRef.current = null
  if (container) {
    container.innerHTML = ''
  }
}

export const FileViewerLegacy = forwardRef<FileViewerLegacyHandle, FileViewerLegacyProps>((props, ref) => {
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
    iframeClassName,
    iframeStyle,
    iframeTitle,
    style,
    ...containerProps
  } = props

  const containerRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<ViewerFrameController | null>(null)

  const frameOptions = useMemo<CreateViewerFrameOptions>(() => toViewerFrameOptions({
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
    iframeClassName,
    iframeStyle,
    iframeTitle
  }), [
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
    iframeClassName,
    iframeStyle,
    iframeTitle
  ])

  useEffect(() => {
    const container = containerRef.current
    if (!container || controllerRef.current) {
      return undefined
    }

    controllerRef.current = mountViewerFrame(container, frameOptions)
    return () => destroyController(controllerRef, container)
  }, [])

  useEffect(() => {
    controllerRef.current?.update(frameOptions)
  }, [frameOptions])

  useImperativeHandle(ref, () => createViewerFrameControllerHandle(
    () => controllerRef.current,
    () => destroyController(controllerRef, containerRef.current)
  ), [])

  return React.createElement('div', {
    ...containerProps,
    ref: containerRef,
    style: { ...defaultContainerStyle, ...style }
  })
})

FileViewerLegacy.displayName = 'FileViewerLegacy'

export const FileViewer = FileViewerLegacy
export default FileViewerLegacy
