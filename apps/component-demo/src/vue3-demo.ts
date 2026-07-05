import { createApp, h } from 'vue'
import FileViewerPlugin, { FileViewer } from '@file-viewer/vue3-full'
import '@file-viewer/vue3/dist/file-viewer3.css'
import { getDemoSource } from './demoSource'
import './styles.css'

const host = document.getElementById('vue3-viewer')
const demoSource = getDemoSource()

if (!host) {
  throw new Error('Missing #vue3-viewer host element.')
}

createApp({
  render() {
    return h(FileViewer, {
      url: demoSource.url,
      filename: demoSource.filename,
      options: {
        theme: 'light',
        toolbar: {
          position: 'bottom-right'
        }
      }
    })
  }
}).use(FileViewerPlugin).mount(host)

document.body.setAttribute('data-component', 'vue3')
