<script setup lang='ts'>
import axios from 'axios'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { resolvePrintAvailability } from '../../common/printCapability'
import { shouldStreamPdfUrl } from '../../common/sourceLoading'
import { readBuffer } from '../../common/util'
import type {
  FileRef,
  FileViewerDocumentAnchor,
  FileRenderExportAdapter,
  FileViewerBeforeOperation,
  FileViewerLifecycleContext,
  FileViewerLifecyclePhase,
  FileViewerOperationAvailability,
  FileViewerOptions,
  FileViewerOperationContext,
  FileViewerOperationType,
  FileViewerSearchState,
  FileViewerToolbarOptions,
  FileViewerToolbarPosition,
  Rendered
} from '@/package/common/type'
import { useLoading } from '@/package/use'
import { getExtend, render } from './util'
import { useViewerDocumentFeatures } from './hooks/useViewerDocumentFeatures'
import { useViewerExport } from './hooks/useViewerExport'
import { useViewerWatermark } from './hooks/useViewerWatermark'

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
  /**
   * 预览器通用选项。
   *
   * 目前覆盖内置操作栏、水印，以及压缩包内文件预览的缓存/体积限制。
   */
  options?: FileViewerOptions
}>()

const emit = defineEmits<{
  (event: 'load-start', context: FileViewerLifecycleContext): void;
  (event: 'load-complete', context: FileViewerLifecycleContext): void;
  (event: 'unload-start', context: FileViewerLifecycleContext): void;
  (event: 'unload-complete', context: FileViewerLifecycleContext): void;
  (event: 'operation-before', context: FileViewerOperationContext): void;
  (event: 'operation-cancel', context: FileViewerOperationContext): void;
  (event: 'operation-availability-change', availability: FileViewerOperationAvailability): void;
  (event: 'search-change', state: FileViewerSearchState): void;
  (event: 'location-change', anchor: FileViewerDocumentAnchor | null): void;
}>()

const PREVIEW_MESSAGE = {
  downloading: '正在下载文件资源...',
  streamingPdf: '正在建立 PDF 流式预览...',
  reading: '正在解析文件内容...'
}

const filename = ref('')
const output = ref<HTMLDivElement | null>(null)
const currentFile = ref<File | null>(null)
const currentBuffer = ref<ArrayBuffer | null>(null)
const currentSourceUrl = ref<string | null>(null)
const {
  refreshDocumentIndex,
  clearDocumentState,
  getScrollContainer,
  searchDocument,
  clearDocumentSearch,
  nextSearchResult,
  previousSearchResult,
  getSearchState,
  collectDocumentAnchors,
  scrollToAnchor,
  scrollToLine,
  getDocumentTextChunks
} = useViewerDocumentFeatures({
  output,
  getOptions: () => props.options,
  emitSearchChange: state => emit('search-change', state),
  emitLocationChange: anchor => emit('location-change', anchor)
})

const displayFilename = computed(() => getSourceFilename())
const currentExtend = computed(() => {
  const name = displayFilename.value
  if (!name || !name.includes('.')) {
    return ''
  }
  return getExtend(name).toLowerCase()
})

const normalizedToolbar = computed<FileViewerToolbarOptions>(() => {
  const toolbar = props.options?.toolbar
  if (toolbar === false) {
    return {
      download: false,
      print: false,
      exportHtml: false
    }
  }
  if (toolbar && typeof toolbar === 'object') {
    return {
      download: toolbar.download !== false,
      print: toolbar.print !== false,
      exportHtml: toolbar.exportHtml !== false
    }
  }
  return {
    download: true,
    print: true,
    exportHtml: true
  }
})

const viewerTheme = computed(() => {
  const theme = props.options?.theme
  return theme === 'light' || theme === 'dark' ? theme : 'system'
})

const activeExportAdapter = shallowRef<FileRenderExportAdapter | null>(null)
const renderedReady = ref(false)
const progressiveReady = ref(false)

const operationAvailability = computed<FileViewerOperationAvailability>(() => {
  const hasOriginalSource = !!currentBuffer.value || !!currentSourceUrl.value
  const hasRenderableOutput = renderedReady.value && !error.value
  const adapter = activeExportAdapter.value

  return {
    download: hasOriginalSource,
    print: hasRenderableOutput && resolvePrintAvailability(currentExtend.value, adapter, renderedReady.value),
    exportHtml: hasRenderableOutput && adapter?.exportHtml !== false
  }
})

