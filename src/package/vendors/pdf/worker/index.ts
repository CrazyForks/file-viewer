import { refWorker } from '@/package/common/worker-ref'

export default {
  create() {
    return refWorker('pptx.worker.js').defaults(() =>
      new Worker(new URL('/node_modules/pdfjs-dist/legacy/build/pdf.worker.js', import.meta.url), { type: 'module' }))
  }
}
