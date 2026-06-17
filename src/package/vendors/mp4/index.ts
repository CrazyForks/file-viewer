import { createApp, defineAsyncComponent, h } from 'vue'
import type { FileRenderContext } from '@file-viewer/core'

const VideoViewer = defineAsyncComponent(() => import('./VideoViewer.vue'))

/**
 * 浏览器媒体预览。
 *
 * MP4 / WebM 使用原生 video；HLS(m3u8) 优先使用浏览器原生 HLS，
 * 其他现代浏览器按需加载 hls.js，避免普通视频预览被 HLS runtime 拖慢。
 */
export default async function renderVideo(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
) {
  const app = createApp({
    render: () => h(VideoViewer, {
      data: buffer,
      type: type || 'mp4',
      sourceUrl: context?.url
    })
  })
  app.mount(target)
  return app
}
