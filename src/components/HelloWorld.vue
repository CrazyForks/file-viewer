<script setup lang='ts'>
import { computed, onMounted, ref } from 'vue'
import { listenForFile } from '@/components/utils'
import type { FileRef } from '@/package/common/type'
import brandLogo from '@/assets/logo.png'

const hidden = ref(false)
const input = ref(true)
const filename = ref('')
const file = ref<FileRef | undefined>()
const url = ref('/example/word.docx')
const preview = ref('')
const samplePickerOpen = ref(false)

const presetFiles = [
  { name: 'DOC', url: '/example/test.doc' },
  { name: 'DOCX', url: '/example/word.docx' },
  { name: 'XLSX', url: '/example/excel.xlsx' },
  { name: 'XLSM', url: '/example/excel.xlsm' },
  { name: 'XLSB', url: '/example/excel.xlsb' },
  { name: 'XLS', url: '/example/excel.xls' },
  { name: 'CSV', url: '/example/table.csv' },
  { name: 'ODS', url: '/example/excel.ods' },
  { name: 'FODS', url: '/example/excel.fods' },
  { name: 'Numbers', url: '/example/excel.numbers' },
  { name: 'PPTX', url: '/example/ppt.pptx' },
  { name: 'PDF', url: '/example/pdf.pdf' },
  { name: 'OFD', url: '/example/ofd.ofd' },
  { name: 'DXF', url: '/example/drawing.dxf' },
  { name: 'DWG', url: '/example/sample.dwg' },
  { name: 'MD', url: '/example/markdown.md' },
  { name: 'MARKDOWN', url: '/example/notes.markdown' },
  { name: 'TXT', url: '/example/text.txt' },
  { name: 'JSON', url: '/example/data.json' },
  { name: 'JS', url: '/example/code.js' },
  { name: 'MJS', url: '/example/code.mjs' },
  { name: 'CJS', url: '/example/code.cjs' },
  { name: 'TS', url: '/example/code.ts' },
  { name: 'TSX', url: '/example/code.tsx' },
  { name: 'JSX', url: '/example/code.jsx' },
  { name: 'CSS', url: '/example/code.css' },
  { name: 'HTML', url: '/example/page.html' },
  { name: 'HTM', url: '/example/page.htm' },
  { name: 'XML', url: '/example/data.xml' },
  { name: 'VUE', url: '/example/component.vue' },
  { name: 'YAML', url: '/example/config.yaml' },
  { name: 'YML', url: '/example/config.yml' },
  { name: 'INI', url: '/example/settings.ini' },
  { name: 'SH', url: '/example/script.sh' },
  { name: 'BASH', url: '/example/script.bash' },
  { name: 'SQL', url: '/example/query.sql' },
  { name: 'GO', url: '/example/main.go' },
  { name: 'RS', url: '/example/main.rs' },
  { name: 'PHP', url: '/example/index.php' },
  { name: 'C', url: '/example/main.c' },
  { name: 'CPP', url: '/example/main.cpp' },
  { name: 'CC', url: '/example/module.cc' },
  { name: 'H', url: '/example/main.h' },
  { name: 'HPP', url: '/example/main.hpp' },
  { name: 'CS', url: '/example/program.cs' },
  { name: 'DIFF', url: '/example/change.diff' },
  { name: 'Java', url: '/example/code.java' },
  { name: 'Python', url: '/example/code.py' },
  { name: 'Log', url: '/example/app.log' },
  { name: 'PNG', url: '/example/pic.png' },
  { name: 'JPG', url: '/example/pic.jpg' },
  { name: 'JPEG', url: '/example/pic.jpeg' },
  { name: 'GIF', url: '/example/pic.gif' },
  { name: 'BMP', url: '/example/pic.bmp' },
  { name: 'TIFF', url: '/example/pic.tiff' },
  { name: 'TIF', url: '/example/pic.tif' },
  { name: 'SVG', url: '/example/vector.svg' },
  { name: 'WEBP', url: '/example/pic.webp' },
  { name: 'MP4', url: '/example/video.mp4' }
]

