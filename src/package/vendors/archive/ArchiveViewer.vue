<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type {
  FileViewerArchiveOptions,
  FileViewerOptions,
  FileViewerRenderedInstance as Rendered
} from '@file-viewer/core'
import { createArchiveCacheKey, flattenArchiveObject, formatBytes, type ArchiveEntryView } from './shared'
import { readArchiveCache, writeArchiveCache } from './cache'
import { loadArchiveEntriesWithoutWorker } from './fallback'
import { renderNestedBuffer } from '../nestedRender'
import libarchiveWorkerSource from 'libarchive.js/dist/worker-bundle.js?raw'
import libarchiveWasmUrl from 'libarchive.js/dist/libarchive.wasm?url'
import {
  disposeFileViewerRendered,
  resolveFileViewerArchiveWasmUrl,
  resolveFileViewerArchiveWorkerUrl
} from '@file-viewer/core'

const DEFAULT_MAX_ARCHIVE_SIZE = 320 * 1024 * 1024
const DEFAULT_MAX_ENTRY_PREVIEW_SIZE = 64 * 1024 * 1024
const DEFAULT_WORKER_TIMEOUT_MS = 30000
const MAX_LISTED_ENTRIES = 5000

const props = defineProps<{
  data: ArrayBuffer;
  filename: string;
  options?: FileViewerArchiveOptions;
}>()

const archiveReader = shallowRef<any>(null)
const entries = ref<ArchiveEntryView[]>([])
const selectedEntry = ref<ArchiveEntryView | null>(null)
const loading = ref(false)
const loadingText = ref('正在读取压缩包目录...')
const loadingHint = ref('大文件会在 Worker 中解析，避免阻塞主线程。')
const error = ref('')
const archiveNotice = ref('')
const filterText = ref('')
const encrypted = ref<boolean | null>(null)
const nestedTarget = ref<HTMLDivElement | null>(null)
let nestedRendered: Rendered | undefined
const objectUrls: string[] = []

const maxArchiveSize = computed(() => props.options?.maxArchiveSize || DEFAULT_MAX_ARCHIVE_SIZE)
const maxEntryPreviewSize = computed(() => props.options?.maxEntryPreviewSize || DEFAULT_MAX_ENTRY_PREVIEW_SIZE)
const cacheEnabled = computed(() => props.options?.cache !== false)
const workerTimeoutMs = computed(() => props.options?.workerTimeoutMs || DEFAULT_WORKER_TIMEOUT_MS)
const nestedViewerOptions = computed<FileViewerOptions>(() => ({
  archive: props.options
}))

const archiveStats = computed(() => {
  const totalSize = entries.value.reduce((sum, entry) => sum + entry.size, 0)
  const previewableCount = entries.value.filter(entry => entry.previewable).length
  return {
    count: entries.value.length,
    totalSize,
    previewableCount
  }
})

const filteredEntries = computed(() => {
  const keyword = filterText.value.trim().toLowerCase()
  const source = keyword
    ? entries.value.filter(entry => entry.path.toLowerCase().includes(keyword))
    : entries.value
  return source.slice(0, MAX_LISTED_ENTRIES)
})

interface ArchiveWorkerCandidate {
  label: string;
  bundled?: boolean;
  workerUrl?: string;
}

const normalizeWorkerError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message
  }
  return typeof reason === 'string' ? reason : JSON.stringify(reason)
}

const withTimeout = async <T,>(promise: Promise<T>, timeout: number, message: string) => {
  let timer = 0

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), timeout)
      })
    ])
  } finally {
    window.clearTimeout(timer)
  }
}

const getViewerBaseUrl = () => {
  const base = import.meta.env.BASE_URL || '/'
  return new URL(base, window.location.href).toString()
}

const createBundledWorkerUrl = () => {
  const wasmUrlLiteral = JSON.stringify(resolveFileViewerArchiveWasmUrl(props.options, libarchiveWasmUrl))
  const workerSource = libarchiveWorkerSource
    .replace(/new URL\((['"])libarchive\.wasm\1\s*,\s*import\.meta\.url\)\.href/g, wasmUrlLiteral)
  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }))
  objectUrls.push(workerUrl)
  return workerUrl
}

const probeWorkerUrl = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' })
    const contentType = response.headers.get('content-type') || ''
    if (response.ok && /javascript|ecmascript|octet-stream/i.test(contentType)) {
      return true
    }
    if (response.status && response.status !== 405) {
      return false
    }
  } catch {
    // 某些本地服务器不支持 HEAD，继续用轻量 GET 探测。
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        Range: 'bytes=0-0'
      }
    })
    const contentType = response.headers.get('content-type') || ''
    return response.ok && /javascript|ecmascript|octet-stream/i.test(contentType)
  } catch {
    return false
  }
}

