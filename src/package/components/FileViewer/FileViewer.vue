<script setup lang='ts'>
import { getExtend, render } from './util'
import axios from 'axios'
import { readBuffer } from '../../common/util'
import { onMounted, ref, watch } from 'vue'
import type { Rendered } from '@/package/common/type'

// 文件引用，支持三种
type FileRef = File | Blob | ArrayBuffer;

/**
 * 静态定义props
 */
const props = defineProps<{
  // 通过文件对象或二进制数据加载文档
  file?: FileRef,
  // 通过url加载文档
  url?: string
}>()

// 加载状态跟踪
const loading = ref<boolean>(false)
// 存在错误时有值
const error = ref<string>('')
// 消息
const message = ref<string>('')
// 文件名
const filename = ref<string>('')
// 引用output
const output = ref<Node>();

// 使用闭包，不导出
(() => {
  // 定义消息结构
  const messages = {
    loading: '正在加载中，请耐心等待...',
    reading: '正在努力解析文件...',
    errorLoading: (e: Error) => `加载文件异常：${e}`,
    errorReading: (e: Error) => `读取文件异常：${e}`
  }

  // 上一个节点
  let last: Rendered | undefined

  // 内置方法集
  const methods = {
    // 从url加载
    async loadFromUrl(): Promise<any> {
      // 要预览的文件地址
      const { url } = props
      if (!url) return
      this.startLoading(messages.loading)
      const filename = url.substring(url.lastIndexOf('/') + 1)
      // 拼接ajax请求文件内容
      try {
        const { data } = await axios({ url, method: 'get', responseType: 'blob' })
        // 展示错误
        if (!data) return this.showError('文件下载失败')
        // 手动构建一个file
        const file = this.wrap(data, filename)
        // 解析文件
        return this.resolveFile(file)
      } catch (e: Error | any) {
        this.showError(messages.errorLoading(e))
      } finally {
        this.endLoading()
      }
    },
    // 包装file
    wrap(data: FileRef, filename?: string): File {
      if (data instanceof File) {
        return data
      }
      if (data instanceof Blob && filename) {
        return new File([data], filename, {})
      }
      if (data instanceof ArrayBuffer) {
        return this.wrap(new Blob([data]))
      }
      throw new Error('不支持的文件类型格式！')
    },
    // 处理并解析文件
    async resolveFile(data: FileRef): Promise<void> {
      // 停止之前的加载
      if (loading.value) this.endLoading()
      // 安全的包装文件
      const file = this.wrap(data)
      // 开始加载
      this.startLoading(messages.reading)
      try {
        filename.value = file.name && decodeURIComponent(file.name) || ''
        const arrayBuffer = await readBuffer(file)
        if (arrayBuffer instanceof ArrayBuffer) {
          last = await this.displayResult(arrayBuffer, file)
        }
      } catch (e: Error | any) {
        console.error(e)
        this.showError(messages.errorReading(e))
      } finally {
        this.endLoading()
      }
    },
    // 展示渲染最终效果
    displayResult(buffer: ArrayBuffer, file: File): Promise<any> {
      // 取得文件名
      const { name } = file
      // 取得扩展名
      const extend = getExtend(name)
      // 输出目的地
      const out = output.value
      if (!out) return Promise.resolve()
      // 添加孩子，防止vue实例替换dom元素
      if (last) {
        if (out.lastChild) out.removeChild(out.lastChild)
        last.unmount()
      }
      // 生成新的dom
      const node = document.createElement('div')
      node.className = 'file-render'
      const child = out.appendChild(node)
      // 调用渲染方法进行渲染
      return new Promise((resolve, reject) => render(buffer, extend, child)
        .then(resolve).catch(reject))
    },
    showError(msg: string): void {
      error.value = msg
    },
    startLoading(msg: string): void {
      loading.value = true
      message.value = msg
      error.value = ''
    },
    endLoading(): void {
      loading.value = false
      message.value = ''
    }
  }

  onMounted(() => {
    if (props.file) {
      methods.resolveFile(props.file)
    }
    methods.loadFromUrl()
  })

  // 执行监听逻辑
  watch(() => props.url, () => methods.loadFromUrl())
  watch(() => props.file, data => data && methods.resolveFile(data))
})()


</script>
<template>
  <div class='file-viewer'>
    <div class='name'>{{ filename }}</div>
    <div v-if='error' class='content loading'>{{ error }}</div>
    <template v-else>
      <div v-show='loading' class='content loading'>{{ message }}</div>
      <div v-show='!loading' class='content' ref='output'></div>
    </template>
  </div>
</template>

<style scoped>
.file-viewer {
  position: relative;
  width: 100%;
  height: 100%;
}

.content {
  display: block;
  background-color: #f2f2f2;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.loading {
  text-align: center;
  padding-top: 50px;
}

.name {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 13px 0;
  font-size: 20px;
  text-shadow: 2px 2px #616161;
  pointer-events: none;
  color: white;
  background: rgba(31, 31, 31, 0.22);
  text-align: center;
  z-index: 10000;
}
</style>

<style>
.file-render {
  width: 100%;
  height: 100%;
}
</style>