const uploadAccept = presetFiles
  .map(item => {
    const ext = item.url.split('.').pop()
    return ext ? `.${ext}` : ''
  })
  .filter(Boolean)
  .join(',')

const fileIconMeta: Record<string, { icon: string; family: string }> = {
  doc: { icon: 'W', family: 'word' },
  docx: { icon: 'W', family: 'word' },
  xlsx: { icon: 'XL', family: 'sheet' },
  xlsm: { icon: 'XL', family: 'sheet' },
  xlsb: { icon: 'XL', family: 'sheet' },
  xls: { icon: 'XL', family: 'sheet' },
  csv: { icon: 'CSV', family: 'sheet' },
  ods: { icon: 'ODS', family: 'sheet' },
  fods: { icon: 'ODS', family: 'sheet' },
  numbers: { icon: 'NO', family: 'sheet' },
  pptx: { icon: 'P', family: 'slide' },
  pdf: { icon: 'PDF', family: 'pdf' },
  ofd: { icon: 'OFD', family: 'layout' },
  dxf: { icon: 'CAD', family: 'cad' },
  dwg: { icon: 'CAD', family: 'cad' },
  md: { icon: 'MD', family: 'text' },
  markdown: { icon: 'MD', family: 'text' },
  txt: { icon: 'TXT', family: 'text' },
  json: { icon: '{}', family: 'code' },
  js: { icon: 'JS', family: 'code' },
  mjs: { icon: 'JS', family: 'code' },
  cjs: { icon: 'JS', family: 'code' },
  ts: { icon: 'TS', family: 'code' },
  tsx: { icon: 'TSX', family: 'code' },
  jsx: { icon: 'JSX', family: 'code' },
  css: { icon: 'CSS', family: 'code' },
  html: { icon: 'HTML', family: 'code' },
  htm: { icon: 'HTML', family: 'code' },
  xml: { icon: 'XML', family: 'code' },
  vue: { icon: 'VUE', family: 'code' },
  yaml: { icon: 'YML', family: 'code' },
  yml: { icon: 'YML', family: 'code' },
  ini: { icon: 'INI', family: 'code' },
  sh: { icon: 'SH', family: 'code' },
  bash: { icon: 'SH', family: 'code' },
  sql: { icon: 'SQL', family: 'code' },
  go: { icon: 'GO', family: 'code' },
  rs: { icon: 'RS', family: 'code' },
  php: { icon: 'PHP', family: 'code' },
  c: { icon: 'C', family: 'code' },
  cpp: { icon: 'C++', family: 'code' },
  cc: { icon: 'C++', family: 'code' },
  h: { icon: 'H', family: 'code' },
  hpp: { icon: 'H++', family: 'code' },
  cs: { icon: 'CS', family: 'code' },
  diff: { icon: 'DIFF', family: 'code' },
  java: { icon: 'JV', family: 'code' },
  py: { icon: 'PY', family: 'code' },
  log: { icon: 'LOG', family: 'text' },
  png: { icon: 'IMG', family: 'image' },
  jpg: { icon: 'IMG', family: 'image' },
  jpeg: { icon: 'IMG', family: 'image' },
  gif: { icon: 'GIF', family: 'image' },
  bmp: { icon: 'IMG', family: 'image' },
  tiff: { icon: 'IMG', family: 'image' },
  tif: { icon: 'IMG', family: 'image' },
  svg: { icon: 'SVG', family: 'image' },
  webp: { icon: 'WEBP', family: 'image' },
  mp4: { icon: 'MP4', family: 'video' }
}

