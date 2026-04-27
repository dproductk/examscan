/**
 * PlacedSticker
 *
 * Red sticker on the PDF showing the mark value for a question.
 * Draggable to reposition within the page.
 * Click × to remove (resets question to unattempted).
 * Teal outline when its question is the active selection.
 *
 * Props:
 *   questionId  — string (composite key)
 *   label       — string (short display label, e.g. "1a·i")
 *   value       — number
 *   xPercent    — 0-100 (% of page width)
 *   yPercent    — 0-100 (% of page height)
 *   pageWidth   — rendered page width px
 *   pageHeight  — rendered page height px
 *   isActive    — bool — teal border when true
 *   onMove(questionId, newX, newY)
 *   onRemove(questionId)
 *   onClick(questionId) — select this question when sticker clicked
 */
import { useRef, useCallback } from 'react'

export default function PlacedSticker({
  questionId, label, value, xPercent, yPercent,
  pageWidth, pageHeight,
  isActive, onMove, onRemove, onClick, onIncrement, onDecrement,
}) {
  const dragging = useRef(false)
  const start    = useRef({})
  const didDrag  = useRef(false)

  const formatValue = (v) => v % 1 === 0 ? String(v) : v.toFixed(1)

  const handleMouseDown = useCallback((e) => {
    if (e.target.dataset.remove) return
    e.preventDefault()
    e.stopPropagation()   // prevent PDF click handler from firing

    // Right click: decrement mark, don't drag
    if (e.button === 2) {
      if (onDecrement) onDecrement(questionId)
      return
    }

    // Left click: initiate drag
    dragging.current = true
    didDrag.current  = false
    start.current = { mx: e.clientX, my: e.clientY, xPct: xPercent, yPct: yPercent }

    const move = (me) => {
      if (!dragging.current) return
      const dx   = me.clientX - start.current.mx
      const dy   = me.clientY - start.current.my
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true
      const newX = Math.min(93, Math.max(2, start.current.xPct + (dx / pageWidth)  * 100))
      const newY = Math.min(95, Math.max(2, start.current.yPct + (dy / pageHeight) * 100))
      onMove(questionId, newX, newY)
    }
    const up = () => {
      dragging.current = false
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      // If it was a click (not a drag), select this question and increment
      if (!didDrag.current) {
        if (onClick) onClick(questionId)
        if (onIncrement) onIncrement(questionId)
      }
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }, [questionId, xPercent, yPercent, pageWidth, pageHeight, onMove, onClick, onIncrement, onDecrement])

  return (
    <div
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        transform: 'translate(-50%, -50%)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: '#E24B4A',
        color: '#fff',
        fontWeight: '700',
        fontSize: '16px',
        fontFamily: 'var(--font-family)',
        padding: '5px 10px 5px 12px',
        borderRadius: '8px',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: 10,
        outline: isActive ? '3px solid #1D9E75' : 'none',
        outlineOffset: '2px',
        whiteSpace: 'nowrap',
        boxShadow: '0 3px 12px rgba(226, 75, 74, 0.5)',
        transition: 'outline 0.1s ease',
      }}
      title={`${label}: ${formatValue(value)} — drag to reposition`}
    >
      <span style={{ fontSize: '11px', opacity: 0.9, marginRight: '3px', fontWeight: 600 }}>
        {label}
      </span>
      {formatValue(value)}
      <span
        data-remove="true"
        onClick={(e) => { e.stopPropagation(); onRemove(questionId) }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          fontSize: '13px',
          opacity: 0.85,
          cursor: 'pointer',
          padding: '0 2px',
          lineHeight: 1,
          marginLeft: '3px',
        }}
        title="Remove sticker (mark as unattempted)"
      >
        ×
      </span>
    </div>
  )
}
