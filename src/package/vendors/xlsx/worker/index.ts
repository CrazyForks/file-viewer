import { refWorker } from '@/package/common/worker-ref'

export default {
  create() {
    return refWorker('xlsx.worker.js').defaults(() =>
      new Worker(new URL('./xlsx.worker.ts', import.meta.url), { type: 'module' }))
  }
}
