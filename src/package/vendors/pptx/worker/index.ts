import { refWorker } from '@/package/common/worker-ref'

export default {
  create() {
    return refWorker('pptx.worker.js').defaults(() =>
      new Worker(new URL('./pptx.worker.js', import.meta.url), { type: 'module' }))
  }
}
