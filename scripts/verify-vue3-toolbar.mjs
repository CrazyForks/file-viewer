import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const coreEntry = resolve('packages/core/dist/index.js')
const coreMessagesEntry = resolve('packages/core/dist/i18n/messages.js')
const vueEntry = resolve('packages/components/vue3/dist/index.mjs')

assert.ok(existsSync(coreEntry), `Missing built core entry: ${coreEntry}`)
assert.ok(existsSync(coreMessagesEntry), `Missing built core messages entry: ${coreMessagesEntry}`)
assert.ok(existsSync(vueEntry), `Missing built Vue 3 entry: ${vueEntry}`)

const builtMessages = readFileSync(coreMessagesEntry, 'utf8')
assert.match(
  builtMessages,
  /from\s+['"]\.\/messages\.ja\.js['"]/,
  'The Core ESM build must resolve the dotted messages.ja source basename to messages.ja.js.'
)
assert.doesNotMatch(
  builtMessages,
  /from\s+['"]\.\/messages\.ja['"]/,
  'The Core ESM build must not retain an unresolved ./messages.ja import.'
)

const core = await import(pathToFileURL(coreEntry).href)
const unavailable = {
  download: false,
  print: false,
  exportHtml: false,
  zoom: false,
  zoomIn: false,
  zoomOut: false,
  zoomReset: false
}
const searchOnlyToolbar = {
  download: false,
  print: false,
  exportHtml: false,
  zoom: false,
  search: true,
  theme: false
}
const visibleSearchOnly = core.resolveVisibleFileViewerToolbar(searchOnlyToolbar, unavailable)

assert.equal(visibleSearchOnly.search, true, 'Search visibility must survive toolbar resolution.')
assert.equal(
  core.hasVisibleFileViewerToolbarActions(visibleSearchOnly),
  true,
  'A search-only toolbar must remain visible.'
)
assert.equal(
  core.resolveVisibleFileViewerToolbar(searchOnlyToolbar, unavailable, false).search,
  false,
  'Top-level search: false must hide the native search control.'
)

const packageRequire = createRequire(resolve('packages/components/vue3/package.json'))
const vuePackageJson = packageRequire.resolve('vue/package.json')
const vueRequire = createRequire(vuePackageJson)
const vueModule = await import(pathToFileURL(packageRequire.resolve('vue')).href)
const serverRendererModule = await import(
  pathToFileURL(vueRequire.resolve('@vue/server-renderer')).href
)
const { FileViewer } = await import(pathToFileURL(vueEntry).href)
const { createSSRApp, h } = vueModule
const { renderToString } = serverRendererModule

const renderViewer = async (options, slots = {}) => {
  const app = createSSRApp({
    render: () => h(FileViewer, { options }, slots)
  })
  return renderToString(app)
}

const searchHtml = await renderViewer({
  styleIsolation: 'none',
  search: true,
  toolbar: searchOnlyToolbar
})
assert.match(searchHtml, /viewer-search-input/, 'The search-only toolbar must render its input.')
assert.match(searchHtml, /search-submit-button/, 'The search-only toolbar must render its submit action.')

let startProps
let endProps
const slotHtml = await renderViewer(
  {
    styleIsolation: 'none',
    toolbar: false
  },
  {
    'toolbar-start': props => {
      startProps = props
      return h('span', { 'data-toolbar-start': 'true' }, 'start')
    },
    'toolbar-end': props => {
      endProps = props
      return h('span', { 'data-toolbar-end': 'true' }, 'end')
    }
  }
)

assert.match(slotHtml, /data-toolbar-start="true"/, 'toolbar-start must render without built-in actions.')
assert.match(slotHtml, /data-toolbar-end="true"/, 'toolbar-end must render without built-in actions.')
for (const [name, props] of [['toolbar-start', startProps], ['toolbar-end', endProps]]) {
  assert.ok(props, `${name} did not receive slot props.`)
  assert.equal(typeof props.api.searchDocument, 'function', `${name} api is incomplete.`)
  assert.equal(typeof props.availability.download, 'boolean', `${name} availability is incomplete.`)
  assert.equal(typeof props.zoomState.scale, 'number', `${name} zoomState is incomplete.`)
  assert.equal(typeof props.searchState.total, 'number', `${name} searchState is incomplete.`)
}

console.log('[verify-vue3-toolbar] Core ESM imports, search visibility/rendering and start/end slot contracts verified.')
