import React, { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import FileViewer from '@file-viewer/react'
import { mountViewerFrame, type ViewerFrameController } from '@file-viewer/web'
import './styles.css'

const docxPreviewUrl = '/example/word.docx'
const nestedViewerUrl = '/vendor/file-viewer/index.html'
const directViewerUrl = `${nestedViewerUrl}?url=${encodeURIComponent(docxPreviewUrl)}`

function WebViewerPanel() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const controller: ViewerFrameController = mountViewerFrame(containerRef.current, {
      viewerUrl: nestedViewerUrl,
      url: docxPreviewUrl
    })

    return () => {
      controller.destroy()
    }
  }, [])

  return <div ref={containerRef} className="viewer-host" data-testid="web-viewer-host" />
}

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Flyfish Viewer</h1>
          <p>Private adapter smoke test</p>
        </div>
        <nav className="topbar-actions" aria-label="Demo links">
          <a href={directViewerUrl} target="_blank" rel="noreferrer">
            Open viewer
          </a>
          <a href="/manual-js.html" target="_blank" rel="noreferrer">
            Manual JS
          </a>
          <a href="/manual-iife.html" target="_blank" rel="noreferrer">
            Script tag
          </a>
          <a href="/jquery.html" target="_blank" rel="noreferrer">
            jQuery
          </a>
          <a href="/svelte-action.html" target="_blank" rel="noreferrer">
            Svelte
          </a>
        </nav>
      </header>

      <section className="viewer-grid" aria-label="Adapter preview">
        <article className="viewer-panel">
          <h2>React</h2>
          <div className="viewer-frame">
            <FileViewer viewerUrl={nestedViewerUrl} url={docxPreviewUrl} data-testid="react-viewer" />
          </div>
        </article>

        <article className="viewer-panel">
          <h2>Web</h2>
          <div className="viewer-frame">
            <WebViewerPanel />
          </div>
        </article>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
