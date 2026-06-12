declare type EventHandler = (payload: any) => void;
declare interface WorkerContext {
    emit(type: string, payload: any): void;
}
/**
 * 使用worker
 * 添加内部监听器自省
 * 缺省消息格式
 * {
 *   type: '消息类型',
 *   payload: {消息体},
 * }
 */
export declare const useWorker: (factory: () => undefined | Worker) => {
    loading: import('vue').Ref<boolean, boolean>;
    worker: WorkerContext;
    onWorkerMessage: (hook: Function) => number;
    onWorkerError: (hook: Function) => number;
    onWorkerEvent: (type: string, hook: EventHandler) => void;
    mapEvents: (mappings: Array<string> | {
        [key: string]: string;
    }) => any;
};
export {};
