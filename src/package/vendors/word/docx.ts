// 异步模块加载
import type { Options, renderAsync } from 'docx-preview'
import { applyPrintPageSize, buildPrintPageStyle, formatCssPixels, getElementPrintPageSize } from '@/package/common/printLayout'
import type { PrintPageSize } from '@/package/common/printLayout'
import type { AppWrapper, FileRenderContext } from '@/package/common/type'

const DOCX_DEFAULT_PAGE_SIZE: PrintPageSize = {
  width: 794,
  height: 1123
}

const loadLibrary = (() => {
  const loader = {
    module: null as null | Promise<{defaultOptions: Options, renderAsync: typeof renderAsync}>,
    async load() {
      if (!this.module) {
        this.module = import('docx-preview');
      }
      return this.module;
    }
  }
  return async () => {
    return await loader.load();
  }
})()

const DOCX_RESPONSIVE_CSS = `
.docx-fit-viewer {
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  background: #ececec;
}
.docx-fit-viewer .docx-wrapper {
  box-sizing: border-box;
  min-width: 0 !important;
  width: 100% !important;
  padding: 24px 14px 40px !important;
  background: #e7e9ec !important;
}
.docx-fit-viewer .docx-page-frame {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0 auto 24px;
  overflow: visible;
}
.docx-fit-viewer .docx-page-frame > section.docx {
  position: absolute;
  top: 0;
  left: 50%;
  margin: 0 !important;
  background: #ffffff !important;
  box-shadow: 0 2px 14px rgba(25, 35, 48, 0.18);
  box-sizing: border-box;
  color: #111827;
  overflow: hidden;
  transform-origin: top center;
}
`

function installResponsiveStyle(target: HTMLDivElement) {
  const style = document.createElement('style')
  style.textContent = DOCX_RESPONSIVE_CSS
  target.prepend(style)
  return style
}

function clonePageShell(section: HTMLElement, article: HTMLElement, pageHeight: number) {
  const nextPage = section.cloneNode(false) as HTMLElement
  nextPage.innerHTML = ''
  nextPage.dataset.docxPaginated = 'true'
  nextPage.style.minHeight = `${pageHeight}px`
  nextPage.style.height = `${pageHeight}px`
  nextPage.style.overflow = 'hidden'

  const nextArticle = article.cloneNode(false) as HTMLElement
  nextPage.appendChild(nextArticle)

  Array.from(section.children).forEach(child => {
    if (child !== article) {
      nextPage.appendChild(child.cloneNode(true))
    }
  })

  return { page: nextPage, article: nextArticle }
}

function getDocxPageHeight(section: HTMLElement) {
  const style = window.getComputedStyle(section)
  const minHeight = parseFloat(style.minHeight)
  return Number.isFinite(minHeight) && minHeight > 0 ? minHeight : section.offsetHeight
}

function paginateOversizedSections(target: HTMLDivElement) {
  const wrapper = target.querySelector('.docx-wrapper')
  if (!wrapper) {
    return
  }

  Array.from(wrapper.children).forEach(child => {
    if (!(child instanceof HTMLElement) || !child.matches('section.docx')) {
      return
    }

    const article = child.querySelector(':scope > article')
    if (!(article instanceof HTMLElement)) {
      return
    }

    const pageHeight = getDocxPageHeight(child)
    const originalNodes = Array.from(article.childNodes)
    if (!pageHeight || originalNodes.length < 2 || child.scrollHeight <= pageHeight * 1.15) {
      return
    }

    // docx-preview 只能按已有分页符拆页；没有分页符的长文档需要在预览层补一层视觉分页。
    let current = clonePageShell(child, article, pageHeight)
    child.before(current.page)

    originalNodes.forEach(node => {
      current.article.appendChild(node)

      if (current.page.scrollHeight <= pageHeight + 1 || current.article.childNodes.length === 1) {
        return
      }

      current.article.removeChild(node)
      current = clonePageShell(child, article, pageHeight)
      child.before(current.page)
      current.article.appendChild(node)
    })

    child.remove()
  })
}

function wrapDocxPages(target: HTMLDivElement) {
  const wrapper = target.querySelector('.docx-wrapper')
  if (!wrapper) {
    return []
  }

  return Array.from(wrapper.children).flatMap(child => {
    if (!(child instanceof HTMLElement) || !child.matches('section.docx')) {
      return []
    }

    const frame = document.createElement('div')
    frame.className = 'docx-page-frame'
    child.before(frame)
    frame.appendChild(child)
    return [frame]
  })
}

