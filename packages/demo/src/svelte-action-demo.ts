import fileViewer from '@file-viewer/svelte/action'
import './styles.css'

const host = document.getElementById('svelte-viewer')

if (!host) {
  throw new Error('Missing #svelte-viewer host element.')
}

fileViewer(host, {
  viewerUrl: '/vendor/file-viewer/index.html',
  url: '/example/preview.md',
  options: {
    theme: 'light',
    toolbar: {
      position: 'bottom-right'
    }
  }
})

document.body.setAttribute('data-adapter', 'svelte-action')