const visibleToolbar = computed<FileViewerToolbarOptions>(() => {
  const toolbar = normalizedToolbar.value
  const availability = operationAvailability.value
  return {
    download: toolbar.download && availability.download,
    print: toolbar.print && availability.print,
    exportHtml: toolbar.exportHtml && availability.exportHtml
  }
})

const showToolbar = computed(() => {
  const toolbar = visibleToolbar.value
  return toolbar.download || toolbar.print || toolbar.exportHtml
})

const toolbarPosition = computed<FileViewerToolbarPosition>(() => {
  const toolbar = props.options?.toolbar
  const position = toolbar && typeof toolbar === 'object' ? toolbar.position : 'auto'
  if (position === 'top' || position === 'bottom-right') {
    return position
  }
  return currentExtend.value === 'pdf' ? 'bottom-right' : 'top'
})

const toolbarDisabled = computed(() => loading.value || !!error.value)

const {
  watermarkStyle,
  watermarkInlineStyle
} = useViewerWatermark(() => props.options?.watermark)

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
let activeDocumentContext: FileViewerLifecycleContext | null = null
let renderVersion = 0
let pendingDownloadController: AbortController | null = null
const loadStartedAt = new Map<number, number>()

const lifecycleHookName: Record<FileViewerLifecyclePhase, keyof NonNullable<FileViewerOptions['hooks']>> = {
  'load-start': 'onLoadStart',
  'load-complete': 'onLoadComplete',
  'unload-start': 'onUnloadStart',
  'unload-complete': 'onUnloadComplete'
}

const operationLabels: Record<FileViewerOperationType, string> = {
  download: '下载原始文件',
  print: '打印完整渲染内容',
  'export-html': '导出渲染 HTML'
}

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

const getFilenameExtension = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.substring(dot + 1).toLowerCase() : ''
}

const toSerializableContext = (
  context: FileViewerLifecycleContext | FileViewerOperationContext
) => {
  const { file: _file, ...serializable } = context
  return {
    ...serializable,
    hasFile: !!context.file
  }
}

const postViewerEvent = (
  type: 'flyfish-viewer:lifecycle' | 'flyfish-viewer:operation',
  event: string,
  context: FileViewerLifecycleContext | FileViewerOperationContext
) => {
  if (typeof window === 'undefined' || window.parent === window) {
    return
  }
  window.parent.postMessage({
    type,
    event,
    payload: toSerializableContext(context)
  }, '*')
}

const postViewerAvailability = (availability: FileViewerOperationAvailability) => {
  if (typeof window === 'undefined' || window.parent === window) {
    return
  }
  window.parent.postMessage({
    type: 'flyfish-viewer:operation',
    event: 'operation-availability-change',
    payload: availability
  }, '*')
}

const buildLifecycleContext = ({
  phase,
  version,
  source,
  file,
  sourceUrl,
  reason
}: {
  phase: FileViewerLifecyclePhase;
  version: number;
  source: FileViewerLifecycleContext['source'];
  file?: File | null;
  sourceUrl?: string;
  reason?: FileViewerLifecycleContext['reason'];
}): FileViewerLifecycleContext => {
  const name = normalizeFilename(file?.name || filename.value || (sourceUrl ? getFilenameFromUrl(sourceUrl) : ''))
  const startedAt = loadStartedAt.get(version)
  const now = Date.now()
  return {
    phase,
    type: getFilenameExtension(name),
    filename: name,
    source,
    url: sourceUrl,
    file: file || undefined,
    size: file?.size ?? currentBuffer.value?.byteLength,
    version,
    timestamp: now,
    duration: phase === 'load-complete' && startedAt ? now - startedAt : undefined,
    reason
  }
}

const notifyLifecycle = (context: FileViewerLifecycleContext) => {
  if (context.phase === 'load-start') {
    emit('load-start', context)
  } else if (context.phase === 'load-complete') {
    emit('load-complete', context)
  } else if (context.phase === 'unload-start') {
    emit('unload-start', context)
  } else {
    emit('unload-complete', context)
  }
  const hook = props.options?.hooks?.[lifecycleHookName[context.phase]]
  if (hook) {
    void Promise.resolve(hook(context)).catch(error => {
      console.error(`FileViewer ${context.phase} hook failed`, error)
    })
  }
  postViewerEvent('flyfish-viewer:lifecycle', context.phase, context)
}

