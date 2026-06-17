import {
  mountViewerFrame,
  type CreateViewerFrameOptions,
  type ViewerFrameController,
  type ViewerFrameOptions
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerAiOptions,
  ViewerArchiveOptions,
  ViewerCadOptions,
  ViewerDocxOptions,
  ViewerDirectFrameHandle,
  ViewerFrameComponentBridgeOptions,
  ViewerFrameComponentProps,
  ViewerFrameContainerComponentProps,
  ViewerFrameControllerAccessor,
  ViewerFrameHostComponentProps,
  ViewerFrameIframeComponentProps,
  ViewerMountedFrameHandle,
  ViewerFrameController,
  ViewerFrameControllerHandle,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameEventType,
  ViewerFrameFilePostController,
  ViewerFrameFilePostControllerOptions,
  ViewerFrameOptions,
  ViewerFrameParamValue,
  ViewerPdfOptions,
  ViewerRuntimeOptions,
  ViewerSearchOptions,
  ViewerThemeMode,
  ViewerToolbarOptions,
  ViewerToolbarPosition,
  ViewerTypstOptions,
  ViewerWatermarkOptions
} from '@file-viewer/web'

export interface FileViewerSvelteActionOptions extends CreateViewerFrameOptions {
  /**
   * Clear the container before mounting a fresh iframe. Enabled by default.
   */
  replace?: boolean
}

export interface FileViewerSvelteActionReturn {
  update(options?: FileViewerSvelteActionOptions): void
  destroy(): void
}

const canUseDom = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const clearContainer = (node: HTMLElement) => {
  node.innerHTML = ''
}

export const fileViewer = (
  node: HTMLElement,
  initialOptions: FileViewerSvelteActionOptions = {}
): FileViewerSvelteActionReturn => {
  let options = initialOptions
  let controller: ViewerFrameController | null = null

  const mount = () => {
    if (!canUseDom()) {
      return
    }

    if (controller) {
      if (options.replace === false) {
        controller.update(options)
        return
      }

      controller.destroy()
      controller = null
    }

    if (options.replace !== false) {
      clearContainer(node)
    }

    const { replace: _replace, ...viewerOptions } = options
    controller = mountViewerFrame(node, viewerOptions)
  }

  mount()

  return {
    update(nextOptions: FileViewerSvelteActionOptions = {}) {
      options = { ...options, ...nextOptions }
      if (controller) {
        const { replace: _replace, ...viewerOptions } = options
        controller.update(viewerOptions as ViewerFrameOptions)
        return
      }
      mount()
    },
    destroy() {
      controller?.destroy()
      controller = null
      if (options.replace !== false) {
        clearContainer(node)
      }
    }
  }
}

export { mountViewerFrame }
export default fileViewer
