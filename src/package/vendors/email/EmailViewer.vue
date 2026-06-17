<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { disposeFileViewerRendered } from '@file-viewer/core'
import type { FileViewerOptions, FileViewerRenderedInstance as Rendered } from '@file-viewer/core'
import { renderNestedBuffer } from '../nestedRender'

type EmailAddress = {
  name?: string;
  address?: string;
}

type EmailAttachmentView = {
  id: string;
  name: string;
  mimeType?: string;
  size: number;
  contentId?: string;
  load(): Promise<ArrayBuffer>;
}

type ParsedEmailView = {
  kind: 'eml' | 'msg' | 'mbox';
  subject: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc: EmailAddress[];
  date?: string;
  text?: string;
  html?: string;
  headers?: string;
  attachments: EmailAttachmentView[];
}

const props = defineProps<{
  data: ArrayBuffer;
  type: 'eml' | 'msg' | 'mbox';
  filename: string;
  options?: FileViewerOptions;
}>()

const parsed = ref<ParsedEmailView | null>(null)
const loading = ref(true)
const loadingText = ref('正在解析邮件...')
const error = ref('')
const activeBody = ref<'html' | 'text' | 'headers'>('html')
const activeAttachment = ref<EmailAttachmentView | null>(null)
const attachmentTarget = ref<HTMLDivElement | null>(null)
const cidUrls = new Map<string, string>()
const objectUrls: string[] = []
let nestedRendered: Rendered | undefined

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return '-'
  }
  if (value < 1024) {
    return `${value} B`
  }
  const mb = value / 1024 / 1024
  if (mb >= 1) {
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
  }
  return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`
}

const normalizeAddress = (value: unknown): EmailAddress[] => {
  if (!value) {
    return []
  }
  const source = Array.isArray(value) ? value : [value]
  return source.flatMap(item => {
    const candidate = item as { name?: string; address?: string; email?: string; group?: EmailAddress[] }
    if (candidate.group) {
      return normalizeAddress(candidate.group)
    }
    return [{
      name: candidate.name || '',
      address: candidate.address || candidate.email || ''
    }]
  })
}

const addressText = (items: EmailAddress[]) => {
  return items
    .map(item => item.name && item.address ? `${item.name} <${item.address}>` : item.address || item.name || '')
    .filter(Boolean)
    .join(', ')
}

const htmlSrcdoc = computed(() => {
  const html = parsed.value?.html || ''
  if (!html) {
    return ''
  }
  let next = html
  cidUrls.forEach((url, cid) => {
    next = next.replace(new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), url)
  })
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{margin:0;padding:18px;font-family:Aptos,"Segoe UI",sans-serif;line-height:1.6;color:#172033;word-break:break-word;}img{max-width:100%;height:auto;}</style></head><body>${next}</body></html>`
})

const bodyModes = computed(() => {
  const modes: Array<{ key: 'html' | 'text' | 'headers'; label: string; disabled: boolean }> = [
    { key: 'html', label: 'HTML', disabled: !parsed.value?.html },
    { key: 'text', label: '正文', disabled: !parsed.value?.text },
    { key: 'headers', label: '头信息', disabled: !parsed.value?.headers }
  ]
  return modes
})

const toArrayBuffer = async (value: ArrayBuffer | Uint8Array | string): Promise<ArrayBuffer> => {
  if (value instanceof ArrayBuffer) {
    return value
  }
  if (value instanceof Uint8Array) {
    const copy = new Uint8Array(value.byteLength)
    copy.set(value)
    return copy.buffer
  }
  return toArrayBuffer(new TextEncoder().encode(value))
}