const extensionOf = (target: string) => {
  const clean = target.split(/[?#]/)[0] || target
  const dotIndex = clean.lastIndexOf('.')
  return dotIndex === -1 ? '' : clean.slice(dotIndex + 1).toLowerCase()
}

const fileNameOf = (target: string) => {
  const clean = target.split(/[?#]/)[0] || target
  return decodeURIComponent(clean.split('/').pop() || target)
}

const getFileIconMeta = (target: string) => {
  return fileIconMeta[extensionOf(target)] || { icon: 'FILE', family: 'generic' }
}

const activePreset = computed(() => {
  return presetFiles.find(item => item.url === url.value)
})

const activeIconMeta = computed(() => {
  return getFileIconMeta(activePreset.value?.url || url.value)
})

const displayMode = computed(() => {
  return file.value ? '本地' : '链接'
})

const displayName = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  if (preview.value) {
    const name = preview.value.split('/').pop() || preview.value
    return decodeURIComponent(name)
  }
  return activePreset.value?.name || '未选择文件'
})

const displayPath = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  return preview.value || url.value || ''
})

const previewType = computed(() => {
  const name = displayName.value
  const ext = extensionOf(name)
  if (!ext) {
    return 'AUTO'
  }
  return ext.toUpperCase()
})

listenForFile((body, target) => {
  hidden.value = true
  if (body) {
    filename.value = body.name && decodeURIComponent(body.name) || ''
    file.value = body
  }
  if (target) {
    url.value = target
    preview.value = target
  }
})

onMounted(() => {
  openUrlPreview(url.value)
})

function openUrlPreview(nextUrl = url.value) {
  input.value = true
  file.value = undefined
  preview.value = nextUrl
  samplePickerOpen.value = false
}

function setInputMode(nextMode: boolean) {
  input.value = nextMode
  samplePickerOpen.value = false
}

async function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  const value = target.files?.item(0)
  if (!value) {
    return
  }
  input.value = false
  samplePickerOpen.value = false
  filename.value = value.name && decodeURIComponent(value.name) || ''
  file.value = value
}

function toggleSamplePicker() {
  samplePickerOpen.value = !samplePickerOpen.value
}

function selectPreset(nextUrl: string) {
  url.value = nextUrl
  samplePickerOpen.value = false
  openUrlPreview(nextUrl)
}
</script>

