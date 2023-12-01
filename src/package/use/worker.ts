import { onUnmounted, ref } from 'vue'

declare type EventHandler = (payload: any) => void;

declare interface WorkerContext {

  emit(type: string, payload: any): void
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
export const useWorker = (factory: () => undefined | Worker) => {
  // 加载器，每一步都会触发loading，默认是加载状态
  const loading = ref(true)
  // 构造worker
  const worker = factory()
  // worker实例
  const context: WorkerContext = {
    // 提交到worker
    emit: (type: string, payload: any) => {
      loading.value = true
      worker?.postMessage({
        type,
        payload
      })
    }
  }
  // 消息处理器
  const handlers: { [key: string]: Array<EventHandler> } = {}
  // 处理方法钩子函数
  const onMessageHooks: Array<Function> = []
  // 异常处理钩子函数
  const onErrorHooks: Array<Function> = []
  // 监听消息
  worker?.addEventListener('message', event => {
    const { type, payload } = event.data
    const hooks = handlers[type]
    if (hooks?.length) {
      hooks.forEach(hook => hook(payload))
    }
    onMessageHooks.forEach(hook => hook(event))
  })
  // 监听异常
  worker?.addEventListener('error', event => {
    console.error(event)
    onErrorHooks.forEach(hook => hook(event))
  })

  // 挂载结束，销毁worker
  onUnmounted(() => {
    worker?.terminate()
  })

  return {
    loading,
    // 一个worker的引用
    worker: context,
    // 消息钩子
    onWorkerMessage: (hook: Function) => onMessageHooks.push(hook),
    // 异常钩子
    onWorkerError: (hook: Function) => onErrorHooks.push(hook),
    // 处理器定义
    onWorkerEvent: (type: string, hook: EventHandler): void => {
      let hooks = handlers[type]
      if (!hooks) {
        hooks = handlers[type] = []
      }
      hooks.push(hook)
    },
    // 映射事件为方法
    mapEvents: (mappings: Array<string> | { [key: string]: string }) => {
      if (Array.isArray(mappings)) {
        return mappings.reduce((res: any, key: string) => {
          res[key] = (payload: any) => context.emit(key, payload)
          return res
        }, {})
      }
      return Object.keys(mappings).reduce((res: any, key) => {
        const name = mappings[key]
        res[name] = (payload: any) => context.emit(key, payload)
        return res
      }, {})
    }
  }
}
