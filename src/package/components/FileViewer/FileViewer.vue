<script setup lang='ts'>
import axios from 'axios'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { readBuffer } from '../../common/util'
import type { FileRef, Rendered } from '@/package/common/type'
import { useLoading } from '@/package/use'
import { getExtend, render } from './util'

const props = defineProps<{
  /**
   * 本地二进制输入。优先级高于 `url`。
   *
   * 推荐传入带正确扩展名的 `File`；如果业务侧只有 Blob 或 ArrayBuffer，
   * 请先包装成 `new File([...], 'demo.pdf')`，保证格式识别稳定。
   */
  file?: FileRef,
  /**
   * 远端文件地址。组件会在浏览器内下载该地址，再根据路径里的扩展名选择渲染器。
   *
   * 目标资源必须允许浏览器访问；鉴权或无扩展名下载接口建议由宿主侧先取回，
   * 再通过 `file` 参数传入。
   */
  url?: string
}>()

const PREVIEW_MESSAGE = {
  downloading: '正在下载文件资源...',
  reading: '正在解析文件内容...'
}

const filename = ref('')
const output = ref<HTMLDivElement | null>(null)

const displayFilename = computed(() => getSourceFilename())
const currentExtend = computed(() => {
  const name = displayFilename.value
  if (!name || !name.includes('.')) {
    return ''
  }
  return getExtend(name).toLowerCase()
})

const {
  loading,
  error,
  message,
  theme: loadingTheme,
  styleVars: loadingVars,
  startLoading,
  setLoadingMessage,
  stopLoading,
  showError,
  clearError,
  resetLoading
} = useLoading(currentExtend)

let activeRendered: Rendered | undefined
let renderVersion = 0
let pendingDownloadController: AbortController | null = null

