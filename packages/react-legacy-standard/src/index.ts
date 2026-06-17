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
  mountViewerFrame,
  type CreateViewerFrameOptions,
  type FileRef,
  type ViewerFrameController,
  type ViewerFrameEventHandler,
  type ViewerFrameOptions,
  type ViewerRuntimeOptions
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerFrameController,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameOptions,
  ViewerRuntimeOptions,
  ViewerThemeMode,
  ViewerToolbarOptions,
  ViewerToolbarPosition
} from '@file-viewer/web'

export interface FileViewerLegacyHandle {
  readonly controller: ViewerFrameController | null
  readonly iframe: HTMLIFrameElement | null
  update(options: ViewerFrameOptions): string
  postFile(): boolean
  reload(): void
  destroy(): void
}

export interface FileViewerLegacyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * Private deployment URL for the baseline viewer page.
   *
   * Defaults to `/file-viewer/index.html` after copying assets with `@file-viewer/web`.
   */
  viewerUrl?: string
  /**
   * Remote file URL. It is passed to the iframe viewer as the `url` query parameter.
   */
  url?: string
  /**
   * Local binary input. It has priority over `url` and is delivered through postMessage.
   */
  file?: FileRef
  /**
   * Filename used when `file` is a Blob or ArrayBuffer.
   */
  name?: string
  /**
   * Host origin allowed to post local binary data.
   */
  from?: string
  /**
   * Target origin for postMessage delivery.
   */
  targetOrigin?: string
  /**
   * Additional iframe query parameters reserved for the baseline viewer.
   */
  params?: ViewerFrameOptions['params']
  /**
   * Cache key for the iframe entry. Set to false to disable the automatic version query.
   */
  cacheKey?: ViewerFrameOptions['cacheKey']
  /**
   * Runtime options forwarded to the baseline viewer, including theme, toolbar and watermark.
   */
  options?: ViewerRuntimeOptions
  /**
   * Lifecycle and operation events emitted by the iframe viewer.
   */
  onViewerEvent?: ViewerFrameEventHandler
  /**
   * Class name applied to the generated iframe.
   */
  iframeClassName?: string
  /**
   * Inline style applied to the generated iframe.
   */
  iframeStyle?: Partial<CSSStyleDeclaration>
  /**
   * Accessible title for the generated iframe.
   */
  iframeTitle?: string
}

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

  const frameOptions = useMemo<CreateViewerFrameOptions>(() => ({
    viewerUrl,
    url,
    file,
    name,
    from,
    targetOrigin,
    params,
    cacheKey,
    options,
    onEvent: onViewerEvent,
    className: iframeClassName,
    style: iframeStyle,
    title: iframeTitle
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

  useImperativeHandle(ref, () => ({
    get controller() {
      return controllerRef.current
    },
    get iframe() {
      return controllerRef.current?.frame ?? null
    },
    update(nextOptions: ViewerFrameOptions) {
      return controllerRef.current?.update(nextOptions) ?? ''
    },
    postFile() {
      return controllerRef.current?.postFile() ?? false
    },
    reload() {
      controllerRef.current?.reload()
    },
    destroy() {
      destroyController(controllerRef, containerRef.current)
    }
  }), [])

  return React.createElement('div', {
    ...containerProps,
    ref: containerRef,
    style: { ...defaultContainerStyle, ...style }
  })
})

FileViewerLegacy.displayName = 'FileViewerLegacy'

export const FileViewer = FileViewerLegacy
export default FileViewerLegacy