const buildOperationContext = (operation: FileViewerOperationType): FileViewerOperationContext => {
  const base = activeDocumentContext || buildLifecycleContext({
    phase: 'load-complete',
    version: renderVersion,
    source: props.file ? 'file' : (props.url ? 'url' : 'empty'),
    file: currentFile.value,
    sourceUrl: props.url
  })
  const { phase: _phase, ...context } = base
  return {
    ...context,
    operation,
    label: operationLabels[operation],
    timestamp: Date.now()
  }
}

const getToolbarBeforeOperation = (operation: FileViewerOperationType): Array<FileViewerBeforeOperation | undefined> => {
  const toolbar = props.options?.toolbar
  if (!toolbar || typeof toolbar !== 'object') {
    return []
  }
  const specificHook = operation === 'download'
    ? toolbar.beforeDownload
    : operation === 'print'
      ? toolbar.beforePrint
      : toolbar.beforeExportHtml
  return [toolbar.beforeOperation, specificHook]
}

const runBeforeOperation = async (operation: FileViewerOperationType) => {
  const context = buildOperationContext(operation)
  emit('operation-before', context)
  postViewerEvent('flyfish-viewer:operation', 'operation-before', context)

  const hooks = [
    props.options?.beforeOperation,
    ...getToolbarBeforeOperation(operation)
  ]

  try {
    for (const hook of hooks) {
      if (!hook) {
        continue
      }
      const result = await hook(context)
      if (result === false) {
        emit('operation-cancel', context)
        postViewerEvent('flyfish-viewer:operation', 'operation-cancel', context)
        return false
      }
    }
  } catch (nextError) {
    console.error(nextError)
    showError(formatErrorMessage('操作前置校验失败', nextError))
    emit('operation-cancel', context)
    postViewerEvent('flyfish-viewer:operation', 'operation-cancel', context)
    return false
  }

  return true
}

// 每次开始新的预览任务时都生成一个版本号。
// 所有异步回包都必须校验版本，避免旧任务把新视图覆盖掉。
const createRequestVersion = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
  renderVersion += 1
  pendingDownloadController?.abort()
  pendingDownloadController = null
  clearRenderedContent(reason)
  currentFile.value = null
  currentBuffer.value = null
  currentSourceUrl.value = null
  progressiveReady.value = false
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

const waitForBrowserPaint = () => {
  return new Promise<void>(resolve => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      setTimeout(resolve, 0)
      return
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve())
    })
  })
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

const disposeRendered = (rendered?: Rendered) => {
  if (!rendered) {
    return
  }
  const disposable = rendered as { unmount?: () => void; $destroy?: () => void }
  if (disposable.unmount) {
    disposable.unmount()
    return
  }
  disposable.$destroy?.()
}

// 卸载旧预览实例并清空容器，避免不同预览器残留 DOM 或事件监听。
const clearRenderedContent = (reason: FileViewerLifecycleContext['reason'] = 'replace') => {
  const context = activeDocumentContext
  if (context) {
    notifyLifecycle({
      ...context,
      phase: 'unload-start',
      timestamp: Date.now(),
      reason
    })
  }

  try {
    disposeRendered(activeRendered)
  } catch (nextError) {
    console.warn('预览内容卸载失败', nextError)
  } finally {
    activeRendered = undefined
    activeDocumentContext = null
    activeExportAdapter.value = null
    renderedReady.value = false
    progressiveReady.value = false
    clearDocumentState()

    const out = output.value
    if (out) {
      while (out.firstChild) {
        out.removeChild(out.firstChild)
      }
    }
  }

  if (context) {
    notifyLifecycle({
      ...context,
      phase: 'unload-complete',
      timestamp: Date.now(),
      reason
    })
  }
}

const registerExportAdapter = (adapter: FileRenderExportAdapter | null) => {
  activeExportAdapter.value = adapter
}

const mountRenderedContent = async (
  buffer: ArrayBuffer,
  file: File,
  version: number,
  sourceUrl?: string,
  streamUrl?: string
) => {
  if (!output.value) {
    await nextTick()
  }

  const out = output.value
  if (!out || !isCurrentRequest(version)) {
    return undefined
  }

  clearRenderedContent('replace')

  const child = document.createElement('div')
  child.className = 'file-render'
  out.appendChild(child)
  await nextTick()
  await waitForBrowserPaint()

  if (!isCurrentRequest(version)) {
    if (child.parentNode === out) {
      out.removeChild(child)
    }
    return undefined
  }

  try {
    const rendered = await render(buffer, getExtend(file.name), child, {
      filename: file.name,
      url: sourceUrl,
      streamUrl,
      options: props.options,
      registerExportAdapter,
      onProgressiveRender: () => {
        if (isCurrentRequest(version)) {
          progressiveReady.value = true
        }
      }
    })
    if (!isCurrentRequest(version)) {
      disposeRendered(rendered)
      if (child.parentNode === out) {
        out.removeChild(child)
      }
      return undefined
    }
    void refreshDocumentIndex()
    return rendered
  } catch (nextError) {
    if (child.parentNode === out) {
      out.removeChild(child)
    }
    throw nextError
  }
}

