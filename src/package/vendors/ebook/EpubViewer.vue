<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Book, Rendition } from 'epubjs'

const props = defineProps<{
  data: ArrayBuffer
}>()

type EpubLocation = {
  atEnd?: boolean
  atStart?: boolean
  start?: {
    href?: string
    percentage?: number
  }
}

type TocItem = {
  depth: number
  href: string
  id: string
  label: string
}

const stage = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const tocOpen = ref(true)
const title = ref('EPUB 电子书')
const author = ref('')
const tocItems = ref<TocItem[]>([])
const currentHref = ref('')
const progress = ref<number | null>(null)
const atStart = ref(true)
const atEnd = ref(false)

let book: Book | undefined
let rendition: Rendition | undefined
let disposed = false
let renderCheckTimer: number | undefined

const currentChapter = computed(() => {
  if (!currentHref.value) {
    return ''
  }
  const exact = tocItems.value.find(item => item.href === currentHref.value)
  if (exact) {
    return exact.label
  }
  const matched = tocItems.value.find(item => currentHref.value.includes(item.href.split('#')[0]))
  return matched?.label || ''
})

const progressLabel = computed(() => {
  if (typeof progress.value === 'number') {
    return `${progress.value}%`
  }
  return currentChapter.value || '阅读中'
})

const normalizeLabel = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  return fallback
}

const flattenToc = (items: unknown, depth = 0): TocItem[] => {
  if (!Array.isArray(items)) {
    return []
  }
  return items.flatMap((item, index) => {
    const node = item as Record<string, unknown>
    const href = typeof node.href === 'string' ? node.href : ''
    const label = normalizeLabel(node.label || node.title, `章节 ${index + 1}`)
    const subitems = flattenToc(node.subitems || node.children, depth + 1)
    if (!href) {
      return subitems
    }
    return [{
      depth,
      href,
      id: `${depth}-${index}-${href}`,
      label
    }, ...subitems]
  })
}

const pickInitialHref = (items: TocItem[]) => {
  const chapterLike = items.find(item => {
    const label = item.label.toLowerCase()
    return /(^|\s)(chapter|part|book|prologue|preface|introduction)\b/.test(label) ||
      /第[一二三四五六七八九十百千0-9]+[章节回部卷篇]/.test(item.label)
  })
  if (chapterLike) {
    return chapterLike.href
  }

  const readable = items.find(item => {
    const text = `${item.label} ${item.href}`.toLowerCase()
    return !/(cover|titlepage|title-page|copyright|license|toc|contents|nav|table-of-contents|wrap0000)/.test(text)
  })
  return readable?.href || items[0]?.href
}

const updateLocation = (location: EpubLocation) => {
  atStart.value = Boolean(location?.atStart)
  atEnd.value = Boolean(location?.atEnd)
  currentHref.value = location?.start?.href || ''
  if (typeof location?.start?.percentage === 'number') {
    progress.value = Math.round(location.start.percentage * 100)
  }
}

const wait = (ms: number) => new Promise(resolve => {
  renderCheckTimer = window.setTimeout(resolve, ms)
})

const hasReadableFrame = () => {
  const iframe = stage.value?.querySelector('iframe') as HTMLIFrameElement | null
  const body = iframe?.contentDocument?.body
  if (!body) {
    return false
  }
  return Boolean(body.innerText.trim() || body.querySelector('img, svg, canvas'))
}

const waitForReadableFrame = async () => {
  for (let i = 0; i < 20; i++) {
    if (disposed || hasReadableFrame()) {
      return hasReadableFrame()
    }
    await wait(100)
  }
  return hasReadableFrame()
}

const openBook = async () => {
  status.value = 'loading'
  await nextTick()
  const el = stage.value
  if (!el) {
    return
  }

  try {
    const { default: ePub } = await import('epubjs')
    if (disposed) {
      return
    }

    // EPUB 解析和分页能力来自 epubjs，只在命中 .epub 时进入该异步块。
    book = ePub(props.data.slice(0), {
      openAs: 'binary',
      replacements: 'blobUrl'
    })

    rendition = book.renderTo(el, {
      allowScriptedContent: false,
      flow: 'scrolled',
      height: '100%',
      manager: 'continuous',
      resizeOnOrientationChange: true,
      spread: 'none',
      width: '100%'
    })

    rendition.themes.default({
      body: {
        color: '#172033',
        fontFamily: 'Georgia, "Times New Roman", serif',
        lineHeight: '1.72',
        padding: '0 8px'
      },
      img: {
        maxWidth: '100%'
      },
      html: {
        height: 'auto',
        overflow: 'auto'
      }
    })
    rendition.on('relocated', updateLocation)

    await book.ready
    const metadata = await book.loaded.metadata.catch(() => undefined)
    title.value = normalizeLabel(metadata?.title, title.value)
    author.value = normalizeLabel(metadata?.creator, '')

    const navigation = await book.loaded.navigation.catch(() => undefined)
    tocItems.value = flattenToc((navigation as { toc?: unknown })?.toc)

    // 许多 EPUB 的第一个 spine 是封面或空白包装页。默认跳到目录里第一个正文节点，
    // 避免用户打开后只看到空白封面容器，误以为正文没有渲染。
    const initialHref = pickInitialHref(tocItems.value)
    await rendition.display(initialHref)
    if (!await waitForReadableFrame()) {
      throw new Error('EPUB 正文渲染未完成，请刷新后重试')
    }
    if (disposed) {
      return
    }
    status.value = 'ready'

    // 生成位置索引失败不影响阅读，只会退回章节名作为进度提示。
    void book.locations.generate(1200).catch(() => undefined)
  } catch (error) {
    console.error(error)
    errorMessage.value = error instanceof Error ? error.message : String(error)
    status.value = 'error'
  }
}

