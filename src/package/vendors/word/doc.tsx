import { defaultMsDocCss, parseMsDocToHtml } from 'msdoc-viewer'
import type { AppWrapper, FileRenderContext } from '@/package/common/type'

const PAGE_BREAK_MARKER = '<span class="msdoc-page-break"></span>'
const EMPTY_PAGE_HTML = '<p class="msdoc-paragraph"><br></p>'

const WORD_PAGE_CSS = `
.msdoc-stage{
  box-sizing:border-box;
  min-height:100%;
  padding:32px 24px 48px;
  background:#ececec;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:24px;
}
.msdoc-page{
  width:min(100%,794px);
  box-sizing:border-box;
}
.msdoc-page > .msdoc-root{
  box-sizing:border-box;
  width:100%;
  max-width:none;
  min-height:1123px;
  padding:clamp(24px,7%,96px) clamp(20px,6%,88px);
  background:#fff;
  border:1px solid #d9d9d9;
  box-shadow:0 1px 3px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.12);
  overflow-wrap:anywhere;
}
/* 表格不能沿用正文的 anywhere 断词，否则旧 DOC 的列宽和单元格内容会被过度压缩。 */
.msdoc-page .msdoc-table{
  display:table;
  width:auto;
  max-width:100%;
  table-layout:auto!important;
  border-collapse:collapse;
  border-spacing:0;
}
.msdoc-page .msdoc-table tbody,
.msdoc-page .msdoc-table tr{
  width:auto;
}
.msdoc-page .msdoc-cell{
  min-width:1.5em;
  padding:4px 6px;
  vertical-align:top;
  word-break:normal;
  overflow-wrap:normal;
  white-space:normal;
}
.msdoc-page .msdoc-cell .msdoc-paragraph{
  margin:0 0 4px;
  word-break:normal;
  overflow-wrap:break-word;
}
.msdoc-page .msdoc-cell .msdoc-paragraph:last-child{
  margin-bottom:0;
}
.msdoc-page .msdoc-cell span{
  white-space:normal!important;
}
.msdoc-page .msdoc-page-break{
  display:none;
}
@media (max-width: 860px){
  .msdoc-stage{
    padding:16px 12px 24px;
    gap:16px;
  }
  .msdoc-page{
    width:100%;
  }
  .msdoc-page > .msdoc-root{
    min-height:auto;
    padding:24px 20px;
    box-shadow:none;
  }
}
`

function injectPageBreakMarkers(html: string): string {
  return html.replace(
    /<(p|table|section)([^>]*?)style="([^"]*?\bbreak-before\s*:\s*page;?[^"]*?)"([^>]*)>/gi,
    (match) => `${PAGE_BREAK_MARKER}${match}`
  )
}

function wrapAsWordPages(html: string): string {
  const normalizedHtml = injectPageBreakMarkers(html)
  const pages = normalizedHtml.split(PAGE_BREAK_MARKER)

  return `<div class="msdoc-stage">${pages.map(page => (
    `<section class="msdoc-page"><div class="msdoc-root">${page || EMPTY_PAGE_HTML}</div></section>`
  )).join('')}</div>`
}

function prepareMsDocCloneForExport(target: HTMLDivElement) {
  const clone = target.cloneNode(true) as HTMLElement
  clone.querySelectorAll<HTMLElement>('.msdoc-stage, .msdoc-page, .msdoc-root').forEach(node => {
    node.style.height = 'auto'
    node.style.maxHeight = 'none'
    node.style.overflow = 'visible'
  })
  return clone.innerHTML
}

/**
 * 渲染 doc 文件
 */
export default async function render(buffer: ArrayBuffer, target: HTMLDivElement, context?: FileRenderContext): Promise<AppWrapper> {
  const rendered = await parseMsDocToHtml(buffer, {
    renderOptions: {
      css: `${defaultMsDocCss()}\n${WORD_PAGE_CSS}`
    }
  })

  target.innerHTML = `<style data-msdoc>${rendered.css}</style>${wrapAsWordPages(rendered.html)}`
  context?.registerExportAdapter?.({
    includeDocumentStyles: false,
    toHtml: () => prepareMsDocCloneForExport(target)
  })

  return {
    $el: target,
    unmount() {
      context?.registerExportAdapter?.(null)
      target.innerHTML = ''
    }
  }
}
