// 异步模块加载
import type { Options, renderAsync } from 'docx-preview'
import type { AppWrapper } from '@/package/common/type'

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

/**
 * 渲染docx文件
 */
export default async function(buffer: ArrayBuffer, target: HTMLDivElement): Promise<AppWrapper> {
  const { defaultOptions, renderAsync } = await loadLibrary()
  const docxOptions = Object.assign(defaultOptions, {
    debug: true,
    experimental: true
  })
  await renderAsync(buffer, target, undefined, docxOptions)
  const disposeResponsive = makeDocxResponsive(target)

  return {
    $el: target,
    unmount() {
      disposeResponsive()
      target.innerHTML = ''
    }
  }
}
