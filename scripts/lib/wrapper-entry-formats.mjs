export const allowedEntryFormatList = [
  'esm',
  'types',
  'iife',
  'viewer-assets',
  'copy-assets-cli',
  'svelte-component'
]

export const allowedEntryFormats = new Set(allowedEntryFormatList)

const labelsByLocale = {
  zh: {
    esm: 'ESM',
    types: '类型声明',
    iife: 'script 标签 IIFE',
    'viewer-assets': '内置 viewer 静态产物',
    'copy-assets-cli': '复制静态资源 CLI',
    'svelte-component': 'Svelte 组件'
  },
  en: {
    esm: 'ESM',
    types: 'type declarations',
    iife: 'script tag IIFE',
    'viewer-assets': 'bundled viewer assets',
    'copy-assets-cli': 'asset copy CLI',
    'svelte-component': 'Svelte component'
  }
}

export function entryFormatLabels(locale) {
  return labelsByLocale[locale] || labelsByLocale.en
}

export function formatEntryFormats(entryFormats, locale) {
  const labels = entryFormatLabels(locale)
  return (entryFormats || [])
    .map(format => labels[format] || format)
    .join(', ')
}
