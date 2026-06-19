import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useViewerWatermark } from '../packages/components/vue3/src/package/components/FileViewer/hooks/useViewerWatermark'
import type { FileViewerWatermarkOptions } from '../packages/core/src'

describe('Vue FileViewer watermark hook', () => {
  it('maps core watermark presentation state into Vue refs without local style rules', () => {
    const watermark = ref<boolean | FileViewerWatermarkOptions | undefined>({
      text: 'Internal Preview',
      gapX: 300
    })
    const state = useViewerWatermark(() => watermark.value)

    expect(state.normalizedWatermark.value).toMatchObject({
      enabled: true,
      text: 'Internal Preview',
      gapX: 300
    })
    expect(state.watermarkStyle.value?.backgroundImage).toContain('data:image/svg+xml')
    expect(state.watermarkInlineStyle.value).toContain('background-image:')

    watermark.value = false

    expect(state.normalizedWatermark.value).toBeNull()
    expect(state.watermarkStyle.value).toBeUndefined()
    expect(state.watermarkInlineStyle.value).toBe('')
  })
})
