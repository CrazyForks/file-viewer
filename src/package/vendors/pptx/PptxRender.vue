<script setup lang='ts'>
import { onMounted, ref } from 'vue'
import $ from 'jquery'
import { DefaultOptions } from './options.js'
import './styles/pptxjs.css'
// import { displayChart } from './support/chart.js';

const workerURL = new URL('./worker/pptx.worker.js', import.meta.url)

const props = withDefaults(defineProps<{
  // 二进制数据
  data: ArrayBuffer,
  // 默认配置，支持扩展
  options?: Function,
}>(), {
  options: DefaultOptions
})

const wrapper = ref<null | HTMLDivElement>(null);

// 使用闭包避免暴露
(() => {
  const data = {
    isDone: false as boolean,
    thumbElement: null as null | HTMLImageElement,
    worker: null as null | Worker,
    timer: null as null | number
  }

  const methods = {
    // 启动worker逻辑
    startWorker(): void {
      // 真实的web worker - 使用该方式，我们必须通过blob的方式进行通信
      if (data.worker) data.worker.terminate()
      if (data.timer) clearInterval(data.timer)
      const worker = data.worker = new Worker(workerURL, {
        type: 'module'
      })
      worker.addEventListener('message', event => {
        console.log(event)
        this.processMessage(event.data)
      }, false)
      worker.addEventListener('error', ev => {
        console.error(ev)
      }, false)
      // 通知worker开始工作
      worker.postMessage({
        type: 'processPPTX',
        data: props.data,
        IE11: 'MSInputMethodContext' in window && 'documentMode' in document,
        options: props.options()
      })
      // 定时检测执行情况，发现完成则及时关闭
      data.timer = setInterval(this.stopWorker, 500)
    },
    // 停止worker逻辑
    stopWorker(): void {
      if (data.isDone) {
        data.worker?.terminate()
        console.log('worker terminated')
        if (data.timer) clearInterval(data.timer)
      }
    },
    // 窗口拖动大小，自动调整位置
    resize() {
      if (wrapper.value) {
        const $wrapper = $(wrapper.value)
        const slidesWidth = Math.max(...Array.from($wrapper.children('section')).map(s => s.offsetWidth))
        const wrapperWidth = $wrapper[0].offsetWidth
        $wrapper.css({
          'transform': `scale(${wrapperWidth / slidesWidth})`,
          'transform-origin': 'top left'
        })
      }
    },
    // 核心处理逻辑
    processMessage(msg: any) {
      if (data.isDone || !wrapper.value) return
      const $wrapper = $(wrapper.value)
      const { thumbElement } = data
      switch (msg.type) {
        case 'slide':
          console.log('正在处理:', msg.slide_num)
          $wrapper.append(msg.data)
          break
        case 'pptx-thumb':
          if (thumbElement) $(thumbElement).attr('src', `data:image/jpeg;base64,${msg.data}`)
          break
        case 'slideSize':
          break
        case 'globalCSS':
          $wrapper.append(`<style>${msg.data}</style>`)
          break
        case 'ExecutionTime':
        case 'Done':
          console.log('pptx渲染完成，耗时', msg.data)
          // displayChart(msg.charts);
          data.isDone = true
          break
        case 'WARN':
          console.warn('PPTX processing warning: ', msg.data)
          break
        case 'ERROR':
          data.isDone = true
          console.error('PPTX processing error: ', msg.data)
          break
        case 'DEBUG':
          console.debug('Worker: ', msg.data)
          break
        case 'INFO':
        default:
          console.info('Worker: ', msg.data)
      }
    }
  }

  onMounted(() => {
    methods.startWorker()
  })
})()
</script>

<template>
  <div class='pptx-wrapper' ref='wrapper' />
</template>

<style scoped>
.pptx-wrapper {
  max-width: 100%;
  margin: 0 auto;
}
</style>