const resolveWorkerCandidates = async (): Promise<ArchiveWorkerCandidate[]> => {
  const candidates: ArchiveWorkerCandidate[] = []

  if (props.options?.workerUrl) {
    candidates.push({
      label: '自定义 libarchive Worker',
      workerUrl: resolveFileViewerArchiveWorkerUrl(props.options)
    })
  }

  const publicWorkerUrl = resolveFileViewerArchiveWorkerUrl(undefined, getViewerBaseUrl())
  if (!props.options?.workerUrl && await probeWorkerUrl(publicWorkerUrl)) {
    candidates.push({
      label: '静态 libarchive Worker',
      workerUrl: publicWorkerUrl
    })
  }

  candidates.push({
    label: '内置 libarchive Worker',
    bundled: true
  })

  return candidates
}

const createWorkerFromCandidate = (
  candidate: ArchiveWorkerCandidate,
  createdWorkers: Worker[]
) => {
  const workerUrl = candidate.bundled ? createBundledWorkerUrl() : candidate.workerUrl
  if (!workerUrl) {
    throw new Error('压缩包 Worker 地址为空')
  }

  const worker = new Worker(workerUrl, { type: 'module' })
  createdWorkers.push(worker)
  return worker
}

const terminateWorkers = (workers: Worker[]) => {
  workers.forEach(worker => worker.terminate())
  workers.length = 0
}

const tryOpenArchiveWithWorker = async (Archive: any, candidate: ArchiveWorkerCandidate) => {
  const createdWorkers: Worker[] = []

  try {
    Archive.init({
      getWorker: () => createWorkerFromCandidate(candidate, createdWorkers)
    })

    loadingText.value = `正在初始化${candidate.label}...`
    loadingHint.value = '如果当前服务器没有正确发布 Worker/WASM，会自动切换兼容模式。'
    const archiveFile = new File([props.data], props.filename || 'archive.bin')
    const archive = await withTimeout<any>(
      Archive.open(archiveFile),
      workerTimeoutMs.value,
      `${candidate.label} 初始化超时`
    )
    archiveReader.value = archive
    encrypted.value = await withTimeout<boolean | null>(
      archive.hasEncryptedData(),
      workerTimeoutMs.value,
      `${candidate.label} 加密检测超时`
    ).catch(() => null)

    loadingText.value = '正在读取压缩包目录...'
    loadingHint.value = '目录读取完成后，点击内部文件才会按需解压。'
    const fileTree = await withTimeout<Record<string, unknown>>(
      archive.getFilesObject(),
      workerTimeoutMs.value,
      `${candidate.label} 读取目录超时`
    )

    entries.value = flattenArchiveObject(fileTree)
      .sort((left, right) => left.path.localeCompare(right.path))
    return true
  } catch (reason) {
    if (!archiveReader.value) {
      terminateWorkers(createdWorkers)
    }
    throw reason
  }
}

const tryOpenArchiveWithFallback = async () => {
  loadingText.value = 'Worker 不可用，正在切换 ZIP/TAR 兼容模式...'
  loadingHint.value = '兼容模式无需额外静态 Worker，适合手机 WebView 或本地临时服务器。'
  const fallbackEntries = await loadArchiveEntriesWithoutWorker(props.data, props.filename)

  if (!fallbackEntries) {
    return false
  }

  entries.value = fallbackEntries.sort((left, right) => left.path.localeCompare(right.path))
  encrypted.value = null
  archiveNotice.value = '当前环境的 libarchive Worker 未能启动，已自动切换到 ZIP/TAR 兼容模式。RAR、7z 等格式仍建议发布 vendor/libarchive/worker-bundle.js 与 libarchive.wasm。'
  return true
}

const clearNestedPreview = () => {
  disposeFileViewerRendered(nestedRendered)
  nestedRendered = undefined
  const target = nestedTarget.value
  if (target) {
    while (target.firstChild) {
      target.removeChild(target.firstChild)
    }
  }
}

const closeArchive = async () => {
  await archiveReader.value?.close?.()
  archiveReader.value = null
}

