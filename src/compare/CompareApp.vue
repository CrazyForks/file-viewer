<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { FileViewer } from '@/package'
import type { FileRef, FileViewerLifecycleContext, FileViewerOptions } from '@/package/common/type'
import brandLogo from '@/assets/logo.png'

type CompareSide = 'left' | 'right'

interface CompareSample {
  label: string;
  description: string;
  url: string;
}

interface ComparePanelState {
  side: CompareSide;
  title: string;
  url: string;
  file?: FileRef;
  filename: string;
  status: string;
}

const params = new URLSearchParams(window.location.search)

const samples: CompareSample[] = [
  { label: 'DOC 旧版合同', description: 'Word 97-2003 示例', url: '/example/test.doc' },
  { label: 'DOCX 新版文档', description: '多页 Word 示例', url: '/example/word.docx' },
  { label: 'PDF 技术说明', description: '真实 PDF 页面', url: '/example/pdf.pdf' },
  { label: 'PPTX 演示稿', description: '幻灯片并排核对', url: '/example/ppt.pptx' },
  { label: 'Typst 源文件', description: 'Typst 直读渲染', url: '/example/report.typ' },
  { label: 'Markdown 文档', description: '轻量文本排版', url: '/example/markdown.md' }
]

const createPanel = (side: CompareSide, title: string, fallbackUrl: string): ComparePanelState => ({
  side,
  title,
  url: params.get(side) || fallbackUrl,
  file: undefined,
  filename: '',
  status: '准备就绪'
})

const leftPanel = reactive(createPanel('left', '左侧文档', samples[0].url))
const rightPanel = reactive(createPanel('right', '右侧文档', samples[1].url))
const syncScrollEnabled = ref(true)
const leftViewerRef = ref<HTMLElement | null>(null)
const rightViewerRef = ref<HTMLElement | null>(null)

const viewerOptions: FileViewerOptions = {
  toolbar: false,
  archive: {
    cache: true
  },
  pdf: {
    defaultNavigationVisible: false
  }
}

const uploadAccept = [
  '.doc', '.docx', '.docm', '.dot', '.dotx', '.dotm',
  '.pdf', '.ofd', '.typ', '.typst', '.ppt', '.pptx', '.pptm', '.potx', '.potm', '.ppsx', '.ppsm',
  '.xls', '.xlsx', '.xlsm', '.xlsb', '.xlt', '.xltx', '.xltm', '.csv', '.ods', '.md', '.markdown', '.txt', '.html',
  '.htm', '.eml', '.msg', '.epub', '.umd', '.png', '.jpg', '.jpeg'
].join(',')

const sampleByUrl = computed(() => {
  return new Map(samples.map(sample => [sample.url, sample]))
})

let cleanupScrollSync: (() => void) | null = null

const getPanelSourceLabel = (panel: ComparePanelState) => {
  if (panel.file) {
    return panel.filename || '本地文件'
  }
  return sampleByUrl.value.get(panel.url)?.label || panel.url || '未选择'
}

const getPanelDescription = (panel: ComparePanelState) => {
  if (panel.file) {
    return '本地上传'
  }
  return sampleByUrl.value.get(panel.url)?.description || 'URL 文件'
}

const selectSample = (panel: ComparePanelState, url: string) => {
  panel.url = url
  panel.file = undefined
  panel.filename = ''
  panel.status = '等待加载'
}

const handleUrlInput = (panel: ComparePanelState) => {
  panel.file = undefined
  panel.filename = ''
  panel.status = panel.url ? '等待加载' : '未选择文件'
}

const getEventValue = (event: Event) => {
  return (event.target as HTMLInputElement | HTMLSelectElement | null)?.value || ''
}

const handleUpload = (panel: ComparePanelState, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  panel.file = file
  panel.filename = file.name
  panel.url = ''
  panel.status = '等待加载'
  input.value = ''
}

const swapPanels = () => {
  const leftSnapshot = {
    url: leftPanel.url,
    file: leftPanel.file,
    filename: leftPanel.filename,
    status: leftPanel.status
  }
  leftPanel.url = rightPanel.url
  leftPanel.file = rightPanel.file
  leftPanel.filename = rightPanel.filename
  leftPanel.status = rightPanel.status
  rightPanel.url = leftSnapshot.url
  rightPanel.file = leftSnapshot.file
  rightPanel.filename = leftSnapshot.filename
  rightPanel.status = leftSnapshot.status
}

const resetSamples = () => {
  selectSample(leftPanel, samples[0].url)
  selectSample(rightPanel, samples[1].url)
}

const getScroller = (root: HTMLElement | null) => {
  return root?.querySelector<HTMLElement>('.content') || null
}

const setViewerRef = (side: CompareSide, element: Element | ComponentPublicInstance | null) => {
  const htmlElement = element instanceof HTMLElement ? element : null
  if (side === 'left') {
    leftViewerRef.value = htmlElement
  } else {
    rightViewerRef.value = htmlElement
  }
}