function makeDocxResponsive(target: HTMLDivElement) {
  target.classList.add('docx-fit-viewer')
  const style = installResponsiveStyle(target)
  paginateOversizedSections(target)
  const frames = wrapDocxPages(target)
  let resizeFrame = 0

  const resize = () => {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = window.requestAnimationFrame(() => {
      frames.forEach(frame => {
        const page = frame.firstElementChild
        if (!(page instanceof HTMLElement)) {
          return
        }

        page.style.transform = 'translateX(-50%)'

        const pageWidth = page.offsetWidth
        const pageHeight = page.offsetHeight
        if (!pageWidth || !pageHeight) {
          return
        }
        const availableWidth = Math.max(frame.clientWidth - 8, 120)
        const scale = Math.min(1, Math.max(0.24, availableWidth / pageWidth))

        page.style.transform = `translateX(-50%) scale(${scale})`
        frame.style.height = `${Math.ceil(pageHeight * scale)}px`
      })
    })
  }

  const observer = new ResizeObserver(resize)
  observer.observe(target)
  frames.forEach(frame => observer.observe(frame))
  resize()

  return () => {
    window.cancelAnimationFrame(resizeFrame)
    observer.disconnect()
    style.remove()
    target.classList.remove('docx-fit-viewer')
  }
}

function getDocxPageElement(frame: HTMLElement) {
  const page = frame.firstElementChild
  return page instanceof HTMLElement ? page : null
}

function getDocxFramePrintSize(frame: HTMLElement | undefined) {
  const page = frame ? getDocxPageElement(frame) : null
  return page ? getElementPrintPageSize(page, DOCX_DEFAULT_PAGE_SIZE) : DOCX_DEFAULT_PAGE_SIZE
}

function normalizeDocxPageForPrint(frame: HTMLElement, pageSize: PrintPageSize) {
  const pageWidth = formatCssPixels(pageSize.width)
  const pageHeight = formatCssPixels(pageSize.height)

  applyPrintPageSize(frame, pageSize)
  frame.style.margin = '0 auto 18px'

  const page = getDocxPageElement(frame)
  if (!page) {
    return
  }

  page.style.position = 'relative'
  page.style.top = 'auto'
  page.style.left = 'auto'
  page.style.width = pageWidth
  page.style.maxWidth = 'none'
  page.style.minHeight = pageHeight
  page.style.height = pageHeight
  page.style.margin = '0 auto'
  page.style.transform = 'none'
  page.style.transformOrigin = 'top left'
  page.style.overflow = 'hidden'
  page.style.boxShadow = 'none'
}

function buildDocxPrintStyle(target: HTMLDivElement) {
  const firstFrame = target.querySelector<HTMLElement>('.docx-page-frame')
  const pageSize = getDocxFramePrintSize(firstFrame || undefined)

  return buildPrintPageStyle({
    selector: '.viewer-export-content .docx-page-frame',
    width: pageSize.width,
    height: pageSize.height
  })
}

function prepareDocxCloneForExport(target: HTMLDivElement) {
  const liveFrames = Array.from(target.querySelectorAll<HTMLElement>('.docx-page-frame'))
  const clone = target.cloneNode(true) as HTMLElement
  const printDocument = document.createElement('div')
  printDocument.className = 'docx-print-document'
  const scopedStyles = Array.from(clone.querySelectorAll('style'))
    .filter(style => !style.textContent?.includes('.docx-fit-viewer'))
    .map(style => style.outerHTML)
    .join('')

  clone.querySelectorAll<HTMLElement>('.docx-page-frame').forEach((frame, index) => {
    normalizeDocxPageForPrint(frame, getDocxFramePrintSize(liveFrames[index]))
    printDocument.appendChild(frame.cloneNode(true))
  })

  return printDocument.childElementCount ? `${scopedStyles}${printDocument.outerHTML}` : clone.innerHTML
}

/**
 * 渲染docx文件
 */
export default async function(buffer: ArrayBuffer, target: HTMLDivElement, context?: FileRenderContext): Promise<AppWrapper> {
  const { defaultOptions, renderAsync } = await loadLibrary()
  const docxOptions: Options = {
    ...defaultOptions,
    // Word 会写入 autoSpaceDN/autoSpaceDE 等兼容标签；生产预览保持静默，避免 docx-preview 调试告警刷屏。
    debug: false,
    experimental: true
  }
  await renderAsync(buffer, target, undefined, docxOptions)
  const disposeResponsive = makeDocxResponsive(target)
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    beforeSnapshot: () => {
      window.dispatchEvent(new Event('resize'))
    },
    printStyle: () => buildDocxPrintStyle(target),
    toHtml: () => prepareDocxCloneForExport(target)
  })

  return {
    $el: target,
    unmount() {
      context?.registerExportAdapter?.(null)
      disposeResponsive()
      target.innerHTML = ''
    }
  }
}
