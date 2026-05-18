<script setup lang='ts'>
import { computed } from 'vue'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import 'highlight.js/styles/github-dark.css'

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

const registeredLanguages = new Set<string>()

const registerLanguageOnce = (name: string, language: Parameters<typeof hljs.registerLanguage>[1]) => {
  if (registeredLanguages.has(name)) {
    return
  }
  hljs.registerLanguage(name, language)
  registeredLanguages.add(name)
}

registerLanguageOnce('bash', bash)
registerLanguageOnce('cpp', cpp)
registerLanguageOnce('csharp', csharp)
registerLanguageOnce('css', css)
registerLanguageOnce('diff', diff)
registerLanguageOnce('go', go)
registerLanguageOnce('ini', ini)
registerLanguageOnce('java', java)
registerLanguageOnce('javascript', javascript)
registerLanguageOnce('json', json)
registerLanguageOnce('markdown', markdown)
registerLanguageOnce('php', php)
registerLanguageOnce('python', python)
registerLanguageOnce('rust', rust)
registerLanguageOnce('sql', sql)
registerLanguageOnce('typescript', typescript)
registerLanguageOnce('xml', xml)
registerLanguageOnce('yaml', yaml)

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

const highlighted = computed(() => {
  if (language.value === 'plaintext') {
    // highlight.js core 不注册 plaintext，纯文本只做 HTML 转义，避免执行用户内容。
    return escapeHtml(props.value)
  }

  try {
    return hljs.highlight(props.value, { language: language.value }).value
  } catch {
    // 某些少见扩展名可能没有映射到 highlight.js 语言，自动识别比直接失败更友好。
    return hljs.highlightAuto(props.value).value
  }
})

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
  background: #0d1117;
  color: #e6edf3;
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
  border-bottom: 1px solid rgba(139, 148, 158, 0.24);
  background: rgba(13, 17, 23, 0.92);
  backdrop-filter: blur(12px);
}

.code-toolbar span,
.code-toolbar strong {
  color: #8b949e;
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
</style>