const parseEml = async (): Promise<ParsedEmailView> => {
  const PostalMime = (await import('postal-mime')).default
  const email = await PostalMime.parse(props.data, {
    attachmentEncoding: 'arraybuffer',
    maxNestingDepth: 24,
    maxHeadersSize: 2 * 1024 * 1024
  })

  const attachments: EmailAttachmentView[] = email.attachments.map((attachment, index) => {
    const size = typeof attachment.content === 'string'
      ? attachment.content.length
      : attachment.content.byteLength
    const name = attachment.filename || `attachment-${index + 1}`
    return {
      id: `${index}-${name}`,
      name,
      mimeType: attachment.mimeType,
      size,
      contentId: attachment.contentId,
      load: () => toArrayBuffer(attachment.content)
    }
  })

  await Promise.all(attachments.map(async attachment => {
    if (!attachment.contentId || !attachment.mimeType?.startsWith('image/')) {
      return
    }
    const buffer = await attachment.load()
    const url = URL.createObjectURL(new Blob([buffer], { type: attachment.mimeType }))
    objectUrls.push(url)
    cidUrls.set(attachment.contentId.replace(/[<>]/g, ''), url)
  }))

  return {
    kind: 'eml',
    subject: email.subject || props.filename,
    from: normalizeAddress(email.from),
    to: normalizeAddress(email.to),
    cc: normalizeAddress(email.cc),
    date: email.date,
    text: email.text,
    html: email.html,
    headers: email.headerLines?.map(item => item.line).join('\n') || email.headers?.map(item => `${item.originalKey}: ${item.value}`).join('\n'),
    attachments
  }
}

const parseMbox = async (): Promise<ParsedEmailView> => {
  const source = new TextDecoder('utf-8', { fatal: false }).decode(props.data)
  const starts = [...source.matchAll(/^From .*$\n/gm)].map(match => match.index || 0)
  const firstStart = starts[0] ?? 0
  const secondStart = starts[1] ?? source.length
  const firstMessage = source.slice(firstStart, secondStart).replace(/^From .*$\n/, '')
  const encoded = new TextEncoder().encode(firstMessage).buffer
  const PostalMime = (await import('postal-mime')).default
  const email = await PostalMime.parse(encoded, {
    attachmentEncoding: 'arraybuffer',
    maxNestingDepth: 24,
    maxHeadersSize: 2 * 1024 * 1024
  })
  const attachments: EmailAttachmentView[] = email.attachments.map((attachment, index) => {
    const size = typeof attachment.content === 'string'
      ? attachment.content.length
      : attachment.content.byteLength
    const name = attachment.filename || `attachment-${index + 1}`
    return {
      id: `${index}-${name}`,
      name,
      mimeType: attachment.mimeType,
      size,
      contentId: attachment.contentId,
      load: () => toArrayBuffer(attachment.content)
    }
  })
  return {
    kind: 'mbox',
    subject: email.subject || `${props.filename} · 第 1 封`,
    from: normalizeAddress(email.from),
    to: normalizeAddress(email.to),
    cc: normalizeAddress(email.cc),
    date: email.date,
    text: `MBOX 共识别 ${Math.max(1, starts.length)} 封邮件，当前展示第 1 封。\n\n${email.text || ''}`,
    html: email.html,
    headers: email.headerLines?.map(item => item.line).join('\n') || email.headers?.map(item => `${item.originalKey}: ${item.value}`).join('\n'),
    attachments
  }
}

const parseMsg = async (): Promise<ParsedEmailView> => {
  const msgReaderModule = await import('@kenjiuno/msgreader')
  const MsgReader = (msgReaderModule.default as any)?.default || msgReaderModule.default
  const reader = new MsgReader(props.data)
  const fileData: any = reader.getFileData()
  const attachments: EmailAttachmentView[] = (fileData.attachments || []).map((attachment: any, index: number) => {
    const name = attachment.fileName || attachment.fileNameShort || attachment.name || `attachment-${index + 1}${attachment.extension || ''}`
    return {
      id: `${index}-${name}`,
      name,
      mimeType: 'application/octet-stream',
      size: attachment.contentLength || attachment.size || 0,
      contentId: attachment.pidContentId,
      async load() {
        const file = reader.getAttachment(attachment)
        return toArrayBuffer(file.content)
      }
    }
  })

  return {
    kind: 'msg',
    subject: fileData.subject || props.filename,
    from: normalizeAddress({ name: fileData.senderName, address: fileData.senderEmail }),
    to: normalizeAddress(fileData.recipients || []).filter(item => item.name || item.address),
    cc: [],
    date: fileData.messageDeliveryTime || fileData.clientSubmitTime || fileData.creationTime,
    text: fileData.body,
    html: fileData.html || '',
    headers: fileData.headers,
    attachments
  }
}

