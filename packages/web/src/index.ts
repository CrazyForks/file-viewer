import {
  DEFAULT_FILE_VIEWER_PUBLIC_DIR,
  DEFAULT_FILE_VIEWER_URL,
  buildFileViewerFrameSrc,
  createFileViewerFrameControllerHandle,
  createFileViewerFrame as createCoreFileViewerFrame,
  createFileViewerFrameFilePostController,
  createFileViewerMountedFrameHandle,
  getFileViewerCurrentOrigin,
  getFileViewerFrameOrigin,
  getFileViewerFrameSourceFilename,
  getFileViewerFrameUrl,
  isFileViewerFrameEvent,
  mountFileViewerFrame as mountCoreFileViewerFrame,
  postFileToFileViewerFrame,
  syncFileViewerFrame as syncCoreFileViewerFrame,
  toFileViewerFrameOptions,
  toFileViewerFrameMessageBlob
} from '@file-viewer/core'
import type {
  FileViewerFileRef,
  FileViewerAiOptions,
  FileViewerArchiveOptions,
  FileViewerDirectFrameHandle as CoreFileViewerDirectFrameHandle,
  FileViewerFrameControllerHandle as CoreFileViewerFrameControllerHandle,
  FileViewerFrameController as CoreFileViewerFrameController,
  FileViewerFrameFilePostController as CoreFileViewerFrameFilePostController,
  FileViewerFrameFilePostControllerOptions as CoreFileViewerFrameFilePostControllerOptions,
  FileViewerFrameEventHandler,
  FileViewerFrameEventPayload,
  FileViewerFrameComponentBridgeOptions as CoreFileViewerFrameComponentBridgeOptions,
  FileViewerFrameComponentProps as CoreFileViewerFrameComponentProps,
  FileViewerFrameContainerComponentProps as CoreFileViewerFrameContainerComponentProps,
  FileViewerFrameHostComponentProps as CoreFileViewerFrameHostComponentProps,
  FileViewerFrameIframeComponentProps as CoreFileViewerFrameIframeComponentProps,
  FileViewerFrameControllerAccessor,
  FileViewerFrameOptions,
  FileViewerFrameParamValue,
  FileViewerMountedFrameHandle as CoreFileViewerMountedFrameHandle,
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

export interface ViewerFrameComponentProps extends CoreFileViewerFrameComponentProps {}

export interface ViewerFrameComponentBridgeOptions extends CoreFileViewerFrameComponentBridgeOptions {}

export interface ViewerFrameIframeComponentProps extends CoreFileViewerFrameIframeComponentProps {}

export interface ViewerFrameContainerComponentProps<
  ContainerClass = unknown,
  ContainerStyle = unknown
> extends CoreFileViewerFrameContainerComponentProps<ContainerClass, ContainerStyle> {}

export interface ViewerFrameHostComponentProps<
  ContainerClass = unknown,
  ContainerStyle = unknown
> extends CoreFileViewerFrameHostComponentProps<ContainerClass, ContainerStyle> {}

export interface CreateViewerFrameOptions extends ViewerFrameOptions {
  autoPostFile?: boolean
  className?: string
  style?: Partial<CSSStyleDeclaration>
  title?: string
}

export interface ViewerFrameController extends CoreFileViewerFrameController {}

export type ViewerFrameControllerAccessor = FileViewerFrameControllerAccessor

export interface ViewerFrameFilePostController extends CoreFileViewerFrameFilePostController {}

export interface ViewerFrameFilePostControllerOptions extends CoreFileViewerFrameFilePostControllerOptions {}

export interface ViewerDirectFrameHandle extends CoreFileViewerDirectFrameHandle {}

export interface ViewerMountedFrameHandle extends CoreFileViewerMountedFrameHandle {}

export interface ViewerFrameControllerHandle extends CoreFileViewerFrameControllerHandle {}

export const DEFAULT_VIEWER_PUBLIC_DIR = DEFAULT_FILE_VIEWER_PUBLIC_DIR
export const DEFAULT_VIEWER_URL = DEFAULT_FILE_VIEWER_URL
export const VIEWER_FRAME_CACHE_KEY = '1.0.23'

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

const withViewerFrameDefaults = <Options extends ViewerFrameOptions>(options: Options) => ({
  ...options,
  defaultViewerUrl: DEFAULT_VIEWER_URL,
  defaultCacheKey: VIEWER_FRAME_CACHE_KEY
})

export const toMessageBlob = toFileViewerFrameMessageBlob

export const toViewerFrameOptions = (
  props: ViewerFrameHostComponentProps,
  bridgeOptions: ViewerFrameComponentBridgeOptions = {}
): CreateViewerFrameOptions => {
  return toFileViewerFrameOptions(props, bridgeOptions)
}

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
  return syncCoreFileViewerFrame(frame, withViewerFrameDefaults(options))
}

export const createViewerFrame = (options: CreateViewerFrameOptions = {}) => {
  return createCoreFileViewerFrame(withViewerFrameDefaults(options))
}

export const createViewerMountedFrameHandle = createFileViewerMountedFrameHandle

export const createViewerFrameControllerHandle = createFileViewerFrameControllerHandle

export const createViewerFrameFilePostController = createFileViewerFrameFilePostController

export const mountViewerFrame = (
  container: HTMLElement,
  initialOptions: CreateViewerFrameOptions = {}
): ViewerFrameController => {
  return mountCoreFileViewerFrame(container, withViewerFrameDefaults(initialOptions))
}

export const mountViewer = mountViewerFrame
