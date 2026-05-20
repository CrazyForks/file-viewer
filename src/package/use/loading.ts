import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'

export interface LoadingTheme {
  accent: string
  badge: string
  hint: string
  label: string
  soft: string
}

const FALLBACK_LOADING_THEME: LoadingTheme = {
  accent: '#5f6f82',
  soft: 'rgba(95, 111, 130, 0.12)',
  badge: 'DOC',
  label: '文件内容',
  hint: '正在整理内容结构并生成预览。'
}

const LOADING_THEME_MAP: Record<string, LoadingTheme> = {
  doc: {
    accent: '#2b78f6',
    soft: 'rgba(43, 120, 246, 0.12)',
    badge: 'W',
    label: 'Word 文档',
    hint: '正在准备分页、文本样式和文档结构。'
  },
  docx: {
    accent: '#2b78f6',
    soft: 'rgba(43, 120, 246, 0.12)',
    badge: 'W',
    label: 'Word 文档',
    hint: '正在准备分页、文本样式和文档结构。'
  },
  xls: {
    accent: '#21a366',
    soft: 'rgba(33, 163, 102, 0.12)',
    badge: 'X',
    label: 'Excel 表格',
    hint: '正在准备工作表、样式和可视区数据。'
  },
  xlsx: {
    accent: '#21a366',
    soft: 'rgba(33, 163, 102, 0.12)',
    badge: 'X',
    label: 'Excel 表格',
    hint: '正在准备工作表、样式和可视区数据。'
  },
  csv: {
    accent: '#21a366',
    soft: 'rgba(33, 163, 102, 0.12)',
    badge: 'X',
    label: '表格数据',
    hint: '正在准备行列数据和基础样式。'
  },
  ppt: {
    accent: '#f28b27',
    soft: 'rgba(242, 139, 39, 0.12)',
    badge: 'P',
    label: 'PPT 演示文稿',
    hint: '正在构建幻灯片布局和媒体内容。'
  },
  pptx: {
    accent: '#f28b27',
    soft: 'rgba(242, 139, 39, 0.12)',
    badge: 'P',
    label: 'PPT 演示文稿',
    hint: '正在构建幻灯片布局和媒体内容。'
  },
  pdf: {
    accent: '#e5534b',
    soft: 'rgba(229, 83, 75, 0.12)',
    badge: 'PDF',
    label: 'PDF 文档',
    hint: '正在载入页面位图、文本层和缩放视图。'
  },
  ofd: {
    accent: '#c2410c',
    soft: 'rgba(194, 65, 12, 0.12)',
    badge: 'OFD',
    label: 'OFD 版式文件',
    hint: '正在解析国产版式文档和页面对象。'
  },
  dxf: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'CAD',
    label: 'CAD 图纸',
    hint: '正在准备图层、几何对象和画布视图。'
  },
  drawio: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'DIO',
    label: 'draw.io 图纸',
    hint: '正在解析图元、连线和 SVG 预览。'
  },
  dio: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'DIO',
    label: 'draw.io 图纸',
    hint: '正在解析图元、连线和 SVG 预览。'
  },
  excalidraw: {
    accent: '#6d28d9',
    soft: 'rgba(109, 40, 217, 0.12)',
    badge: 'EX',
    label: 'Excalidraw 图纸',
    hint: '正在解析手绘图元并生成安全 SVG。'
  },
  png: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  jpg: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  jpeg: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  gif: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  webp: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  svg: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  bmp: {
    accent: '#7c5cff',
    soft: 'rgba(124, 92, 255, 0.12)',
    badge: 'IMG',
    label: '图片文件',
    hint: '正在解码像素数据并生成预览。'
  },
  mp4: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  mov: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  avi: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  webm: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  },
  m4v: {
    accent: '#0f766e',
    soft: 'rgba(15, 118, 110, 0.12)',
    badge: 'VID',
    label: '视频文件',
    hint: '正在准备媒体资源和播放组件。'
  }
}

/**
 * 根据扩展名返回统一的加载主题。
 * 这样不同预览器可以复用同一套视觉语义，避免颜色、图标和文案各写一份。
 */
export const resolveLoadingTheme = (extend = ''): LoadingTheme => {
  const normalized = extend.trim().toLowerCase()
  return LOADING_THEME_MAP[normalized] || FALLBACK_LOADING_THEME
}

/**
 * 统一管理加载、错误、文案和主题色。
 * 组件只负责描述业务流程，不再在主文件里散落一堆 loading 状态切换。
 */
export const useLoading = (extendSource: MaybeRefOrGetter<string>) => {
  const loading = ref(false)
  const error = ref('')
  const message = ref('')

  const theme = computed(() => resolveLoadingTheme(toValue(extendSource)))
  const styleVars = computed(() => ({
    '--viewer-accent': theme.value.accent,
    '--viewer-soft': theme.value.soft
  }))

  const startLoading = (nextMessage: string) => {
    loading.value = true
    message.value = nextMessage
    error.value = ''
  }

  const setLoadingMessage = (nextMessage: string) => {
    message.value = nextMessage
  }

  const stopLoading = () => {
    loading.value = false
    message.value = ''
  }

  const showError = (nextMessage: string) => {
    loading.value = false
    message.value = ''
    error.value = nextMessage
  }

  const clearError = () => {
    error.value = ''
  }

  const resetLoading = () => {
    loading.value = false
    message.value = ''
    error.value = ''
  }

  return {
    loading,
    error,
    message,
    theme,
    styleVars,
    startLoading,
    setLoadingMessage,
    stopLoading,
    showError,
    clearError,
    resetLoading
  }
}
