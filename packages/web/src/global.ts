import {
  DEFAULT_VIEWER_PUBLIC_DIR,
  DEFAULT_VIEWER_URL,
  VIEWER_FRAME_CACHE_KEY,
  buildViewerSrc,
  createViewerDirectFrameController,
  createViewerDirectFrameHandle,
  createViewerFrame,
  createViewerFrameControllerHandle,
  createViewerFrameFilePostController,
  createViewerMountedFrameHandle,
  getCurrentOrigin,
  getSourceFilename,
  getViewerOrigin,
  getViewerUrl,
  isViewerFrameEvent,
  mountViewer,
  mountViewerFrame,
  postFileToViewer,
  syncViewerFrame,
  toMessageBlob
} from './index'

const FlyfishFileViewerWeb = {
  DEFAULT_VIEWER_PUBLIC_DIR,
  DEFAULT_VIEWER_URL,
  VIEWER_FRAME_CACHE_KEY,
  buildViewerSrc,
  createViewerDirectFrameController,
  createViewerDirectFrameHandle,
  createViewerFrame,
  createViewerFrameControllerHandle,
  createViewerFrameFilePostController,
  createViewerMountedFrameHandle,
  getCurrentOrigin,
  getSourceFilename,
  getViewerOrigin,
  getViewerUrl,
  isViewerFrameEvent,
  mountViewer,
  mountViewerFrame,
  postFileToViewer,
  syncViewerFrame,
  toMessageBlob
}

type FlyfishFileViewerWebGlobal = typeof FlyfishFileViewerWeb

declare global {
  interface Window {
    FlyfishFileViewerWeb?: FlyfishFileViewerWebGlobal
  }
}

if (typeof window !== 'undefined') {
  window.FlyfishFileViewerWeb = FlyfishFileViewerWeb
}

export {
  DEFAULT_VIEWER_PUBLIC_DIR,
  DEFAULT_VIEWER_URL,
  VIEWER_FRAME_CACHE_KEY,
  buildViewerSrc,
  createViewerDirectFrameController,
  createViewerDirectFrameHandle,
  createViewerFrame,
  createViewerFrameControllerHandle,
  createViewerFrameFilePostController,
  createViewerMountedFrameHandle,
  getCurrentOrigin,
  getSourceFilename,
  getViewerOrigin,
  getViewerUrl,
  isViewerFrameEvent,
  mountViewer,
  mountViewerFrame,
  postFileToViewer,
  syncViewerFrame,
  toMessageBlob
}

export default FlyfishFileViewerWeb