const goPrev = async () => {
  await rendition?.prev()
}

const goNext = async () => {
  await rendition?.next()
}

const displayChapter = async (item: TocItem) => {
  await rendition?.display(item.href)
  tocOpen.value = false
}

onMounted(openBook)

onBeforeUnmount(() => {
  disposed = true
  if (renderCheckTimer !== undefined) {
    clearTimeout(renderCheckTimer)
    renderCheckTimer = undefined
  }
  if (rendition) {
    rendition.off('relocated', updateLocation)
    rendition.destroy()
    rendition = undefined
  }
  book?.destroy()
  book = undefined
})
</script>

<template>
  <div class='epub-viewer' :class="{ 'epub-viewer--toc-hidden': !tocOpen }">
    <div class='epub-toolbar'>
      <button
        type='button'
        class='epub-icon-button'
        :class="{ active: tocOpen }"
        title='目录'
        @click='tocOpen = !tocOpen'
      >
        <span />
      </button>
      <div class='epub-title'>
        <strong>{{ title }}</strong>
        <span>{{ author || progressLabel }}</span>
      </div>
      <div class='epub-actions'>
        <button type='button' class='epub-button' :disabled='status !== "ready" || atStart' @click='goPrev'>
          上一页
        </button>
        <span class='epub-progress'>{{ progressLabel }}</span>
        <button type='button' class='epub-button' :disabled='status !== "ready" || atEnd' @click='goNext'>
          下一页
        </button>
      </div>
    </div>

    <div class='epub-body'>
      <aside v-if='tocOpen' class='epub-toc'>
        <div class='epub-toc-head'>
          <strong>目录</strong>
          <span>{{ tocItems.length }} 项</span>
        </div>
        <div class='epub-toc-list'>
          <button
            v-for='item in tocItems'
            :key='item.id'
            type='button'
            class='epub-toc-item'
            :class='{ active: item.href === currentHref }'
            :style='{ paddingLeft: `${12 + item.depth * 14}px` }'
            @click='displayChapter(item)'
          >
            {{ item.label }}
          </button>
        </div>
      </aside>

      <main class='epub-stage-wrap'>
        <div ref='stage' class='epub-stage' />
        <div v-if='status === "loading"' class='epub-state'>正在解析 EPUB...</div>
        <div v-else-if='status === "error"' class='epub-state error'>{{ errorMessage }}</div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.epub-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #eef1f4;
  color: #172033;
}

.epub-toolbar {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.92);
}

.epub-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.epub-title strong,
.epub-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.epub-title strong {
  font-size: 14px;
}

.epub-title span {
  color: #64748b;
  font-size: 12px;
}

.epub-icon-button,
.epub-button {
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  color: #172033;
  font: inherit;
  cursor: pointer;
}

.epub-icon-button {
  width: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.epub-icon-button span,
.epub-icon-button span::before,
.epub-icon-button span::after {
  width: 16px;
  height: 2px;
  display: block;
  border-radius: 999px;
  background: currentColor;
}

.epub-icon-button span {
  position: relative;
}

.epub-icon-button span::before,
.epub-icon-button span::after {
  content: '';
  position: absolute;
  left: 0;
}

.epub-icon-button span::before {
  top: -5px;
}

.epub-icon-button span::after {
  top: 5px;
}

.epub-icon-button.active {
  border-color: rgba(37, 99, 235, 0.24);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.epub-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.epub-button {
  min-width: 68px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}

.epub-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.epub-progress {
  min-width: 58px;
  color: #64748b;
  font-size: 12px;
  text-align: center;
}

.epub-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
}

.epub-viewer--toc-hidden .epub-body {
  grid-template-columns: minmax(0, 1fr);
}

.epub-toc {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.8);
}

.epub-toc-head {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 12px;
  color: #172033;
  font-size: 13px;
}

.epub-toc-head span {
  color: #64748b;
}

.epub-toc-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 8px 10px;
}

.epub-toc-item {
  width: 100%;
  min-height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.epub-toc-item:hover,
.epub-toc-item.active {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.epub-stage-wrap {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 18px;
  overflow: hidden;
}

.epub-stage {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 8px;
  background: #ffffff;
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.12),
    inset 0 0 0 1px rgba(15, 23, 42, 0.06);
}

.epub-stage :deep(.epub-container) {
  width: 100% !important;
  max-width: 100%;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}

.epub-stage :deep(iframe) {
  max-width: 100%;
}

.epub-state {
  position: absolute;
  inset: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #64748b;
  font-size: 14px;
}

.epub-state.error {
  color: #b42318;
}

@media (max-width: 720px) {
  .epub-toolbar {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .epub-actions {
    grid-column: 1 / -1;
    justify-content: space-between;
  }

  .epub-body {
    position: relative;
    grid-template-columns: minmax(0, 1fr);
  }

  .epub-toc {
    position: absolute;
    z-index: 5;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(82vw, 280px);
    box-shadow: 18px 0 40px rgba(15, 23, 42, 0.16);
  }

  .epub-stage-wrap {
    padding: 12px;
  }
}
</style>
