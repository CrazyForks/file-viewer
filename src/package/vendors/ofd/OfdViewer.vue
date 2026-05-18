<script setup lang='ts'>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  data: ArrayBuffer
}>()

type OfdModule = typeof import('./dltech/ofd/ofd')

const stage = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')

let destroyed = false

const clearStage = () => {
  const target = stage.value
  if (!target) {
    return
  }
  while (target.firstChild) {
    target.removeChild(target.firstChild)
  }
}

const parseWithOfdJs = (ofd: OfdModule) => {
  return new Promise<unknown[]>((resolve, reject) => {
    // 这里使用 DLTech21/ofd.js 仓库源码的纯 JS 解析入口，避开 npm dist 中的授权 wasm 分支。
    // 签章验签链路已在本地适配为不阻断正文预览，正文、图片、矢量路径仍由同一项目源码渲染。
    ofd.parseOfdDocument({
      ofd: props.data,
      success: documents => resolve(documents),
      fail: (reason: unknown) => reject(reason)
    })
  })
}

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message
  }
  return typeof reason === 'string' ? reason : JSON.stringify(reason)
}

const appendPages = (target: HTMLDivElement, pages: HTMLElement[]) => {
  const fragment = document.createDocumentFragment()

  pages.forEach(page => {
    page.classList.add('ofd-page')
    fragment.appendChild(page)
  })

  target.appendChild(fragment)
}

const renderWithOfdJs = async (target: HTMLDivElement, width: number) => {
  // OFD 解析/渲染引擎只在命中 .ofd 时动态进入当前异步块，避免拖慢普通文件预览。
  const ofd = await import('./dltech/ofd/ofd')
  const documents = await parseWithOfdJs(ofd)
  const ofdDocument = documents[0]

  if (!ofdDocument) {
    throw new Error('OFD 文件中没有可渲染的文档')
  }

  if (destroyed) {
    return
  }

  const pages = await Promise.resolve(ofd.renderOfd(width, ofdDocument))
  appendPages(target, pages)
}

const render = async () => {
  const target = stage.value
  if (!target) {
    return
  }

  status.value = 'loading'
  errorMessage.value = ''
  clearStage()

  try {
    await nextTick()
    const width = Math.max(target.clientWidth - 32, 720)
    await renderWithOfdJs(target, width)
    status.value = 'ready'
  } catch (reason) {
    console.error(reason)
    status.value = 'error'
    errorMessage.value = normalizeError(reason) || 'OFD 文件解析失败'
  }
}

onMounted(() => {
  void render()
})

onBeforeUnmount(() => {
  destroyed = true
  clearStage()
})
</script>

<template>
  <div class='ofd-viewer'>
    <div v-if='status === "loading"' class='ofd-state'>正在解析 OFD...</div>
    <div v-else-if='status === "error"' class='ofd-state error'>{{ errorMessage }}</div>
    <div ref='stage' class='ofd-stage' />
  </div>
</template>

<style scoped>
.ofd-viewer {
  position: relative;
  min-height: 100%;
  background: #e9edf2;
}

.ofd-stage {
  min-height: 100%;
  padding: 18px 0 28px;
  overflow: auto;
}

.ofd-state {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(246, 248, 250, 0.92);
  color: #64748b;
  font-size: 14px;
}

.ofd-state.error {
  color: #b42318;
}
</style>

<style>
.ofd-page {
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
}
</style>
