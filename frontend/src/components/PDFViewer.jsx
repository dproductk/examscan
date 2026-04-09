import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import LoadingSpinner from './LoadingSpinner'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

function PDFViewer({ url, token }) {
  const [numPages, setNumPages] = useState(null)
  const [scale, setScale] = useState(1.2)
  const [error, setError] = useState(null)

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setError(null)
  }

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF. Please try again.')
    console.error('PDF load error:', err)
  }

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5))

  return (
    <div id="pdf-viewer" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          {numPages ? `${numPages} page${numPages > 1 ? 's' : ''}` : 'Loading...'}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={zoomOut} id="pdf-zoom-out">−</button>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', minWidth: '3rem', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button className="btn btn-ghost btn-sm" onClick={zoomIn} id="pdf-zoom-in">+</button>
        </div>
      </div>

      {/* PDF Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {error ? (
          <div className="toast toast-error">{error}</div>
        ) : (
          <Document
            file={{
              url,
              httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            }}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingSpinner message="Loading PDF..." />}
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={`page_${i + 1}`}
                  pageNumber={i + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<LoadingSpinner size={24} />}
                />
              ))}
          </Document>
        )}
      </div>
    </div>
  )
}

export default PDFViewer
