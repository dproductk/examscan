/**
 * MarkBadge.jsx
 *
 * Draggable red badge — zero React re-renders during drag.
 *
 * Drag strategy:
 *   - On mousedown: switch badge to position:fixed (follows cursor via DOM,
 *     completely bypasses React state, no re-renders, no PDF reload).
 *   - On mousemove: update badge DOM element's left/top directly.
 *   - On mouseup: call onPositionChange ONCE with final position → single
 *     state update, badge moves to correct page container.
 *   - Identical approach for touch events (tablet support).
 *
 * Cross-page dragging works because position:fixed is viewport-relative,
 * so the badge visually follows the cursor across all pages while being
 * dragged, regardless of which page container it currently lives in.
 */
import { useRef, useCallback } from 'react'

export default function MarkBadge({
  questionId,
  value,
  xPercent,
  yPercent,
  currentPage,
  onPositionChange,
  onRemove,
  getPageAtPoint,
  readOnly,
}) {
  const badgeRef   = useRef(null)
  const isDragging = useRef(false)
  const lastHit    = useRef(null)

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (readOnly) return          // locked in read-only mode
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const el = badgeRef.current
    if (!el) return

    isDragging.current = true
    lastHit.current    = { page: currentPage, xPercent, yPercent }

    // Switch to fixed positioning so it follows cursor across all pages
    // without touching React state at all
    const rect = el.getBoundingClientRect()
    el.style.position  = 'fixed'
    el.style.left      = `${rect.left + rect.width  / 2}px`
    el.style.top       = `${rect.top  + rect.height / 2}px`
    el.style.transform = 'translate(-50%, -50%)'
    el.style.cursor    = 'grabbing'
    el.style.zIndex    = '9999'

    const handleMove = (moveEvent) => {
      if (!isDragging.current || !el) return
      // Update DOM directly — zero React state changes during drag
      el.style.left = `${moveEvent.clientX}px`
      el.style.top  = `${moveEvent.clientY}px`

      // Track which page we're over so we know on drop
      const hit = getPageAtPoint(moveEvent.clientX, moveEvent.clientY)
      if (hit) lastHit.current = hit
    }

    const handleUp = (upEvent) => {
      isDragging.current = false
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup',   handleUp)

      if (!el) return
      // Restore absolute positioning
      el.style.position  = 'absolute'
      el.style.cursor    = 'grab'
      el.style.zIndex    = '20'

      // Final hit-test
      const hit = getPageAtPoint(upEvent.clientX, upEvent.clientY) || lastHit.current
      if (hit) {
        // Single state update — fires ONCE, PDF does not reload
        onPositionChange(questionId, hit.xPercent, hit.yPercent, hit.page)
      } else {
        // Snap back to original position if dropped outside PDF
        el.style.left      = `${xPercent}%`
        el.style.top       = `${yPercent}%`
        el.style.transform = 'translate(-50%, -50%)'
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup',   handleUp)
  }, [questionId, xPercent, yPercent, currentPage, onPositionChange, getPageAtPoint])

  // ── Touch drag ────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (readOnly) return          // locked in read-only mode
    e.stopPropagation()
    const touch = e.touches[0]
    const el    = badgeRef.current
    if (!el) return

    isDragging.current = true
    lastHit.current    = { page: currentPage, xPercent, yPercent }

    const rect = el.getBoundingClientRect()
    el.style.position  = 'fixed'
    el.style.left      = `${rect.left + rect.width  / 2}px`
    el.style.top       = `${rect.top  + rect.height / 2}px`
    el.style.transform = 'translate(-50%, -50%)'
    el.style.zIndex    = '9999'

    const handleTouchMove = (moveEvent) => {
      if (!isDragging.current || !el) return
      moveEvent.preventDefault()
      const t = moveEvent.touches[0]
      el.style.left = `${t.clientX}px`
      el.style.top  = `${t.clientY}px`
      const hit = getPageAtPoint(t.clientX, t.clientY)
      if (hit) lastHit.current = hit
    }

    const handleTouchEnd = (endEvent) => {
      isDragging.current = false
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend',  handleTouchEnd)

      if (!el) return
      el.style.position = 'absolute'
      el.style.zIndex   = '20'

      const changedTouch = endEvent.changedTouches[0]
      const hit = getPageAtPoint(changedTouch.clientX, changedTouch.clientY) || lastHit.current
      if (hit) {
        onPositionChange(questionId, hit.xPercent, hit.yPercent, hit.page)
      } else {
        el.style.left      = `${xPercent}%`
        el.style.top       = `${yPercent}%`
        el.style.transform = 'translate(-50%, -50%)'
      }
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend',  handleTouchEnd)
  }, [questionId, xPercent, yPercent, currentPage, onPositionChange, getPageAtPoint])

  return (
    <div
      ref={badgeRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position:      'absolute',
        left:          `${xPercent}%`,
        top:           `${yPercent}%`,
        transform:     'translate(-50%, -50%)',
        display:       'flex',
        alignItems:    'center',
        gap:           '4px',
        background:    '#E53E3E',
        color:         '#fff',
        fontWeight:    '700',
        fontSize:      '13px',
        fontFamily:    'monospace',
        padding:       '3px 8px 3px 10px',
        borderRadius:  '6px',
        cursor:        readOnly ? 'default' : 'grab',
        userSelect:    'none',
        zIndex:        20,
        boxShadow:     '0 2px 8px rgba(229,62,62,0.45)',
        whiteSpace:    'nowrap',
        lineHeight:    '1.4',
      }}
      title={`${questionId}: ${value} mark(s)${readOnly ? '' : ' — drag to any page'}`}
    >
      {value}
      {!readOnly && (
        <span
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(questionId) }}
          style={{
            fontSize:   '11px',
            opacity:    0.8,
            cursor:     'pointer',
            lineHeight: 1,
            padding:    '0 2px',
            fontFamily: 'sans-serif',
          }}
          title="Remove badge"
        >
          ×
        </span>
      )}
    </div>
  )
}
