export type WorkerProvider = () => Worker;

export interface WorkerRef {
  name: string;
  worker: Worker | null;
  defaults(provider: WorkerProvider): Worker;
}

export class WorkerRefImpl implements WorkerRef {
  public readonly name: string;
  public worker: Worker | null;

  constructor(nameOrWorker: string | Worker | null, worker: Worker | null = null) {
    if (typeof nameOrWorker === 'string') {
      this.name = nameOrWorker;
      this.worker = worker;
      return;
    }

    this.name = '';
    this.worker = nameOrWorker;
  }

  defaults(provider: WorkerProvider): Worker {
    if (!this.worker) {
      this.worker = provider();
    }
    return this.worker;
  }
}

export const refWorker = (name: string, _module = false): WorkerRef => {
  return new WorkerRefImpl(name, null);
};
