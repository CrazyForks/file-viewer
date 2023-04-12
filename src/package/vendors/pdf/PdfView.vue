<script setup lang='ts'>
import { onMounted, ref } from 'vue'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf'
import { EventBus, GenericL10n, PDFFindController, PDFLinkService, PDFViewer } from 'pdfjs-dist/legacy/web/pdf_viewer'
import './pdf.css'
import PDFWorker from './worker'

const props = defineProps<{
  data: ArrayBuffer,
}>()

// 容器
const container = ref<HTMLDivElement | null>(null)

// 上下文
const context = {
  // 查看器实例
  viewer: null as null | PDFViewer,
  // 查询内容
  search: '' as string,
  //pdf放大系数
  pdf_scale: 1.0 as number
}

// 指定worker端口
if (!GlobalWorkerOptions.workerPort && typeof window !== 'undefined' && 'Worker' in window) {
  GlobalWorkerOptions.workerPort = PDFWorker.create()
}

// 私有执行
(() => {
  /**
   * 加载文件
   */
  async function loadFile() {
    if (!container.value) return
    // 初始化viewer
    const eventBus = new EventBus()

    // (Optionally) enable hyperlinks within PDF files.
    const pdfLinkService = new PDFLinkService({
      eventBus
    })

    // (Optionally) enable find controller.
    const pdfFindController = new PDFFindController({
      eventBus,
      linkService: pdfLinkService,
      updateMatchesCountOnProgress: true
    })

    const pdfViewer = new PDFViewer({
      container: container.value,
      eventBus,
      linkService: pdfLinkService,
      findController: pdfFindController,
      l10n: new GenericL10n('zh-CN')
    })
    pdfLinkService.setViewer(pdfViewer)

    eventBus.on('pagesinit', () => {
      // We can use pdfViewer now, e.g. let's change default scale.
      pdfViewer.currentScaleValue = '1'

      // We can try searching for things.
      if (context.search) {
        eventBus.dispatch('find', { type: '', query: context.search })
      }
    })
    // Loading document.
    const loadingTask = getDocument({
      data: props.data,
      // cMapUrl: resolve('pdfjs-dist/cmaps/'),
      cMapPacked: true,
      enableXfa: true
    })
    // 得到文档
    const pdfDocument = await loadingTask.promise
    // Document loaded, specifying document for the viewer and
    // the (optional) linkService.
    pdfViewer.setDocument(pdfDocument)
    pdfLinkService.setDocument(pdfDocument, null)
    context.viewer = pdfViewer
  }

  // 挂载后加载
  onMounted(loadFile)
})()


// 放大
function scaleD() {
  if (!context.viewer) return
  const scale = context.viewer.currentScale
  let max = 0
  if (window.screen.width > 1440) {
    max = 1.4
  } else {
    max = 1.2
  }
  if (scale >= max) {
    return
  }
  context.viewer.currentScale = scale + 0.1
}

// 缩小
function scaleX() {
  if (!context.viewer) return
  const scale = context.viewer.currentScale
  let min = 1.0
  if (scale <= min) {
    return
  }
  context.viewer.currentScale = scale - 0.1
}

</script>
<template>
  <div class='container'>
    <div class='pdf_down'>
      <div class='pdf_set_left' @click='scaleD()'>➕</div>
      <div class='pdf_set_middle' @click='scaleX()'>➖</div>
    </div>
    <div ref='container' class='pdf-wrapper'>
      <div id='viewer' class='pdfViewer' />
    </div>
  </div>
</template>

<style scoped>
.container {
    position: relative;
    width: 100%;
    height: 100%;
}

.pdfViewer {
    margin: 0 auto;
}

.pdf-wrapper {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow-y: auto;
}

.container .pdf_down {
    position: fixed;
    display: flex;
    z-index: 20;
    right: 26px;
    bottom: 7%;
}

.container .pdf_down .pdf_set_left {
    width: 30px;
    height: 40px;
    color: #408FFF;
    font-size: 15px;
    padding-top: 25px;
    text-align: center;
    margin-right: 5px;
    cursor: pointer;
}

.container .pdf_down .pdf_set_middle {
    width: 30px;
    height: 40px;
    color: #408FFF;
    font-size: 15px;
    padding-top: 25px;
    text-align: center;
    margin-right: 5px;
    cursor: pointer;
}
</style>
