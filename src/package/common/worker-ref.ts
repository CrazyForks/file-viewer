const BASE_PATH = '/node_modules/file-viewer3/dist/worker/'

const IS_LIB = import.meta.env.MODE === 'lib'

type WorkerProvider = () => Worker

export interface WorkerRef {

  worker: Worker | null

  defaults(provider: WorkerProvider): Worker
}

export default class WorkerRefImpl implements WorkerRef {

  public worker: Worker | null = null

  constructor(worker: Worker | null) {
    this.worker = worker
  }

  defaults(provider: WorkerProvider): Worker {
    return this.worker || provider()
  }
}

export function refWorker(name: string, module: boolean = false): WorkerRef {
  let worker = null
  const url = `${BASE_PATH}${name}`;
  if (IS_LIB) {
    worker = new Worker(new URL(url, import.meta.url), { type: module ? 'module' : 'classic' })
  }
  return new WorkerRefImpl(worker)
}