const openArchive = async () => {
  if (props.data.byteLength > maxArchiveSize.value) {
    error.value = `压缩包体积 ${formatBytes(props.data.byteLength)} 超过安全上限 ${formatBytes(maxArchiveSize.value)}，请下载后在本地解压。`
    return
  }

  loading.value = true
  loadingText.value = '正在初始化压缩包解析 Worker...'
  loadingHint.value = '大文件会在 Worker 中解析，避免阻塞主线程。'
  error.value = ''
  archiveNotice.value = ''

  try {
    const [{ Archive }, candidates] = await Promise.all([
      import('libarchive.js'),
      resolveWorkerCandidates()
    ])
    const errors: string[] = []

    for (const candidate of candidates) {
      try {
        await closeArchive()
        await tryOpenArchiveWithWorker(Archive, candidate)
        return
      } catch (reason) {
        errors.push(`${candidate.label}: ${normalizeWorkerError(reason)}`)
      }
    }

    await closeArchive()
    if (await tryOpenArchiveWithFallback()) {
      return
    }

    throw new Error(errors.join('；') || '压缩包 Worker 初始化失败')
  } catch (nextError) {
    console.error(nextError)
    error.value = nextError instanceof Error ? nextError.message : String(nextError)
  } finally {
    loading.value = false
  }
}

const renderEntryBuffer = async (entry: ArchiveEntryView, buffer: ArrayBuffer) => {
  await nextTick()
  const target = nestedTarget.value
  if (!target) {
    return
  }
  clearNestedPreview()
  const child = document.createElement('div')
  child.className = 'archive-nested-content'
  target.appendChild(child)
  nestedRendered = await renderNestedBuffer(buffer, entry.extension, child, {
    filename: entry.name,
    options: nestedViewerOptions.value
  })
}

const extractEntryBuffer = async (entry: ArchiveEntryView) => {
  const cacheKey = createArchiveCacheKey(props.filename, props.data.byteLength, entry)
  if (cacheEnabled.value) {
    const cached = await readArchiveCache(cacheKey)
    if (cached) {
      return cached.buffer
    }
  }

  const file = await entry.compressedFile.extract()
  const buffer = await file.arrayBuffer()

  if (cacheEnabled.value) {
    await writeArchiveCache({
      key: cacheKey,
      filename: entry.name,
      size: buffer.byteLength,
      updatedAt: Date.now(),
      buffer
    })
  }

  return buffer
}

const previewEntry = async (entry: ArchiveEntryView) => {
  selectedEntry.value = entry
  if (entry.size > maxEntryPreviewSize.value) {
    error.value = `压缩包内文件 ${entry.name} 体积 ${formatBytes(entry.size)} 超过预览上限 ${formatBytes(maxEntryPreviewSize.value)}。`
    return
  }

  loading.value = true
  loadingText.value = `正在按需解压 ${entry.name}...`
  error.value = ''

  try {
    const buffer = await extractEntryBuffer(entry)
    loadingText.value = `正在渲染 ${entry.name}...`
    await renderEntryBuffer(entry, buffer)
  } catch (nextError) {
    console.error(nextError)
    error.value = nextError instanceof Error ? nextError.message : String(nextError)
  } finally {
    loading.value = false
  }
}

const downloadEntry = async (entry: ArchiveEntryView) => {
  loading.value = true
  loadingText.value = `正在导出 ${entry.name}...`
  try {
    const buffer = await extractEntryBuffer(entry)
    const url = URL.createObjectURL(new Blob([buffer]))
    objectUrls.push(url)
    const link = document.createElement('a')
    link.href = url
    link.download = entry.name
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void openArchive()
})

onBeforeUnmount(() => {
  clearNestedPreview()
  void closeArchive()
  objectUrls.forEach(url => URL.revokeObjectURL(url))
})
</script>

