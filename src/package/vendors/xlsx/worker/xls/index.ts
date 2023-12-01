import { refWorker } from '@/package/common/worker-ref'

export default {
  create() {
    return refWorker('sheet.worker.js').defaults(() =>
      new Worker(new URL('./sheet.worker.ts', import.meta.url), { type: 'module' }))
  }
}
