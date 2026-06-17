import { onUnmounted, ref } from 'vue'
import {
  createFileViewerWorkerController,
  type FileViewerWorkerErrorHook,
  type FileViewerWorkerEventHandler,
  type FileViewerWorkerFactory,
  type FileViewerWorkerMessageHook
} from '@file-viewer/core'

/**
 * 使用worker
 * 添加内部监听器自省
 * 缺省消息格式
 * {
 *   type: '消息类型',
 *   payload: {消息体},
 * }
 */
export const useWorker = (factory: FileViewerWorkerFactory) => {
  // 加载器，每一步都会触发loading，默认是加载状态
  const loading = ref(true)
  const controller = createFileViewerWorkerController(factory)

  const worker = {
    emit(type: string, payload: any) {
      loading.value = true
      controller.emit(type, payload)
    }
  }

  // 挂载结束，销毁worker
  onUnmounted(() => {
    controller.destroy()
  })

  return {
    loading,
    // 一个worker的引用
    worker,
    // 消息钩子
    onWorkerMessage: (hook: FileViewerWorkerMessageHook) => controller.onWorkerMessage(hook),
    // 异常钩子
    onWorkerError: (hook: FileViewerWorkerErrorHook) => controller.onWorkerError(hook),
    // 处理器定义
    onWorkerEvent: (type: string, hook: FileViewerWorkerEventHandler) => controller.onWorkerEvent(type, hook),
    // 映射事件为方法
    mapEvents: (mappings: Array<string> | Record<string, string>) => controller.mapEvents(mappings)
  }
}