const parseEmail = async () => {
  loading.value = true
  error.value = ''
  try {
    parsed.value = props.type === 'msg' ? await parseMsg() : props.type === 'mbox' ? await parseMbox() : await parseEml()
    activeBody.value = parsed.value.html ? 'html' : parsed.value.text ? 'text' : 'headers'
  } catch (nextError) {
    console.error(nextError)
    error.value = nextError instanceof Error ? nextError.message : String(nextError)
  } finally {
    loading.value = false
  }
}

const clearAttachmentPreview = () => {
  disposeFileViewerRendered(nestedRendered)
  nestedRendered = undefined
  const target = attachmentTarget.value
  if (target) {
    while (target.firstChild) {
      target.removeChild(target.firstChild)
    }
  }
}

const previewAttachment = async (attachment: EmailAttachmentView) => {
  activeAttachment.value = attachment
  loading.value = true
  loadingText.value = `正在打开附件 ${attachment.name}...`
  try {
    const buffer = await attachment.load()
    await nextTick()
    clearAttachmentPreview()
    const target = attachmentTarget.value
    if (!target) {
      return
    }
    const child = document.createElement('div')
    child.className = 'email-attachment-render'
    target.appendChild(child)
    const extension = attachment.name.includes('.') ? attachment.name.slice(attachment.name.lastIndexOf('.') + 1).toLowerCase() : 'txt'
    nestedRendered = await renderNestedBuffer(buffer, extension, child, {
      filename: attachment.name,
      options: props.options
    })
  } catch (nextError) {
    console.error(nextError)
    error.value = nextError instanceof Error ? nextError.message : String(nextError)
  } finally {
    loading.value = false
    loadingText.value = '正在解析邮件...'
  }
}

const downloadAttachment = async (attachment: EmailAttachmentView) => {
  const buffer = await attachment.load()
  const url = URL.createObjectURL(new Blob([buffer], { type: attachment.mimeType || 'application/octet-stream' }))
  objectUrls.push(url)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.name
  document.body.appendChild(link)
  link.click()
  link.remove()
}

onMounted(() => {
  void parseEmail()
})

onBeforeUnmount(() => {
  clearAttachmentPreview()
  objectUrls.forEach(url => URL.revokeObjectURL(url))
})
</script>

<template>
  <section class="email-viewer">
    <header class="email-header">
      <span>{{ parsed?.kind?.toUpperCase() || type.toUpperCase() }}</span>
      <h2>{{ parsed?.subject || filename }}</h2>
      <div v-if="parsed" class="email-meta">
        <p><strong>发件人</strong>{{ addressText(parsed.from) || '-' }}</p>
        <p><strong>收件人</strong>{{ addressText(parsed.to) || '-' }}</p>
        <p v-if="parsed.cc.length"><strong>抄送</strong>{{ addressText(parsed.cc) }}</p>
        <p><strong>时间</strong>{{ parsed.date || '-' }}</p>
      </div>
    </header>

    <div v-if="parsed" class="email-body">
      <aside class="email-sidebar">
        <div class="body-tabs">
          <button
            v-for="mode in bodyModes"
            :key="mode.key"
            type="button"
            :disabled="mode.disabled"
            :class="{ active: activeBody === mode.key }"
            @click="activeBody = mode.key"
          >
            {{ mode.label }}
          </button>
        </div>

        <section class="attachment-panel">
          <div class="attachment-title">
            <strong>附件</strong>
            <span>{{ parsed.attachments.length }}</span>
          </div>
          <button
            v-for="attachment in parsed.attachments"
            :key="attachment.id"
            type="button"
            class="attachment-item"
            :class="{ active: activeAttachment?.id === attachment.id }"
            @click="previewAttachment(attachment)"
          >
            <span>{{ attachment.name.split('.').pop()?.toUpperCase() || 'FILE' }}</span>
            <strong>{{ attachment.name }}</strong>
            <em>{{ formatBytes(attachment.size) }}</em>
          </button>
        </section>
      </aside>

      <main class="message-panel">
        <iframe v-if="activeBody === 'html' && htmlSrcdoc" class="email-html" sandbox="" :srcdoc="htmlSrcdoc" />
        <pre v-else-if="activeBody === 'text'" class="email-text">{{ parsed.text }}</pre>
        <pre v-else class="email-text">{{ parsed.headers }}</pre>

        <section v-if="activeAttachment" class="attachment-preview">
          <div class="attachment-preview-head">
            <strong>{{ activeAttachment.name }}</strong>
            <button type="button" @click="downloadAttachment(activeAttachment)">下载附件</button>
          </div>
          <div ref="attachmentTarget" class="attachment-target" />
        </section>
      </main>
    </div>

    <div v-if="loading" class="email-state">
      <span />
      <strong>{{ loadingText }}</strong>
    </div>

    <div v-if="error" class="email-error">
      <strong>邮件预览提示</strong>
      <p>{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.email-viewer {
  position: relative;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f3f6f8;
  color: #172033;
}

.email-header {
  padding: 18px 22px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.08);
  background: #ffffff;
}

