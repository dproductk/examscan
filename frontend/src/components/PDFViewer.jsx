import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import LoadingSpinner from './LoadingSpinner'
import MarkBadge from './MarkBadge'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

/**
 * PDFViewer
 *
 * Props:
 *   url                  string     — PDF URL to load
 *   token                string     — Bearer token for Authorization header
 *   markPositions        object     — { [questionId]: { value, page, xPercent, yPercent } }
 *   onBadgePositionChange fn(qId, xPct, yPct, page)
 *   onBadgeRemove        fn(qId)
 *   onVisiblePageChange  fn(pageNumber) — called when the most-visible page changes
 */
function PDFViewer({ url, token, markPositions = {}, onBadgePositionChange, onBadgeRemove, onVisiblePageChange, readOnly }) {
  const [numPages, setNumPages] = useState(null)
  const [scale, setScale]       = useState(1.2)
  const [error, setError]       = useState(null)

  // Memoize file object — prevents react-pdf from reloading the PDF whenever
  // the parent re-renders due to markPositions state changes during drag.
  const fileObj = useMemo(() => ({
    url,
    httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  }), [url, token])

  // Map of pageNumber → DOM element for cross-page drag hit-testing
  const pageRefs = useRef({})

  // Track intersection ratios per page to find the most-visible page
  const intersectionRatios = useRef({})
  const observerRef        = useRef(null)

  // Set up IntersectionObserver once pages are rendered
  const setupObserver = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = parseInt(entry.target.dataset.pageNumber)
          if (!isNaN(pageNum)) {
            intersectionRatios.current[pageNum] = entry.intersectionRatio
          }
        })

        // Find page with highest visible ratio
        let bestPage  = 1
        let bestRatio = -1
        Object.entries(intersectionRatios.current).forEach(([pg, ratio]) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestPage  = parseInt(pg)
          }
        })

        if (onVisiblePageChange) onVisiblePageChange(bestPage)
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] }
    )

    // Observe all page wrappers that have been mounted
    Object.values(pageRefs.current).forEach((el) => {
      if (el) observerRef.current.observe(el)
    })
  }, [onVisiblePageChange])

  // Re-run observer setup when numPages or scale changes (pages re-render)
  useEffect(() => {
    if (!numPages) return
    // Small delay to let react-pdf finish rendering pages
    const timer = setTimeout(setupObserver, 300)
    return () => {
      clearTimeout(timer)
      observerRef.current?.disconnect()
    }
  }, [numPages, scale, setupObserver])

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setError(null)
  }

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF. Please try again.')
    console.error('PDF load error:', err)
  }

  const zoomIn  = () => setScale((prev) => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5))

  /**
   * Given a pointer position (clientX, clientY), find which page wrapper it is
   * over and return { page, xPercent, yPercent } — or null if not over any page.
   * Passed to every MarkBadge to enable cross-page dragging.
   */
  const getPageAtPoint = useCallback((clientX, clientY) => {
    for (const [pageNumStr, el] of Object.entries(pageRefs.current)) {
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top  &&
        clientY <= rect.bottom
      ) {
        const xPercent = ((clientX - rect.left)  / rect.width)  * 100
        const yPercent = ((clientY - rect.top)   / rect.height) * 100
        return {
          page:     parseInt(pageNumStr),
          xPercent: Math.min(96, Math.max(4, xPercent)),
          yPercent: Math.min(95, Math.max(4, yPercent)),
        }
      }
    }
    return null
  }, [])

  const badgeCount = Object.keys(markPositions).length

  return (
    <div id="pdf-viewer" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0.5rem 1rem',
          background:     'var(--bg-secondary)',
          borderBottom:   '1px solid var(--border-color)',
          borderRadius:   'var(--radius-md) var(--radius-md) 0 0',
          flexShrink:     0,
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

      {/* Badge hint bar */}
      {badgeCount > 0 && (
        <div style={{
          background:  readOnly ? '#F0FFF4' : '#FFF5F5',
          border:      `1px solid ${readOnly ? '#9AE6B4' : '#FED7D7'}`,
          borderTop:   'none',
          padding:     '5px 14px',
          fontSize:    '12px',
          color:       readOnly ? '#276749' : '#C53030',
          display:     'flex',
          alignItems:  'center',
          gap:         '6px',
          flexShrink:  0,
        }}>
          <span>{readOnly ? '🟢' : '🔴'}</span>
          <span>
            <strong>{badgeCount}</strong> mark badge{badgeCount > 1 ? 's' : ''} placed
            {readOnly
              ? <>&nbsp;·&nbsp; <strong>read-only</strong> — click Re-Evaluate to edit</>
              : <>&nbsp;·&nbsp; drag to any page &nbsp;·&nbsp; <strong>×</strong> to remove</>
            }
          </span>
        </div>
      )}

      {/* PDF Content */}
      <div
        style={{
          flex:           1,
          overflow:       'auto',
          padding:        '1rem',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '1rem',
        }}
      >
        {error ? (
          <div className="toast toast-error">{error}</div>
        ) : (
          <Document
            file={fileObj}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<LoadingSpinner message="Loading PDF..." />}
          >
            {numPages &&
              Array.from({ length: numPages }, (_, i) => {
                const pageNumber = i + 1
                const pageBadges = Object.entries(markPositions).filter(
                  ([, pos]) => pos.page === pageNumber
                )

                return (
                  <div
                    key={`page_${pageNumber}`}
                    ref={(el) => {
                      pageRefs.current[pageNumber] = el
                      // Observe newly mounted page elements
                      if (el && observerRef.current) {
                        el.dataset.pageNumber = pageNumber
                        observerRef.current.observe(el)
                      }
                    }}
                    data-page-number={pageNumber}
                    style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      loading={<LoadingSpinner size={24} />}
                    />

                    {/* Render badges for this page */}
                    {pageBadges.map(([questionId, pos]) => (
                      <MarkBadge
                        key={questionId}
                        questionId={questionId}
                        value={pos.value}
                        xPercent={pos.xPercent}
                        yPercent={pos.yPercent}
                        currentPage={pageNumber}
                        onPositionChange={onBadgePositionChange}
                        onRemove={onBadgeRemove}
                        getPageAtPoint={getPageAtPoint}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                )
              })}
          </Document>
        )}
      </div>
    </div>
  )
}

export default PDFViewer