<template>
  <div class='demo-shell' :class='{ hidden }'>
    <main class='workspace'>
      <div v-if='!hidden' class='layout-shell'>
        <aside class='control-panel'>
          <div class='brand-card'>
            <span class='brand-orbit' />
            <div class='brand-main'>
              <span class='brand-mark'>
                <img :src='brandLogo' alt='File Viewer' />
              </span>
              <div class='brand-copy'>
                <span>FlyFish</span>
                <h1>File Viewer</h1>
              </div>
            </div>
            <span class='brand-pill'>Pure Web</span>
          </div>

          <div class='current-card'>
            <span class='current-badge'>{{ previewType }}</span>
            <div class='current-copy'>
              <span>{{ displayMode }}</span>
              <strong>{{ displayName }}</strong>
            </div>
          </div>

          <div class='panel-body'>
            <div class='mode-switch'>
              <button
                type='button'
                class='mode-button'
                :class='{ active: input }'
                @click='setInputMode(true)'
              >
                链接
              </button>
              <button
                type='button'
                class='mode-button'
                :class='{ active: !input }'
                @click='setInputMode(false)'
              >
                上传
              </button>
            </div>

            <template v-if='input'>
              <div class='sample-picker' :class='{ open: samplePickerOpen }'>
                <button
                  type='button'
                  class='sample-trigger'
                  :aria-expanded='samplePickerOpen'
                  @click='toggleSamplePicker'
                >
                  <span class='sample-file-icon' :data-family='activeIconMeta.family'>
                    <span>{{ activeIconMeta.icon }}</span>
                  </span>
                  <span class='sample-trigger-copy'>
                    <span>示例文件</span>
                    <strong>{{ activePreset?.name || fileNameOf(url) }}</strong>
                    <em>{{ activePreset ? fileNameOf(activePreset.url) : url }}</em>
                  </span>
                  <span class='sample-trigger-action'>{{ samplePickerOpen ? '收起' : '打开' }}</span>
                </button>

                <div v-if='samplePickerOpen' class='sample-menu'>
                  <button
                    v-for='item in presetFiles'
                    :key='item.url'
                    type='button'
                    class='sample-card'
                    :class='{ active: !file && url === item.url }'
                    @click='selectPreset(item.url)'
                  >
                    <span class='sample-file-icon' :data-family='getFileIconMeta(item.url).family'>
                      <span>{{ getFileIconMeta(item.url).icon }}</span>
                    </span>
                    <span class='sample-card-copy'>
                      <strong>{{ item.name }}</strong>
                      <span>{{ fileNameOf(item.url) }}</span>
                    </span>
                  </button>
                </div>
              </div>

              <div class='field-group'>
                <label class='field-label'>地址</label>
                <input
                  v-model='url'
                  class='compact-field'
                  type='text'
                  placeholder='输入文件地址'
                  @keyup.enter='openUrlPreview()'
                />
              </div>

              <button type='button' class='primary-button' @click='openUrlPreview()'>
                预览
              </button>
            </template>

            <template v-else>
              <label class='upload-card'>
                <input type='file' :accept='uploadAccept' @change='handleChange' />
                <span class='upload-icon'>+</span>
                <span class='upload-title'>点击选择文件</span>
                <strong>{{ filename || '从本机打开' }}</strong>
              </label>
            </template>
          </div>
        </aside>

        <section class='viewer-panel'>
          <div class='viewer-toolbar'>
            <div class='viewer-copy'>
              <span class='viewer-status' />
              <strong>{{ displayName }}</strong>
              <span class='viewer-type'>{{ previewType }}</span>
            </div>
            <div class='viewer-path'>{{ displayPath }}</div>
          </div>

          <div class='viewport'>
            <file-viewer :file='file' :url='preview' />
          </div>
        </section>
      </div>

      <section v-else class='viewer-panel standalone'>
        <div class='viewport'>
          <file-viewer :file='file' :url='preview' />
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.demo-shell {
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 12%, rgba(37, 171, 111, 0.22), transparent 28%),
    radial-gradient(circle at 86% 0%, rgba(43, 126, 238, 0.16), transparent 24%),
    linear-gradient(135deg, #f6f9f5 0%, #eef4f0 46%, #f8faf6 100%);
  color: #142335;
}

.workspace {
  height: 100%;
  padding: 16px;
}

.layout-shell {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(276px, 320px) minmax(0, 1fr);
  gap: 16px;
}

.control-panel,
.viewer-panel {
  min-height: 0;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 22px 60px rgba(18, 35, 50, 0.1);
  backdrop-filter: blur(22px);
}

.control-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
  gap: 12px;
}

.brand-card {
  position: relative;
  min-height: 144px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(19, 42, 57, 0.94), rgba(17, 91, 65, 0.9)),
    radial-gradient(circle at top right, rgba(94, 255, 182, 0.38), transparent 42%);
  color: #ffffff;
  box-shadow: 0 18px 36px rgba(14, 80, 59, 0.18);
}

.brand-orbit {
  position: absolute;
  width: 138px;
  height: 138px;
  right: -52px;
  top: -42px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
}

.brand-orbit::before {
  content: '';
  position: absolute;
  inset: 28px;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.brand-main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
}

.brand-mark img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.brand-copy span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.brand-copy h1 {
  margin: 0;
  font-size: 27px;
  line-height: 1;
  letter-spacing: 0;
}

.brand-pill {
  position: relative;
  align-self: flex-start;
  display: inline-flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.current-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(20, 35, 53, 0.06);
}

.current-badge {
  display: inline-flex;
  width: 50px;
  height: 44px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: rgba(33, 163, 102, 0.12);
  color: #16804f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.current-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.current-copy span {
  color: #7c8b9a;
  font-size: 12px;
}

.current-copy strong {
  color: #142335;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mode-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 4px;
  border-radius: 18px;
  background: rgba(20, 35, 53, 0.06);
}

.mode-button,
.compact-field,
.primary-button,
.sample-trigger,
.sample-card {
  font: inherit;
}

