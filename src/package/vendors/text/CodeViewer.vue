<script setup lang='ts'>
import { computed, ref, watch } from 'vue'
import type { HLJSApi, LanguageFn } from 'highlight.js'

const props = defineProps<{
  // 源文件文本内容。组件只负责展示，不会执行其中的 HTML 或脚本。
  value: string,
  // 文件扩展名，用于选择最接近的高亮语言。
  type: string
}>()

const languageMap: Record<string, string> = {
  bash: 'bash',
  c: 'cpp',
  cc: 'cpp',
  cjs: 'javascript',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  diff: 'diff',
  go: 'go',
  h: 'cpp',
  hpp: 'cpp',
  html: 'xml',
  htm: 'xml',
  ini: 'ini',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsx: 'javascript',
  log: 'plaintext',
  md: 'markdown',
  markdown: 'markdown',
  mjs: 'javascript',
  php: 'php',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  sql: 'sql',
  ts: 'typescript',
  tsx: 'typescript',
  txt: 'plaintext',
  vue: 'xml',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml'
}

const languageLoaders: Record<string, () => Promise<{ default: LanguageFn }>> = {
  bash: () => import('highlight.js/lib/languages/bash'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  css: () => import('highlight.js/lib/languages/css'),
  diff: () => import('highlight.js/lib/languages/diff'),
  go: () => import('highlight.js/lib/languages/go'),
  ini: () => import('highlight.js/lib/languages/ini'),
  java: () => import('highlight.js/lib/languages/java'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  json: () => import('highlight.js/lib/languages/json'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  php: () => import('highlight.js/lib/languages/php'),
  python: () => import('highlight.js/lib/languages/python'),
  rust: () => import('highlight.js/lib/languages/rust'),
  sql: () => import('highlight.js/lib/languages/sql'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  xml: () => import('highlight.js/lib/languages/xml'),
  yaml: () => import('highlight.js/lib/languages/yaml')
}

let highlighterPromise: Promise<HLJSApi> | null = null
const registeredLanguages = new Set<string>()

const loadHighlighter = async () => {
  if (!highlighterPromise) {
    highlighterPromise = import('highlight.js/lib/core').then(module => module.default)
  }
  return highlighterPromise
}

const registerLanguageOnce = async (hljs: HLJSApi, name: string) => {
  if (registeredLanguages.has(name)) {
    return true
  }
  const loader = languageLoaders[name]
  if (!loader) {
    return false
  }
  // 每个代码格式只加载当前语言定义，避免代码预览 chunk 被所有语言解析器拖大。
  const { default: language } = await loader()
  hljs.registerLanguage(name, language)
  registeredLanguages.add(name)
  return true
}

const language = computed(() => {
  return languageMap[props.type.toLowerCase()] || 'plaintext'
})

const escapeHtml = (value: string) => {
  return value.replace(/[&<>"']/g, char => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[char]
  })
}

const highlighted = ref('')
let highlightToken = 0

const updateHighlighted = async () => {
  const token = ++highlightToken
  const currentLanguage = language.value
  if (currentLanguage === 'plaintext') {
    // highlight.js core 不注册 plaintext，纯文本只做 HTML 转义，避免执行用户内容。
    highlighted.value = escapeHtml(props.value)
    return
  }

  try {
    const hljs = await loadHighlighter()
    const hasLanguage = await registerLanguageOnce(hljs, currentLanguage)
    if (token !== highlightToken) {
      return
    }
    highlighted.value = hasLanguage
      ? hljs.highlight(props.value, { language: currentLanguage, ignoreIllegals: true }).value
      : escapeHtml(props.value)
  } catch {
    if (token === highlightToken) {
      // 高亮器加载失败时只退回安全转义文本，不额外加载自动识别语言集合。
      highlighted.value = escapeHtml(props.value)
    }
  }
}

watch(() => [props.value, language.value] as const, updateHighlighted, { immediate: true })

const lineCount = computed(() => {
  return props.value.split(/\r\n|\r|\n/).length
})
</script>

<template>
  <div class='code-viewer'>
    <div class='code-toolbar'>
      <span>{{ type.toUpperCase() }}</span>
      <strong>{{ lineCount }} lines</strong>
    </div>
    <pre class='code-area'><code class='hljs' :class='`language-${language}`' v-html='highlighted' /></pre>
  </div>
</template>

<style scoped>
.code-viewer {
  min-height: 100%;
  --code-bg: #f6f8fa;
  --code-toolbar-bg: rgba(255, 255, 255, 0.92);
  --code-border: rgba(31, 35, 40, 0.12);
  --code-text: #24292f;
  --code-muted: #57606a;
  --code-keyword: #cf222e;
  --code-title: #8250df;
  --code-string: #0a3069;
  --code-number: #0550ae;
  --code-comment: #6e7781;
  --code-attr: #953800;
  --code-built-in: #116329;
  background: var(--code-bg);
  color: var(--code-text);
}

.code-toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--code-border);
  background: var(--code-toolbar-bg);
  backdrop-filter: blur(12px);
}

.code-toolbar span,
.code-toolbar strong {
  color: var(--code-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.code-area {
  display: block;
  min-width: min-content;
  margin: 0;
  padding: 18px 20px 28px;
  overflow: auto;
  background: transparent;
}

.code-area code {
  display: block;
  padding: 0;
  overflow: visible;
  background: transparent;
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
  tab-size: 2;
  white-space: pre;
}

.code-area :deep(.hljs-comment),
.code-area :deep(.hljs-quote) {
  color: var(--code-comment);
}

.code-area :deep(.hljs-keyword),
.code-area :deep(.hljs-selector-tag),
.code-area :deep(.hljs-subst) {
  color: var(--code-keyword);
}

.code-area :deep(.hljs-string),
.code-area :deep(.hljs-doctag),
.code-area :deep(.hljs-regexp) {
  color: var(--code-string);
}

.code-area :deep(.hljs-title),
.code-area :deep(.hljs-section),
.code-area :deep(.hljs-selector-id) {
  color: var(--code-title);
  font-weight: 700;
}

.code-area :deep(.hljs-number),
.code-area :deep(.hljs-literal),
.code-area :deep(.hljs-variable),
.code-area :deep(.hljs-template-variable) {
  color: var(--code-number);
}

.code-area :deep(.hljs-attr),
.code-area :deep(.hljs-attribute),
.code-area :deep(.hljs-name),
.code-area :deep(.hljs-selector-class) {
  color: var(--code-attr);
}

.code-area :deep(.hljs-built_in),
.code-area :deep(.hljs-type),
.code-area :deep(.hljs-class .hljs-title) {
  color: var(--code-built-in);
}

:global(.file-viewer[data-viewer-theme='dark'] .code-viewer) {
  --code-bg: #0d1117;
  --code-toolbar-bg: rgba(13, 17, 23, 0.92);
  --code-border: rgba(139, 148, 158, 0.24);
  --code-text: #e6edf3;
  --code-muted: #8b949e;
  --code-keyword: #ff7b72;
  --code-title: #d2a8ff;
  --code-string: #a5d6ff;
  --code-number: #79c0ff;
  --code-comment: #8b949e;
  --code-attr: #ffa657;
  --code-built-in: #7ee787;
}

@media (prefers-color-scheme: dark) {
  :global(.file-viewer[data-viewer-theme='system'] .code-viewer) {
    --code-bg: #0d1117;
    --code-toolbar-bg: rgba(13, 17, 23, 0.92);
    --code-border: rgba(139, 148, 158, 0.24);
    --code-text: #e6edf3;
    --code-muted: #8b949e;
    --code-keyword: #ff7b72;
    --code-title: #d2a8ff;
    --code-string: #a5d6ff;
    --code-number: #79c0ff;
    --code-comment: #8b949e;
    --code-attr: #ffa657;
    --code-built-in: #7ee787;
  }
}
</style>