// 文件读取和渲染拆成一个独立步骤，方便后续给不同来源复用。
const readAndRenderFile = async (
  file: File,
  version: number,
  sourceUrl?: string,
  source: FileViewerLifecycleContext['source'] = sourceUrl ? 'url' : 'file'
) => {
  filename.value = normalizeFilename(file.name || '')
  const arrayBuffer = await readBuffer(file)
  if (!(arrayBuffer instanceof ArrayBuffer) || !isCurrentRequest(version)) {
    return
  }
  currentFile.value = file
  currentBuffer.value = arrayBuffer
  currentSourceUrl.value = sourceUrl || null

  const rendered = await mountRenderedContent(arrayBuffer, file, version, sourceUrl)
  if (!isCurrentRequest(version)) {
    disposeRendered(rendered)
    return
  }
  activeRendered = rendered
  renderedReady.value = true
  const context = buildLifecycleContext({
    phase: 'load-complete',
    version,
    source,
    file,
    sourceUrl
  })
  activeDocumentContext = context
  notifyLifecycle(context)
  loadStartedAt.delete(version)
}

const canStreamRemotePdf = (url: string, nextFilename: string) => {
  if (typeof window === 'undefined') {
    return false
  }
  return shouldStreamPdfUrl({
    extension: getFilenameExtension(nextFilename),
    pageHref: window.location.href,
    streaming: props.options?.pdf?.streaming,
    url
  })
}

const previewRemotePdfStream = async (url: string, version: number, nextFilename: string) => {
  startLoading(PREVIEW_MESSAGE.streamingPdf)

  try {
    const placeholderFile = new File([], nextFilename || 'preview.pdf', { type: 'application/pdf' })
    currentSourceUrl.value = url
    const rendered = await mountRenderedContent(new ArrayBuffer(0), placeholderFile, version, url, url)
    if (!isCurrentRequest(version)) {
      disposeRendered(rendered)
      return
    }
    activeRendered = rendered
    renderedReady.value = true
    const context = buildLifecycleContext({
      phase: 'load-complete',
      version,
      source: 'url',
      sourceUrl: url
    })
    activeDocumentContext = context
    notifyLifecycle(context)
    loadStartedAt.delete(version)
  } catch (nextError) {
    if (!isCurrentRequest(version)) {
      return
    }
    console.error(nextError)
    showError(formatErrorMessage('加载 PDF 流式预览异常', nextError))
  } finally {
    loadStartedAt.delete(version)
    finishLoading(version)
  }
}

const previewLocalFile = async (source: FileRef, version: number) => {
  const file = wrapFileRef(source)
  filename.value = normalizeFilename(file.name || '')
  loadStartedAt.set(version, Date.now())
  notifyLifecycle(buildLifecycleContext({
    phase: 'load-start',
    version,
    source: 'file',
    file
  }))
  startLoading(PREVIEW_MESSAGE.reading)

  try {
    await readAndRenderFile(file, version, undefined, 'file')
  } catch (nextError) {
    if (!isCurrentRequest(version)) {
      return
    }
    console.error(nextError)
    showError(formatErrorMessage('读取文件异常', nextError))
  } finally {
    loadStartedAt.delete(version)
    finishLoading(version)
  }
}

