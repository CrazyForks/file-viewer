import fileViewer from '@file-viewer/svelte-full/action'
import { getDemoSource } from './demoSource'
import './styles.css'

const host = document.getElementById('svelte-viewer')
const demoSource = getDemoSource()

if (!host) {
  throw new Error('Missing #svelte-viewer host element.')
}

fileViewer(host, {
  url: demoSource.url,
  filename: demoSource.filename,
  options: {
    theme: 'light',
    toolbar: {
      position: 'bottom-right'
    }
  }
})

document.body.setAttribute('data-component', 'svelte-action')
