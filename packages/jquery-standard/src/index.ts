import {
  mountViewerFrame,
  type CreateViewerFrameOptions,
  type ViewerFrameController,
  type ViewerFrameOptions
} from '@file-viewer/web'

export type JQueryFileViewerMethod = 'destroy' | 'reload' | 'postFile' | 'update'

export interface JQueryFileViewerOptions extends CreateViewerFrameOptions {
  /**
   * Replace the previous iframe when the same element is initialized again.
   * Set to false to update the existing controller in place.
   */
  replace?: boolean
}

type FileViewerPlugin = ((
  this: JQuery,
  options?: JQueryFileViewerOptions | JQueryFileViewerMethod,
  ...args: unknown[]
) => JQuery) & {
  __flyfishFileViewer?: true
}

const controllers = new WeakMap<Element, ViewerFrameController>()

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const getGlobalJQuery = (): JQueryStatic | undefined => {
  if (!isBrowser()) {
    return undefined
  }

  return window.jQuery || window.$
}

const resolveElement = (target: Element | JQuery | null | undefined): Element | null => {
  if (!target) {
    return null
  }

  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target
  }

  return (target as JQuery)[0] ?? null
}

const ensureHtmlElement = (element: Element): HTMLElement | null => {
  return typeof HTMLElement !== 'undefined' && element instanceof HTMLElement ? element : null
}

const mountIntoElement = (element: Element, options: JQueryFileViewerOptions) => {
  const container = ensureHtmlElement(element)
  if (!container) {
    return
  }

  const previous = controllers.get(container)
  if (previous) {
    if (options.replace === false) {
      previous.update(options)
      return
    }

    previous.destroy()
    controllers.delete(container)
    container.innerHTML = ''
  }

  const { replace: _replace, ...viewerOptions } = options
  controllers.set(container, mountViewerFrame(container, viewerOptions))
}

const callControllerMethod = (
  element: Element,
  method: JQueryFileViewerMethod,
  args: unknown[]
) => {
  const controller = controllers.get(element)
  if (!controller) {
    return
  }

  if (method === 'destroy') {
    controller.destroy()
    controllers.delete(element)
    return
  }

  if (method === 'reload') {
    controller.reload()
    return
  }

  if (method === 'postFile') {
    controller.postFile()
    return
  }

  controller.update((args[0] || {}) as ViewerFrameOptions)
}

export const getFileViewerController = (
  target: Element | JQuery | null | undefined
): ViewerFrameController | null => {
  const element = resolveElement(target)
  return element ? controllers.get(element) ?? null : null
}

export const destroyFileViewer = (target: Element | JQuery | null | undefined) => {
  const element = resolveElement(target)
  const controller = element ? controllers.get(element) : null
  if (!element || !controller) {
    return
  }

  controller.destroy()
  controllers.delete(element)
}

export const installJQueryFileViewer = (jqueryInstance: JQueryStatic | undefined = getGlobalJQuery()) => {
  if (!jqueryInstance) {
    return false
  }

  const existing = jqueryInstance.fn.fileViewer as FileViewerPlugin | undefined
  if (existing?.__flyfishFileViewer) {
    return true
  }

  const plugin: FileViewerPlugin = function fileViewer(
    this: JQuery,
    options: JQueryFileViewerOptions | JQueryFileViewerMethod = {},
    ...args: unknown[]
  ) {
    if (typeof options === 'string') {
      return this.each((_index, element) => callControllerMethod(element, options, args))
    }

    return this.each((_index, element) => mountIntoElement(element, options))
  }

  plugin.__flyfishFileViewer = true
  jqueryInstance.fn.fileViewer = plugin
  return true
}

declare global {
  interface Window {
    jQuery?: JQueryStatic
    $?: JQueryStatic
  }

  interface JQuery {
    fileViewer(
      options?: JQueryFileViewerOptions | JQueryFileViewerMethod,
      ...args: unknown[]
    ): JQuery
  }
}

installJQueryFileViewer()

export { mountViewerFrame }
export type { CreateViewerFrameOptions, ViewerFrameController, ViewerFrameOptions }
export default installJQueryFileViewer