// 远端预览额外管理下载控制器，新的请求进来时可以立即中断旧下载。
const previewRemoteFile = async (url: string, version: number) => {
  const nextFilename = getFilenameFromUrl(url)
  filename.value = nextFilename
  loadStartedAt.set(version, Date.now())
  notifyLifecycle(buildLifecycleContext({
    phase: 'load-start',
    version,
    source: 'url',
    sourceUrl: url
  }))
  startLoading(PREVIEW_MESSAGE.downloading)

  if (canStreamRemotePdf(url, nextFilename)) {
    await previewRemotePdfStream(url, version, nextFilename)
    return
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null
  pendingDownloadController = controller

  try {
    const { data } = await axios({
      url,
      method: 'get',
      responseType: 'blob',
      signal: controller?.signal
    })

    if (!isCurrentRequest(version)) {
      return
    }

    if (!data) {
      showError('文件下载失败')
      return
    }

    setLoadingMessage(PREVIEW_MESSAGE.reading)
    await readAndRenderFile(wrapFileRef(data, nextFilename), version, url, 'url')
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
    loadStartedAt.delete(version)
    finishLoading(version)
  }
}

// 没有输入源时回到干净初始态，避免保留上一份文档的残留信息。
const resetViewer = () => {
  filename.value = ''
  currentFile.value = null
  currentBuffer.value = null
  currentSourceUrl.value = null
  renderedReady.value = false
  progressiveReady.value = false
  clearRenderedContent()
  resetLoading()
}

// 统一入口只负责决定“读本地”还是“拉远端”，
// 具体的下载、读取和挂载细节都下沉到独立 helper。
const refreshPreview = async () => {
  const hasSource = !!props.file || !!props.url
  const version = createRequestVersion(hasSource ? 'replace' : 'reset')

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

const {
  downloadOriginalFile,
  exportRenderedHtml,
  printRenderedHtml
} = useViewerExport({
  activeExportAdapter,
  currentBuffer,
  currentFile,
  currentSourceUrl,
  displayFilename,
  formatErrorMessage,
  operationAvailability,
  output,
  runBeforeOperation,
  showError,
  watermarkInlineStyle
})

defineExpose({
  downloadOriginalFile,
  printRenderedHtml,
  exportRenderedHtml,
  getOperationAvailability: () => ({ ...operationAvailability.value }),
  getScrollContainer,
  searchDocument,
  clearDocumentSearch,
  nextSearchResult,
  previousSearchResult,
  getSearchState,
  collectDocumentAnchors,
  scrollToAnchor,
  scrollToLine,
  getDocumentTextChunks
})

watch(operationAvailability, availability => {
  const payload = { ...availability }
  emit('operation-availability-change', payload)
  postViewerAvailability(payload)
}, { immediate: true })

watch([() => props.file, () => props.url], () => {
  void refreshPreview()
}, { immediate: true })

onBeforeUnmount(() => {
  createRequestVersion('component-unmount')
  resetLoading()
})
</script>

<template>
  <div class='file-viewer' :data-viewer-theme='viewerTheme' :style='loadingVars'>
    <div class='viewer-stage'>
      <div
        v-if='showToolbar'
        class='viewer-actions'
        :class='{ "viewer-actions--floating": toolbarPosition === "bottom-right" }'
        :data-toolbar-position='toolbarPosition'
      >
        <button
          v-if='visibleToolbar.download'
          type='button'
          :disabled='toolbarDisabled'
          title='下载原始文件'
          @click='downloadOriginalFile'
        >
          下载
        </button>
        <button
          v-if='visibleToolbar.print'
          type='button'
          :disabled='toolbarDisabled'
          title='打印完整渲染内容'
          @click='printRenderedHtml'
        >
          打印
        </button>
        <button
          v-if='visibleToolbar.exportHtml'
          type='button'
          :disabled='toolbarDisabled'
          title='导出当前渲染后的 HTML'
          @click='exportRenderedHtml'
        >
          HTML
        </button>
      </div>
      <div class='viewer-content-shell'>
        <div ref='output' class='content' data-viewer-scroll-root='true' :class='{ hidden: (loading && !progressiveReady) || !!error }' />
        <div v-if='watermarkStyle' class='viewer-watermark' :style='watermarkStyle' />

        <div v-if='loading && !progressiveReady' class='state-panel loading-panel'>
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
  color-scheme: light;
}

.file-viewer[data-viewer-theme='dark'] {
  background: #0f171d;
  color-scheme: dark;
}

.viewer-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewer-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-height: 45px;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(20, 35, 53, 0.06);
  background: rgba(255, 255, 255, 0.92);
}

