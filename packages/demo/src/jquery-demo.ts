import jquery from 'jquery'
import { installJQueryFileViewer } from '@file-viewer/jquery'
import './styles.css'

const viewerUrl = '/vendor/file-viewer/index.html'
const sampleUrl = '/example/preview.md'
const host = document.getElementById('jquery-viewer')

if (!host) {
  throw new Error('Missing #jquery-viewer host element.')
}

const $ = jquery
installJQueryFileViewer($)

$(host).fileViewer({
  viewerUrl,
  url: sampleUrl,
  options: {
    theme: 'light',
    toolbar: {
      position: 'bottom-right'
    }
  }
})

document.body.setAttribute('data-adapter', 'jquery')
