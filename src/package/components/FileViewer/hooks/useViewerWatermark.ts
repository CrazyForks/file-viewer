import { computed } from 'vue'
import type { FileViewerWatermarkOptions } from '@/package/common/type'
import {
  buildFileViewerWatermarkBackgroundImage,
  buildFileViewerWatermarkInlineStyle,
  normalizeFileViewerWatermark
} from '@file-viewer/core'

export const useViewerWatermark = (
  getWatermark: () => boolean | FileViewerWatermarkOptions | undefined
) => {
  const normalizedWatermark = computed(() => normalizeFileViewerWatermark(getWatermark()))

  const watermarkStyle = computed(() => {
    const backgroundImage = buildFileViewerWatermarkBackgroundImage(normalizedWatermark.value || undefined)
    if (!backgroundImage) {
      return undefined
    }
    return {
      backgroundImage
    }
  })

  const watermarkInlineStyle = computed(() => {
    return buildFileViewerWatermarkInlineStyle(normalizedWatermark.value || undefined)
  })

  return {
    normalizedWatermark,
    watermarkStyle,
    watermarkInlineStyle
  }
}