const bindScrollSync = async () => {
  cleanupScrollSync?.()
  cleanupScrollSync = null

  if (!syncScrollEnabled.value) {
    return
  }

  await nextTick()
  const leftScroller = getScroller(leftViewerRef.value)
  const rightScroller = getScroller(rightViewerRef.value)
  if (!leftScroller || !rightScroller) {
    return
  }

  let syncing = false
  const mirrorScroll = (from: HTMLElement, to: HTMLElement) => {
    if (syncing) {
      return
    }
    syncing = true
    const topRatio = from.scrollTop / Math.max(1, from.scrollHeight - from.clientHeight)
    const leftRatio = from.scrollLeft / Math.max(1, from.scrollWidth - from.clientWidth)
    to.scrollTop = topRatio * Math.max(0, to.scrollHeight - to.clientHeight)
    to.scrollLeft = leftRatio * Math.max(0, to.scrollWidth - to.clientWidth)
    window.requestAnimationFrame(() => {
      syncing = false
    })
  }

  const onLeftScroll = () => mirrorScroll(leftScroller, rightScroller)
  const onRightScroll = () => mirrorScroll(rightScroller, leftScroller)
  leftScroller.addEventListener('scroll', onLeftScroll, { passive: true })
  rightScroller.addEventListener('scroll', onRightScroll, { passive: true })
  cleanupScrollSync = () => {
    leftScroller.removeEventListener('scroll', onLeftScroll)
    rightScroller.removeEventListener('scroll', onRightScroll)
  }
}

const handleLoadStart = (panel: ComparePanelState) => {
  panel.status = '加载中'
}

const handleLoadComplete = (panel: ComparePanelState, context: FileViewerLifecycleContext) => {
  panel.status = context.duration ? `已完成 ${context.duration}ms` : '已完成'
  void bindScrollSync()
}

const handleUnload = (panel: ComparePanelState) => {
  panel.status = '已卸载'
}

watch(syncScrollEnabled, () => {
  void bindScrollSync()
})

onBeforeUnmount(() => {
  cleanupScrollSync?.()
})
</script>

<template>
  <main class="compare-page">
    <header class="compare-header">
      <a class="brand" href="/" aria-label="返回 Flyfish Viewer 主预览">
        <img :src="brandLogo" alt="">
        <span>
          <strong>Flyfish Viewer</strong>
          <small>Document Compare</small>
        </span>
      </a>
      <div class="compare-title">
        <h1>文档比对</h1>
        <p>左右并排预览，支持示例、URL、本地上传和同步滚动。</p>
      </div>
      <div class="header-actions">
        <label class="sync-toggle">
          <input v-model="syncScrollEnabled" type="checkbox">
          <span>同步滚动</span>
        </label>
        <button type="button" @click="swapPanels">交换</button>
        <button type="button" @click="resetSamples">重置</button>
      </div>
    </header>

    <section class="compare-board" aria-label="文档左右比对">
      <article
        v-for="panel in [leftPanel, rightPanel]"
        :key="panel.side"
        class="compare-panel"
      >
        <div class="panel-tools">
          <div class="panel-heading">
            <span class="status-dot" />
            <div>
              <h2>{{ panel.title }}</h2>
              <p>{{ panel.status }}</p>
            </div>
          </div>

          <div class="tool-grid">
            <label>
              <span>示例</span>
              <select
                :value="panel.url"
                @change="selectSample(panel, getEventValue($event))"
              >
                <option
                  v-for="sample in samples"
                  :key="sample.url"
                  :value="sample.url"
                >
                  {{ sample.label }}
                </option>
              </select>
            </label>

            <label>
              <span>URL</span>
              <input
                v-model.trim="panel.url"
                type="text"
                placeholder="/example/word.docx"
                @input="handleUrlInput(panel)"
              >
            </label>

            <label class="upload-button">
              <input
                type="file"
                :accept="uploadAccept"
                @change="handleUpload(panel, $event)"
              >
              <span>上传文件</span>
            </label>
          </div>
        </div>

        <div class="source-card">
          <strong>{{ getPanelSourceLabel(panel) }}</strong>
          <span>{{ getPanelDescription(panel) }}</span>
        </div>

        <div
          :ref="el => setViewerRef(panel.side, el)"
          class="compare-viewer"
        >
          <FileViewer
            :url="panel.file ? undefined : panel.url"
            :file="panel.file"
            :options="viewerOptions"
            @load-start="handleLoadStart(panel)"
            @load-complete="handleLoadComplete(panel, $event)"
            @unload-complete="handleUnload(panel)"
          />
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
:global(html),
:global(body),
:global(#compare-app) {
  width: 100%;
  height: 100%;
  margin: 0;
}

:global(body) {
  overflow: hidden;
  background: #edf4f0;
}

