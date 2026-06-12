type WorkerProvider = () => Worker;
export interface WorkerRef {
    worker: Worker | null;
    defaults(provider: WorkerProvider): Worker;
}
export default class WorkerRefImpl implements WorkerRef {
    worker: Worker | null;
    constructor(worker: Worker | null);
    defaults(provider: WorkerProvider): Worker;
}
export declare function refWorker(_name: string, _module?: boolean): WorkerRef;
export {};