.viewer-actions--floating {
  position: absolute;
  z-index: 30;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  min-height: 42px;
  padding: 6px;
  border: 1px solid rgba(20, 35, 53, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(16px);
}

.viewer-actions button {
  min-width: 42px;
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #40546a;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.viewer-actions--floating button {
  min-width: 48px;
  height: 32px;
  border-radius: 999px;
}

.viewer-actions button:hover:not(:disabled) {
  background: rgba(33, 163, 102, 0.1);
  color: #16774c;
}

.viewer-actions button:disabled {
  color: #aab5c0;
  cursor: not-allowed;
}

.viewer-content-shell {
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

:global(.flyfish-search-match) {
  padding: 0 2px;
  border-radius: 4px;
  background: rgba(255, 214, 102, 0.72);
  color: inherit;
  box-shadow: 0 0 0 1px rgba(185, 128, 0, 0.14);
}

:global(.flyfish-search-match--active) {
  background: rgba(47, 191, 122, 0.82);
  box-shadow: 0 0 0 2px rgba(30, 132, 83, 0.24);
}

.viewer-watermark {
  position: absolute;
  z-index: 20;
  inset: 0;
  pointer-events: none;
  background-repeat: repeat;
}

.state-panel {
  position: absolute;
  z-index: 40;
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

.file-viewer[data-viewer-theme='dark'] .viewer-actions--floating {
  border-color: rgba(167, 185, 198, 0.16);
  background: rgba(14, 22, 28, 0.94);
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.34);
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions {
  border-bottom-color: rgba(167, 185, 198, 0.12);
  background: rgba(14, 22, 28, 0.94);
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions button {
  color: #b8c7d5;
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions button:hover:not(:disabled) {
  background: rgba(45, 212, 154, 0.14);
  color: #5ee0ae;
}

.file-viewer[data-viewer-theme='dark'] .viewer-actions button:disabled {
  color: #667888;
}

.file-viewer[data-viewer-theme='dark'] .content {
  background: #141c23;
}

.file-viewer[data-viewer-theme='dark'] .state-panel {
  background:
    linear-gradient(180deg, rgba(15, 23, 30, 0.92), rgba(11, 17, 22, 0.98));
}

.file-viewer[data-viewer-theme='dark'] .loading-card,
.file-viewer[data-viewer-theme='dark'] .error-card {
  background: rgba(19, 29, 37, 0.94);
  border-color: rgba(139, 161, 177, 0.16);
  box-shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
}

.file-viewer[data-viewer-theme='dark'] .loading-copy strong,
.file-viewer[data-viewer-theme='dark'] .error-card strong {
  color: #eff7fb;
}

.file-viewer[data-viewer-theme='dark'] .loading-copy p,
.file-viewer[data-viewer-theme='dark'] .error-card p {
  color: #9eb0bf;
}

.file-viewer[data-viewer-theme='dark'] .error-card strong {
  color: #ff9c91;
}

@keyframes viewer-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-color-scheme: dark) {
  .file-viewer[data-viewer-theme='system'] {
    background: #0f171d;
    color-scheme: dark;
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions--floating {
    border-color: rgba(167, 185, 198, 0.16);
    background: rgba(14, 22, 28, 0.94);
    box-shadow: 0 20px 52px rgba(0, 0, 0, 0.34);
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions {
    border-bottom-color: rgba(167, 185, 198, 0.12);
    background: rgba(14, 22, 28, 0.94);
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions button {
    color: #b8c7d5;
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions button:hover:not(:disabled) {
    background: rgba(45, 212, 154, 0.14);
    color: #5ee0ae;
  }

  .file-viewer[data-viewer-theme='system'] .viewer-actions button:disabled {
    color: #667888;
  }

  .file-viewer[data-viewer-theme='system'] .content {
    background: #141c23;
  }

  .file-viewer[data-viewer-theme='system'] .state-panel {
    background:
      linear-gradient(180deg, rgba(15, 23, 30, 0.92), rgba(11, 17, 22, 0.98));
  }

  .file-viewer[data-viewer-theme='system'] .loading-card,
  .file-viewer[data-viewer-theme='system'] .error-card {
    background: rgba(19, 29, 37, 0.94);
    border-color: rgba(139, 161, 177, 0.16);
    box-shadow: 0 22px 52px rgba(0, 0, 0, 0.34);
  }

  .file-viewer[data-viewer-theme='system'] .loading-copy strong,
  .file-viewer[data-viewer-theme='system'] .error-card strong {
    color: #eff7fb;
  }

  .file-viewer[data-viewer-theme='system'] .loading-copy p,
  .file-viewer[data-viewer-theme='system'] .error-card p {
    color: #9eb0bf;
  }

  .file-viewer[data-viewer-theme='system'] .error-card strong {
    color: #ff9c91;
  }
}

@media (max-width: 767px) {
  .viewer-actions--floating {
    right: calc(10px + env(safe-area-inset-right, 0px));
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    max-width: calc(100% - 20px);
    gap: 4px;
    padding: 5px;
    overflow-x: auto;
  }

  .viewer-actions--floating button {
    min-width: 40px;
    height: 30px;
    padding: 0 9px;
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