.compare-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(31, 137, 93, 0.14), transparent 34%),
    linear-gradient(180deg, #f8fbf9 0%, #edf4f0 100%);
  color: #172635;
  font-family: Aptos, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.compare-header {
  flex-shrink: 0;
  min-height: 80px;
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(260px, 1.2fr) auto;
  align-items: center;
  gap: 22px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(21, 41, 58, 0.08);
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
}

.brand {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.brand img {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(22, 111, 73, 0.16);
}

.brand strong,
.brand small,
.compare-title h1,
.compare-title p,
.panel-heading h2,
.panel-heading p,
.source-card strong,
.source-card span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand strong {
  font-size: 18px;
  letter-spacing: 0;
}

.brand small {
  margin-top: 2px;
  color: #668093;
  font-size: 12px;
  font-weight: 700;
}

.compare-title {
  min-width: 0;
  text-align: center;
}

.compare-title h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.compare-title p {
  margin: 6px 0 0;
  color: #6a7d8e;
  font-size: 13px;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.header-actions button,
.sync-toggle {
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid rgba(20, 42, 59, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #294259;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(16, 38, 54, 0.06);
}

.header-actions button {
  cursor: pointer;
}

.header-actions button:hover {
  border-color: rgba(31, 152, 99, 0.28);
  color: #14794e;
}

.sync-toggle input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: #1f9966;
}

.compare-board {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  overflow: hidden;
}

.compare-panel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(24, 45, 62, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 52px rgba(16, 35, 50, 0.1);
}

.panel-tools {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid rgba(24, 45, 62, 0.08);
}

.panel-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #22b779;
  box-shadow: 0 0 0 6px rgba(34, 183, 121, 0.12);
}

.panel-heading h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.panel-heading p {
  margin: 4px 0 0;
  color: #7890a4;
  font-size: 12px;
  font-weight: 700;
}

.tool-grid {
  display: grid;
  grid-template-columns: minmax(150px, 0.75fr) minmax(190px, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.tool-grid label {
  min-width: 0;
  display: grid;
  gap: 6px;
  color: #607588;
  font-size: 12px;
  font-weight: 800;
}

.tool-grid select,
.tool-grid input[type='text'],
.upload-button span {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(24, 45, 62, 0.1);
  border-radius: 10px;
  background: #ffffff;
  color: #1c3145;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.tool-grid select,
.tool-grid input[type='text'] {
  padding: 0 12px;
}

.tool-grid select:focus,
.tool-grid input[type='text']:focus,
.upload-button:focus-within span {
  border-color: rgba(31, 153, 102, 0.5);
  box-shadow: 0 0 0 3px rgba(31, 153, 102, 0.12);
}

.upload-button {
  cursor: pointer;
}

.upload-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.upload-button span {
  min-width: 92px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  color: #166f4a;
  font-weight: 900;
  background: #edf8f2;
}

.source-card {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(24, 45, 62, 0.08);
  color: #273d52;
  background: rgba(247, 250, 248, 0.82);
}

.source-card strong {
  font-size: 14px;
}

.source-card span {
  max-width: 180px;
  color: #738a9d;
  font-size: 12px;
  font-weight: 700;
}

.compare-viewer {
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 1180px) {
  .compare-header {
    grid-template-columns: minmax(180px, 1fr) auto;
  }

  .compare-title {
    display: none;
  }

  .tool-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .compare-page {
    overflow: auto;
  }

  .compare-header {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .header-actions {
    justify-content: stretch;
  }

  .header-actions button,
  .sync-toggle {
    flex: 1;
  }

  .compare-board {
    min-height: 1200px;
    grid-template-columns: 1fr;
    overflow: visible;
  }
}

@media (prefers-color-scheme: dark) {
  :global(body) {
    background: #0f171d;
  }

  .compare-page {
    background:
      linear-gradient(135deg, rgba(42, 167, 112, 0.16), transparent 34%),
      linear-gradient(180deg, #121b22 0%, #0d141a 100%);
    color: #ecf5f8;
  }

  .compare-header,
  .compare-panel {
    border-color: rgba(149, 174, 190, 0.14);
    background: rgba(18, 28, 36, 0.9);
  }

  .brand small,
  .compare-title p,
  .panel-heading p,
  .source-card span,
  .tool-grid label {
    color: #9fb0bd;
  }

  .header-actions button,
  .sync-toggle,
  .tool-grid select,
  .tool-grid input[type='text'] {
    border-color: rgba(149, 174, 190, 0.14);
    background: rgba(16, 25, 32, 0.96);
    color: #ecf5f8;
  }

  .panel-tools,
  .source-card {
    border-color: rgba(149, 174, 190, 0.12);
  }

  .source-card {
    background: rgba(14, 22, 28, 0.8);
    color: #e7f0f4;
  }

  .upload-button span {
    border-color: rgba(47, 214, 151, 0.2);
    background: rgba(47, 214, 151, 0.12);
    color: #72e7b7;
  }
}
</style>