<template>
  <section class="archive-viewer">
    <aside class="archive-sidebar">
      <div class="archive-head">
        <span>ARCHIVE</span>
        <strong>{{ filename }}</strong>
        <p>{{ archiveStats.count }} 个文件 · {{ formatBytes(archiveStats.totalSize) }} · {{ archiveStats.previewableCount }} 个可直接预览</p>
      </div>

      <div v-if="encrypted" class="archive-warning">检测到加密内容，当前在线预览不接收密码，建议下载后本地解压。</div>
      <div v-if="archiveNotice" class="archive-info">{{ archiveNotice }}</div>

      <input v-model="filterText" class="archive-search" type="search" placeholder="筛选压缩包内文件" />

      <div class="archive-list" role="list">
        <button
          v-for="entry in filteredEntries"
          :key="entry.id"
          type="button"
          class="archive-entry"
          :class="{ active: selectedEntry?.id === entry.id }"
          :style="{ '--entry-depth': entry.depth }"
          @click="previewEntry(entry)"
        >
          <span class="entry-ext">{{ entry.extension || 'file' }}</span>
          <span class="entry-copy">
            <strong>{{ entry.name }}</strong>
            <em>{{ entry.path }}</em>
          </span>
          <small>{{ formatBytes(entry.size) }}</small>
        </button>
      </div>
    </aside>

    <main class="archive-preview">
      <div class="archive-preview-toolbar">
        <div>
          <span>压缩包内预览</span>
          <strong>{{ selectedEntry?.name || '请选择一个文件' }}</strong>
        </div>
        <button v-if="selectedEntry" type="button" @click="downloadEntry(selectedEntry)">下载文件</button>
      </div>
      <div ref="nestedTarget" class="archive-nested-target">
        <div v-if="!selectedEntry && !loading" class="archive-empty">
          <strong>选择左侧文件即可预览</strong>
          <p>压缩包只读取目录；文件内容会在点击后按需解压，并在体积允许时缓存到 IndexedDB。</p>
        </div>
      </div>
    </main>

    <div v-if="loading" class="archive-state">
      <div>
        <span class="archive-spinner" />
        <div>
          <strong>{{ loadingText }}</strong>
          <p>{{ loadingHint }}</p>
        </div>
      </div>
    </div>

    <div v-if="error" class="archive-error">
      <strong>压缩包预览提示</strong>
      <p>{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.archive-viewer {
  position: relative;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(280px, 34%) minmax(0, 1fr);
  background: #edf2f7;
  color: #172033;
}

.archive-sidebar {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-right: 1px solid rgba(23, 32, 51, 0.08);
  background: rgba(255, 255, 255, 0.72);
}

.archive-head span,
.archive-preview-toolbar span {
  color: #6c7c90;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.archive-head strong,
.archive-preview-toolbar strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.25;
}

.archive-head p {
  margin: 8px 0 0;
  color: #69798b;
  font-size: 13px;
}

.archive-warning,
.archive-info,
.archive-error {
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff7e8;
  color: #8a4b00;
  font-size: 13px;
  line-height: 1.5;
}

.archive-info {
  background: #ecfdf5;
  color: #166534;
}

.archive-search {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid rgba(23, 32, 51, 0.1);
  outline: none;
  font: inherit;
}

.archive-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-right: 4px;
}

.archive-entry {
  width: 100%;
  min-height: 58px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px 10px 8px calc(10px + var(--entry-depth, 0) * 10px);
  border: 1px solid rgba(23, 32, 51, 0.07);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.archive-entry:hover,
.archive-entry.active {
  border-color: rgba(33, 129, 95, 0.28);
  box-shadow: 0 10px 22px rgba(23, 32, 51, 0.08);
}

.entry-ext {
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(33, 129, 95, 0.12);
  color: #1d7a56;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.entry-copy {
  min-width: 0;
}

.entry-copy strong,
.entry-copy em {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-copy em,
.archive-entry small {
  color: #718096;
  font-size: 12px;
  font-style: normal;
}

.archive-preview {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.archive-preview-toolbar {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.08);
  background: rgba(255, 255, 255, 0.76);
}

.archive-preview-toolbar button {
  height: 34px;
  border: 0;
  border-radius: 10px;
  padding: 0 12px;
  background: #1f7a58;
  color: #ffffff;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.archive-nested-target {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.archive-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
  text-align: center;
  color: #64748b;
}

.archive-empty strong {
  color: #172033;
  font-size: 18px;
}

.archive-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.82);
  backdrop-filter: blur(8px);
}

.archive-state > div {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(92%, 430px);
  padding: 18px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
}

.archive-state p {
  margin: 4px 0 0;
  color: #64748b;
}

.archive-spinner {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 999px;
  border: 3px solid rgba(31, 122, 88, 0.16);
  border-top-color: #1f7a58;
  animation: archive-spin 0.9s linear infinite;
}

.archive-error {
  position: absolute;
  right: 18px;
  bottom: 18px;
  width: min(460px, calc(100% - 36px));
  box-shadow: 0 16px 36px rgba(23, 32, 51, 0.14);
}

@keyframes archive-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .archive-viewer {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(220px, 38%) minmax(0, 1fr);
  }

  .archive-sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(23, 32, 51, 0.08);
  }
}
</style>

<style>
.archive-nested-content {
  width: 100%;
  height: 100%;
  min-height: 420px;
}
</style>