const normalizeFilename = (name: string) => {
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

const getFilenameFromUrl = (url: string) => {
  const clean = url.split('?')[0]?.split('#')[0] || url
  const tail = clean.substring(clean.lastIndexOf('/') + 1) || clean
  return normalizeFilename(tail)
}

const getSourceFilename = () => {
  if (filename.value) {
    return filename.value
  }
  if (props.file instanceof File && props.file.name) {
    return normalizeFilename(props.file.name)
  }
  if (typeof props.url === 'string' && props.url) {
    return getFilenameFromUrl(props.url)
  }
  return ''
}

// 每次开始新的预览任务时都生成一个版本号。
// 所有异步回包都必须校验版本，避免旧任务把新视图覆盖掉。
const createRequestVersion = () => {
  renderVersion += 1
  pendingDownloadController?.abort()
  pendingDownloadController = null
  clearError()
  return renderVersion
}

const isCurrentRequest = (version: number) => {
  return version === renderVersion
}

const finishLoading = (version: number) => {
  if (isCurrentRequest(version)) {
    stopLoading()
  }
}

const isAbortError = (nextError: unknown) => {
  if (axios.isCancel(nextError)) {
    return true
  }
  if (nextError instanceof DOMException && nextError.name === 'AbortError') {
    return true
  }
  return typeof nextError === 'object' &&
    nextError !== null &&
    'code' in nextError &&
    nextError.code === 'ERR_CANCELED'
}

const formatErrorMessage = (prefix: string, nextError: unknown) => {
  if (nextError instanceof Error) {
    return `${prefix}：${nextError.message}`
  }
  return `${prefix}：${String(nextError)}`
}

// 统一把 File、Blob、ArrayBuffer 收敛为 File，
// 后续读取和扩展名识别都只面对一种输入类型。
const wrapFileRef = (data: FileRef, nextFilename?: string) => {
  if (data instanceof File) {
    return data
  }

  const safeFilename = normalizeFilename(nextFilename || filename.value || 'preview.bin')

  if (data instanceof Blob) {
    return new File([data], safeFilename, { type: data.type })
  }

  if (data instanceof ArrayBuffer) {
    return new File([data], safeFilename, {})
  }

  throw new Error('不支持的文件类型格式！')
}

// 卸载旧预览实例并清空容器，避免不同预览器残留 DOM 或事件监听。
const clearRenderedContent = () => {
  activeRendered?.unmount?.()
  activeRendered = undefined

  const out = output.value
  if (!out) {
    return
  }

  while (out.firstChild) {
    out.removeChild(out.firstChild)
  }
}

const mountRenderedContent = async (buffer: ArrayBuffer, file: File, version: number, sourceUrl?: string) => {
  const out = output.value
  if (!out || !isCurrentRequest(version)) {
    return undefined
  }

  clearRenderedContent()

  const child = document.createElement('div')
  child.className = 'file-render'
  out.appendChild(child)

  try {
    const rendered = await render(buffer, getExtend(file.name), child, {
      filename: file.name,
      url: sourceUrl
    })
    if (!isCurrentRequest(version)) {
      rendered?.unmount?.()
      if (child.parentNode === out) {
        out.removeChild(child)
      }
      return undefined
    }
    return rendered
  } catch (nextError) {
    if (child.parentNode === out) {
      out.removeChild(child)
    }
    throw nextError
  }
}

// 文件读取和渲染拆成一个独立步骤，方便后续给不同来源复用。
const readAndRenderFile = async (file: File, version: number, sourceUrl?: string) => {
  filename.value = normalizeFilename(file.name || '')
  const arrayBuffer = await readBuffer(file)
  if (!(arrayBuffer instanceof ArrayBuffer) || !isCurrentRequest(version)) {
    return
  }

  const rendered = await mountRenderedContent(arrayBuffer, file, version, sourceUrl)
  if (!isCurrentRequest(version)) {
    rendered?.unmount?.()
    return
  }
  activeRendered = rendered
}

const previewLocalFile = async (source: FileRef, version: number) => {
  startLoading(PREVIEW_MESSAGE.reading)

  try {
    await readAndRenderFile(wrapFileRef(source), version)
  } catch (nextError) {
    if (!isCurrentRequest(version)) {
      return
    }
    console.error(nextError)
    showError(formatErrorMessage('读取文件异常', nextError))
  } finally {
    finishLoading(version)
  }
}

// 远端预览额外管理下载控制器，新的请求进来时可以立即中断旧下载。
const previewRemoteFile = async (url: string, version: number) => {
  const nextFilename = getFilenameFromUrl(url)
  filename.value = nextFilename
  startLoading(PREVIEW_MESSAGE.downloading)

  const controller = new AbortController()
  pendingDownloadController = controller

  try {
    const { data } = await axios({
      url,
      method: 'get',
      responseType: 'blob',
      signal: controller.signal
    })

    if (!isCurrentRequest(version)) {
      return
    }

    if (!data) {
      showError('文件下载失败')
      return
    }

    setLoadingMessage(PREVIEW_MESSAGE.reading)
    await readAndRenderFile(wrapFileRef(data, nextFilename), version, url)
  } catch (nextError) {
    if (!isCurrentRequest(version) || isAbortError(nextError)) {
      return
    }
    console.error(nextError)
    showError(formatErrorMessage('加载文件异常', nextError))
  } finally {
    if (pendingDownloadController === controller) {
      pendingDownloadController = null
    }
    finishLoading(version)
  }
}

// 没有输入源时回到干净初始态，避免保留上一份文档的残留信息。
const resetViewer = () => {
  filename.value = ''
  clearRenderedContent()
  resetLoading()
}

// 统一入口只负责决定“读本地”还是“拉远端”，
// 具体的下载、读取和挂载细节都下沉到独立 helper。
const refreshPreview = async () => {
  const version = createRequestVersion()

  if (props.file) {
    await previewLocalFile(props.file, version)
    return
  }

  if (props.url) {
    await previewRemoteFile(props.url, version)
    return
  }

  resetViewer()
}

watch([() => props.file, () => props.url], () => {
  void refreshPreview()
}, { immediate: true })

onBeforeUnmount(() => {
  createRequestVersion()
  clearRenderedContent()
  resetLoading()
})
</script>

<template>
  <div class='file-viewer' :style='loadingVars'>
    <div class='viewer-stage'>
      <div ref='output' class='content' :class='{ hidden: loading || !!error }' />

      <div v-if='loading' class='state-panel loading-panel'>
        <div class='loading-card'>
          <div class='loading-icon'>{{ loadingTheme.badge }}</div>
          <div class='loading-copy'>
            <span class='loading-kicker'>{{ loadingTheme.label }}</span>
            <strong>{{ message }}</strong>
            <p>{{ loadingTheme.hint }}</p>
          </div>
          <span class='loading-ring' />
        </div>
      </div>

      <div v-else-if='error' class='state-panel error-panel'>
        <div class='error-card'>
          <strong>预览失败</strong>
          <p>{{ error }}</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.file-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.viewer-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.content {
  display: block;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #f2f2f2;
}

.content.hidden {
  visibility: hidden;
}

.state-panel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(246, 248, 249, 0.98));
}

.loading-card,
.error-card {
  width: min(100%, 460px);
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(19, 36, 55, 0.06);
  box-shadow: 0 18px 42px rgba(15, 31, 47, 0.12);
}

.loading-icon {
  flex-shrink: 0;
  min-width: 70px;
  height: 70px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--viewer-accent) 0%, var(--viewer-accent) 100%);
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: 0 14px 30px rgba(17, 28, 40, 0.14);
}

.loading-copy {
  min-width: 0;
  flex: 1;
}

.loading-kicker {
  display: block;
  color: var(--viewer-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.loading-copy strong,
.error-card strong {
  display: block;
  margin-top: 4px;
  color: #16283b;
  font-size: 20px;
  line-height: 1.2;
}

.loading-copy p,
.error-card p {
  margin: 8px 0 0;
  color: #6a7d90;
  line-height: 1.6;
}

.loading-ring {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 3px solid var(--viewer-soft);
  border-top-color: var(--viewer-accent);
  animation: viewer-spin 0.9s linear infinite;
}

.error-card {
  display: block;
  text-align: center;
}

.error-card strong {
  color: #b42318;
}

@keyframes viewer-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

<style>
.file-render {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
</style>