.mode-button,
.primary-button,
.sample-trigger,
.sample-card {
  border: 0;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.mode-button:hover,
.primary-button:hover,
.sample-trigger:hover,
.sample-card:hover {
  transform: translateY(-1px);
}

.mode-button {
  min-height: 40px;
  border-radius: 14px;
  background: transparent;
  color: #718193;
  font-weight: 700;
}

.mode-button.active {
  background: #ffffff;
  color: #142335;
  box-shadow: 0 8px 18px rgba(18, 35, 55, 0.08);
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 2px 4px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.field-label {
  color: #718193;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.compact-field {
  min-height: 46px;
  padding: 0 14px;
  border-radius: 17px;
  border: 1px solid rgba(20, 35, 53, 0.08);
  background: rgba(255, 255, 255, 0.86);
  color: #142335;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.compact-field:focus {
  border-color: rgba(33, 163, 102, 0.36);
  box-shadow: 0 0 0 4px rgba(33, 163, 102, 0.1);
}

.sample-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sample-trigger {
  width: 100%;
  min-height: 70px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 11px;
  border-radius: 17px;
  border: 1px solid rgba(20, 35, 53, 0.08);
  background: rgba(255, 255, 255, 0.88);
  color: #142335;
  text-align: left;
}

.sample-picker.open .sample-trigger,
.sample-trigger:hover {
  border-color: rgba(43, 126, 238, 0.24);
  box-shadow: 0 14px 28px rgba(18, 35, 55, 0.08);
}

.sample-trigger-copy,
.sample-card-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sample-trigger-copy {
  gap: 4px;
}

.sample-trigger-copy span {
  color: #718193;
  font-size: 12px;
  font-weight: 700;
}

.sample-trigger-copy strong {
  color: #142335;
  font-size: 15px;
  line-height: 1.1;
}

.sample-trigger-copy em {
  color: #718193;
  font-size: 12px;
  font-style: normal;
}

.sample-trigger-copy strong,
.sample-trigger-copy em,
.sample-card-copy strong,
.sample-card-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sample-trigger-action {
  min-width: 42px;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(43, 126, 238, 0.1);
  color: #2668c9;
  font-size: 12px;
  font-weight: 800;
}

.sample-menu {
  max-height: min(42vh, 348px);
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
  padding: 9px;
  border-radius: 16px;
  border: 1px solid rgba(20, 35, 53, 0.08);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.68);
}

.sample-card {
  min-width: 0;
  min-height: 70px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(20, 35, 53, 0.08);
  background: rgba(247, 250, 252, 0.8);
  color: #142335;
  text-align: left;
}

.sample-card.active {
  border-color: rgba(33, 163, 102, 0.34);
  background: rgba(33, 163, 102, 0.1);
  box-shadow: 0 8px 20px rgba(33, 163, 102, 0.12);
}

.sample-card-copy {
  gap: 3px;
}

.sample-card-copy strong {
  color: #142335;
  font-size: 13px;
  line-height: 1.1;
}

.sample-card-copy span {
  color: #718193;
  font-size: 11px;
}

.sample-file-icon {
  position: relative;
  width: 36px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 4px 7px;
  border-radius: 7px;
  background: linear-gradient(145deg, #d9e4f2, #f8fbff);
  color: #2f4157;
  box-shadow: inset 0 0 0 1px rgba(20, 35, 53, 0.1);
}

.sample-trigger .sample-file-icon {
  width: 42px;
  height: 50px;
}

.sample-file-icon::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 13px;
  height: 13px;
  border-radius: 0 7px 0 6px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: -1px 1px 0 rgba(20, 35, 53, 0.08);
}

.sample-file-icon span {
  position: relative;
  z-index: 1;
  max-width: 100%;
  color: currentColor;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}

.sample-file-icon[data-family='word'] {
  background: linear-gradient(145deg, #d9e9ff, #ffffff);
  color: #245bb7;
}

.sample-file-icon[data-family='sheet'] {
  background: linear-gradient(145deg, #daf7e8, #ffffff);
  color: #16804f;
}

.sample-file-icon[data-family='slide'] {
  background: linear-gradient(145deg, #ffe8d2, #ffffff);
  color: #bf5b14;
}

.sample-file-icon[data-family='pdf'] {
  background: linear-gradient(145deg, #ffe1e1, #ffffff);
  color: #bf2a2a;
}

.sample-file-icon[data-family='layout'] {
  background: linear-gradient(145deg, #e8e1ff, #ffffff);
  color: #6940c6;
}

.sample-file-icon[data-family='cad'] {
  background: linear-gradient(145deg, #d8f3f5, #ffffff);
  color: #0e7490;
}

.sample-file-icon[data-family='code'] {
  background: linear-gradient(145deg, #dde7f1, #ffffff);
  color: #334155;
}

.sample-file-icon[data-family='text'] {
  background: linear-gradient(145deg, #eef1d7, #ffffff);
  color: #6b7a1f;
}

.sample-file-icon[data-family='image'] {
  background: linear-gradient(145deg, #ffe0f1, #ffffff);
  color: #be2776;
}

.sample-file-icon[data-family='video'] {
  background: linear-gradient(145deg, #e0e7ff, #ffffff);
  color: #4338ca;
}

.primary-button {
  min-height: 48px;
  border-radius: 17px;
  background: linear-gradient(135deg, #168757 0%, #2bc87e 100%);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 16px 28px rgba(33, 163, 102, 0.2);
}

.upload-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
  padding: 18px;
  border-radius: 20px;
  border: 1px solid rgba(33, 163, 102, 0.2);
  background:
    radial-gradient(circle at top right, rgba(33, 163, 102, 0.14), transparent 42%),
    rgba(255, 255, 255, 0.86);
  overflow: hidden;
  cursor: pointer;
}

.upload-card input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(33, 163, 102, 0.12);
  color: #16804f;
  font-size: 24px;
  font-weight: 500;
}

.upload-title {
  color: #16804f;
  font-size: 13px;
  font-weight: 700;
}

.upload-card strong {
  max-width: 100%;
  color: #142335;
  font-size: 15px;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewer-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(20, 35, 53, 0.06);
}

.viewer-copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.viewer-status {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  border-radius: 999px;
  background: #21a366;
  box-shadow: 0 0 0 5px rgba(33, 163, 102, 0.12);
}

.viewer-copy strong {
  min-width: 0;
  max-width: 44vw;
  color: #142335;
  font-size: 15px;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-type {
  flex-shrink: 0;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(20, 35, 53, 0.06);
  color: #718193;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.viewer-path {
  min-width: 0;
  color: #718193;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.viewport {
  flex: 1;
  min-height: 0;
  padding: 10px;
}

.viewport :deep(.file-viewer) {
  height: 100%;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(20, 35, 53, 0.06);
}

.standalone {
  height: 100%;
}

.hidden .workspace {
  height: 100%;
  padding: 0;
}

.hidden .viewer-panel {
  height: 100%;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: #ffffff;
}

.hidden .viewport {
  padding: 0;
}

.hidden .viewport :deep(.file-viewer) {
  border-radius: 0;
  box-shadow: none;
}

@media (max-width: 1100px) {
  .layout-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .control-panel {
    max-height: 42vh;
    display: grid;
    grid-template-columns: minmax(230px, 0.9fr) minmax(240px, 1fr);
    align-items: stretch;
  }

  .current-card {
    display: none;
  }

  .panel-body {
    overflow: auto;
  }
}

@media (max-width: 720px) {
  .workspace {
    padding: 12px;
  }

  .viewer-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .viewer-path {
    width: 100%;
  }

  .control-panel {
    display: flex;
    max-height: 48vh;
  }

  .brand-card {
    min-height: 96px;
    padding: 14px;
  }

  .brand-copy h1 {
    font-size: 23px;
  }

  .brand-pill {
    display: none;
  }

  .panel-body {
    gap: 10px;
  }

  .compact-field,
  .primary-button {
    min-height: 42px;
  }
}
</style>
