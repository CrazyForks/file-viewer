import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type {
  FileRenderExportAdapter,
  FileRenderExportMode,
  FileRenderExportOptions,
  FileViewerOperationAvailability,
  FileViewerOperationType
} from '@/package/common/type'
import { buildExportHtmlDocument } from './exportDocumentTemplate'

interface UseViewerExportOptions {
  activeExportAdapter: ShallowRef<FileRenderExportAdapter | null>;
  currentBuffer: Ref<ArrayBuffer | null>;
  currentFile: Ref<File | null>;
  currentSourceUrl: Ref<string | null>;
  displayFilename: ComputedRef<string>;
  formatErrorMessage: (prefix: string, nextError: unknown) => string;
  operationAvailability: ComputedRef<FileViewerOperationAvailability>;
  output: Ref<HTMLDivElement | null>;
  runBeforeOperation: (operation: FileViewerOperationType) => Promise<boolean>;
  showError: (message: string) => void;
  watermarkInlineStyle: ComputedRef<string>;
}

const triggerBlobDownload = (blob: Blob, name: string) => {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
}

const triggerUrlDownload = (url: string, name: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const replaceCanvasWithImages = (source: HTMLElement, clone: HTMLElement) => {
  const sourceCanvases = Array.from(source.querySelectorAll('canvas'))
  const clonedCanvases = Array.from(clone.querySelectorAll('canvas'))

  clonedCanvases.forEach((canvas, index) => {
    const sourceCanvas = sourceCanvases[index]
    if (!sourceCanvas) {
      return
    }
    try {
      const image = document.createElement('img')
      image.src = sourceCanvas.toDataURL('image/png')
      image.alt = 'rendered canvas'
      image.style.maxWidth = '100%'
      image.style.display = 'block'
      image.style.margin = '0 auto'
      canvas.replaceWith(image)
    } catch {
      // 跨域资源污染过的 canvas 无法导出，只保留原 canvas 占位。
    }
  })
}

const waitForNextPaint = () => {
  return new Promise<void>(resolve => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
}

const waitForImages = async (root: ParentNode) => {
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(async image => {
    if (image.complete) {
      return
    }
    if ('decode' in image) {
      try {
        await image.decode()
        return
      } catch {
        // decode 失败时继续走 load/error 事件，避免单张异常图片阻塞打印。
      }
    }
    await new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
}

const waitForPrintWindowReady = async (printWindow: Window) => {
  const { document: printDocument } = printWindow
  if (printDocument.readyState !== 'complete') {
    await new Promise<void>(resolve => {
      printWindow.addEventListener('load', () => resolve(), { once: true })
      printWindow.setTimeout(() => resolve(), 1200)
    })
  }

  await Promise.all(Array.from(printDocument.images).map(async image => {
    if (image.complete) {
      return
    }
    if ('decode' in image) {
      try {
        await image.decode()
        return
      } catch {
        // 图片解码失败不阻塞打印，浏览器仍会尝试按现有资源输出。
      }
    }
    await new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
      printWindow.setTimeout(() => resolve(), 1500)
    })
  }))

  await new Promise<void>(resolve => {
    printWindow.requestAnimationFrame(() => {
      printWindow.requestAnimationFrame(() => resolve())
    })
  })
}

const resolvePrintStyle = async (
  adapter: FileRenderExportAdapter | null,
  options: FileRenderExportOptions
) => {
  if (options.mode !== 'print' || !adapter?.printStyle) {
    return ''
  }

  if (typeof adapter.printStyle === 'function') {
    return await adapter.printStyle(options)
  }

  return adapter.printStyle
}

export const useViewerExport = ({
  activeExportAdapter,
  currentBuffer,
  currentFile,
  currentSourceUrl,
  displayFilename,
  formatErrorMessage,
  operationAvailability,
  output,
  runBeforeOperation,
  showError,
  watermarkInlineStyle
}: UseViewerExportOptions) => {
  const prepareRenderedContentForSnapshot = async (source: HTMLElement) => {
    await activeExportAdapter.value?.beforeSnapshot?.()
    await waitForNextPaint()
    await waitForImages(source)
  }

  const buildRenderedHtmlDocument = async (mode: FileRenderExportMode = 'export') => {
    const out = output.value
    if (!out) {
      throw new Error('当前没有可导出的预览内容')
    }

    const title = displayFilename.value || 'file-viewer-preview'
    const adapter = activeExportAdapter.value
    const exportOptions = { mode, title }
    const toHtml = adapter?.toHtml
    if (toHtml) {
      const contentHtml = await toHtml(exportOptions)
      const printStyle = await resolvePrintStyle(adapter, exportOptions)
      return buildExportHtmlDocument({
        contentHtml,
        includeDocumentStyles: adapter.includeDocumentStyles !== false,
        printStyle,
        title,
        watermarkInlineStyle: watermarkInlineStyle.value
      })
    }

    await prepareRenderedContentForSnapshot(out)
    const clone = out.cloneNode(true) as HTMLElement
    replaceCanvasWithImages(out, clone)
    const printStyle = await resolvePrintStyle(adapter, exportOptions)
    return buildExportHtmlDocument({
      contentHtml: clone.innerHTML,
      printStyle,
      title,
      watermarkInlineStyle: watermarkInlineStyle.value
    })
  }

  const downloadOriginalFile = async () => {
    const buffer = currentBuffer.value
    const file = currentFile.value
    const sourceUrl = currentSourceUrl.value
    if ((!buffer || !file) && !sourceUrl) {
      return
    }
    if (!await runBeforeOperation('download')) {
      return
    }
    if (buffer && file) {
      triggerBlobDownload(new Blob([buffer], { type: file.type || 'application/octet-stream' }), file.name || 'preview.bin')
      return
    }
    triggerUrlDownload(sourceUrl as string, displayFilename.value || 'preview.bin')
  }

  const exportRenderedHtml = async () => {
    try {
      if (!await runBeforeOperation('export-html')) {
        return
      }
      const html = await buildRenderedHtmlDocument('export')
      const baseName = displayFilename.value || 'preview'
      triggerBlobDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${baseName}.rendered.html`)
    } catch (nextError) {
      showError(formatErrorMessage('导出 HTML 失败', nextError))
    }
  }

  const printRenderedHtml = async () => {
    try {
      if (!operationAvailability.value.print) {
        throw new Error('当前文件类型不支持完整打印，请下载原文件后在本地应用中打印')
      }
      if (!await runBeforeOperation('print')) {
        return
      }
      const html = await buildRenderedHtmlDocument('print')
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('浏览器拦截了打印窗口')
      }
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      await waitForPrintWindowReady(printWindow)
      printWindow.print()
    } catch (nextError) {
      showError(formatErrorMessage('打印失败', nextError))
    }
  }

  return {
    downloadOriginalFile,
    exportRenderedHtml,
    printRenderedHtml
  }
}