.email-header > span {
  color: #1f7a58;
  font-size: 12px;
  font-weight: 900;
}

.email-header h2 {
  margin: 4px 0 12px;
  font-size: 22px;
  line-height: 1.25;
}

.email-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
}

.email-meta p {
  margin: 0;
  color: #526275;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email-meta strong {
  margin-right: 8px;
  color: #172033;
}

.email-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
}

.email-sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border-right: 1px solid rgba(23, 32, 51, 0.08);
  background: rgba(255, 255, 255, 0.7);
}

.body-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(23, 32, 51, 0.06);
}

.body-tabs button,
.attachment-item,
.attachment-preview-head button {
  font: inherit;
  cursor: pointer;
}

.body-tabs button {
  height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.body-tabs button.active {
  background: #ffffff;
  color: #172033;
}

.body-tabs button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.attachment-panel {
  min-height: 0;
  overflow: auto;
}

.attachment-title {
  display: flex;
  justify-content: space-between;
  color: #172033;
  font-size: 14px;
  margin-bottom: 8px;
}

.attachment-title span {
  color: #64748b;
}

.attachment-item {
  width: 100%;
  min-height: 62px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
  padding: 9px;
  border: 1px solid rgba(23, 32, 51, 0.08);
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
}

.attachment-item:hover,
.attachment-item.active {
  border-color: rgba(31, 122, 88, 0.28);
  box-shadow: 0 10px 22px rgba(23, 32, 51, 0.08);
}

.attachment-item span {
  grid-row: span 2;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(31, 122, 88, 0.12);
  color: #1f7a58;
  font-size: 11px;
  font-weight: 900;
}

.attachment-item strong,
.attachment-item em {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-item em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.message-panel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(240px, 46%) minmax(0, 1fr);
}

.email-html,
.email-text {
  width: 100%;
  height: 100%;
  border: 0;
  background: #ffffff;
}

.email-text {
  margin: 0;
  overflow: auto;
  padding: 20px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.65;
}

.attachment-preview {
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(23, 32, 51, 0.08);
}

.attachment-preview-head {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.78);
}

.attachment-preview-head button {
  height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 9px;
  background: #1f7a58;
  color: #ffffff;
  font-weight: 800;
}

.attachment-target {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.email-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(243, 246, 248, 0.86);
}

.email-state span {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 3px solid rgba(31, 122, 88, 0.16);
  border-top-color: #1f7a58;
  animation: email-spin 0.9s linear infinite;
}

.email-error {
  position: absolute;
  right: 18px;
  bottom: 18px;
  width: min(460px, calc(100% - 36px));
  padding: 14px;
  border-radius: 14px;
  background: #fff7e8;
  color: #8a4b00;
  box-shadow: 0 16px 36px rgba(23, 32, 51, 0.14);
}

@keyframes email-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .email-meta,
  .email-body {
    grid-template-columns: 1fr;
  }

  .email-body {
    grid-template-rows: auto minmax(0, 1fr);
  }

  .email-sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(23, 32, 51, 0.08);
  }
}
</style>

<style>
.email-attachment-render {
  width: 100%;
  height: 100%;
  min-height: 320px;
}
</style>
