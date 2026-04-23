import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSheetPdfUrl, flagSheet } from '../../api/answerSheets'
import { getEvaluation, submitEvaluation, saveDraft } from '../../api/evaluations'
import { getMarkingSchemes } from '../../api/markingSchemes'
import PDFViewer from '../../components/PDFViewer'
import MarkingForm from '../../components/MarkingForm'
import LoadingSpinner from '../../components/LoadingSpinner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const FLAG_REASONS = [
  { value: 'Blurry',        label: 'Blurry' },
  { value: 'Malpractice',   label: 'Malpractice' },
  { value: 'Missing Pages', label: 'Missing Pages' },
  { value: 'Other',         label: 'Other' },
]

function EvaluationScreen() {
  const { id } = useParams()
  const { user, accessToken, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { pendingQueue = [] } = location.state || {}

  const [scheme,         setScheme]         = useState(null)
  const [existingResult, setExistingResult] = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [submitting,     setSubmitting]     = useState(false)
  const [message,        setMessage]        = useState({ type: '', text: '' })

  // Whether this sheet has already been submitted (completed)
  // Initialise immediately from navigation state so there's no flicker
  // even before the evaluation API responds.
  const [isSubmitted, setIsSubmitted] = useState(!!location.state?.isCompleted)
  // URL of the marked (annotated) PDF — set after submission or when loading a completed sheet
  const [markedPdfUrl, setMarkedPdfUrl] = useState(null)

  // Flag state
  const [showFlagMenu, setShowFlagMenu] = useState(false)
  const [flagReason,   setFlagReason]   = useState('')
  const [flagging,     setFlagging]     = useState(false)

  // ── Mark badge state ─────────────────────────────────────────────────────
  // { [compositeKey]: { value, page, xPercent, yPercent } }
  // compositeKey = "${q.name}_${sq.name}_${p.name}"
  const [markPositions, setMarkPositions] = useState({})

  // Keep a stable ref to the latest sectionResults so the auto-save
  // interval can read it without needing it in its dependency array.
  const sectionResultsRef = useRef([])

  // Stable reference for section_results — avoids triggering MarkingForm
  // re-initialisation on every parent render (e.g. toast, flag menu toggles).
  // Only changes when the actual data object changes.
  const existingSectionResults = useMemo(
    () => existingResult?.section_results ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingResult]
  )

  // Track which PDF page is most visible — new badges spawn at its centre
  const visiblePageRef = useRef(1)
  const handleVisiblePageChange = useCallback((page) => {
    visiblePageRef.current = page
  }, [])

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Reset state immediately on ID change so old data doesn't bleed into the next paper
    setExistingResult(null)
    setMarkedPdfUrl(null)
    setMarkPositions({})
    setIsSubmitted(!!location.state?.isCompleted)
    setMessage({ type: '', text: '' })
    setLoading(true)

    const fetchData = async () => {
      try {
        let subjectCode = location.state?.subjectCode

        if (!subjectCode) {
          const { getAnswerSheets } = await import('../../api/answerSheets')
          const sheetsRes = await getAnswerSheets()
          const allSheets = sheetsRes.data.results || sheetsRes.data || []
          const currentSheet = allSheets.find((s) => s.id === parseInt(id))
          if (currentSheet) subjectCode = currentSheet.subject_code
        }

        if (subjectCode) {
          const schemesRes = await getMarkingSchemes({ subject_code: subjectCode })
          const schemes = schemesRes.data.results || schemesRes.data || []
          if (schemes.length > 0) {
            setScheme(schemes[0])
          } else {
            setMessage({ type: 'error', text: `No marking scheme found for subject ${subjectCode}.` })
          }
        } else {
          setMessage({ type: 'error', text: `Could not identify subject for sheet #${id}. Return to Dashboard and try again.` })
        }

        // Try to fetch existing evaluation (may have draft badge positions)
        try {
          const evalRes = await getEvaluation(id)
          const result  = evalRes.data
          setExistingResult(result)

          // Lock the form if the sheet is completed or a marked PDF already exists
          if (result.answer_sheet_status === 'completed' || result.marked_pdf_path) {
            setIsSubmitted(true)
          }

          // If a marked PDF exists, build its URL so we show it instead of original
          if (result.marked_pdf_path) {
            setMarkedPdfUrl(`${BASE_URL}/api/evaluations/${result.id}/marked-pdf/`)
          }

          // ── Pre-populate badge positions from saved data ─────────────────
          if (result.mark_positions && result.mark_positions.length > 0) {
            const populated = {}
            result.mark_positions.forEach((pos) => {
              populated[pos.question_id] = {
                value:    pos.value,
                page:     pos.page,
                xPercent: pos.x_percent,
                yPercent: pos.y_percent,
              }
            })
            setMarkPositions(populated)
          }
        } catch {
          // No existing evaluation — fine
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load evaluation data.' })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, location.state])

  // ── Badge helpers ─────────────────────────────────────────────────────────

  /**
   * Called by MarkingForm whenever a mark input changes.
   * Spawns a new badge on page 1 at a default position if value > 0,
   * preserving existing drag position if the badge already exists.
   * Removes the badge if value === 0.
   */
  const handleMarkChange = useCallback((key, value) => {
    setMarkPositions((prev) => {
      if (value > 0) {
        return {
          ...prev,
          [key]: {
            value,
            // Preserve existing position if badge already placed;
            // otherwise spawn at centre of the currently visible page
            page:     prev[key]?.page     ?? visiblePageRef.current,
            xPercent: prev[key]?.xPercent ?? 50,
            yPercent: prev[key]?.yPercent ?? 50,
          },
        }
      }
      // Remove badge when mark is 0
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleFormChange = useCallback((sectionResults) => {
    sectionResultsRef.current = sectionResults
  }, [])

  /**
   * Called by MarkBadge (via PDFViewer) when a badge is dragged to a new position.
   * Works across any page thanks to PDFViewer's getPageAtPoint.
   */
  const handleBadgePositionChange = useCallback((questionId, xPercent, yPercent, page) => {
    setMarkPositions((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        xPercent,
        yPercent,
        page,
      },
    }))
  }, [])

  /**
   * Called when the teacher clicks × on a badge.
   * Removes badge display only — does NOT remove the mark value.
   */
  const handleBadgeRemove = useCallback((questionId) => {
    setMarkPositions((prev) => {
      const next = { ...prev }
      delete next[questionId]
      return next
    })
  }, [])

  /** Convert markPositions state → API payload format */
  const buildMarkPositionsPayload = useCallback((positions) => {
    return Object.entries(positions).map(([question_id, pos]) => ({
      question_id,
      value:     pos.value,
      page:      pos.page,
      x_percent: pos.xPercent,
      y_percent: pos.yPercent,
    }))
  }, [])

  // ── Auto-save draft ───────────────────────────────────────────────────────
  const draftSaving = useRef(false)

  const triggerDraftSave = useCallback(async (currentPositions) => {
    if (draftSaving.current) return
    const sr = sectionResultsRef.current
    if (!sr || sr.length === 0) return

    draftSaving.current = true
    try {
      await saveDraft({
        answer_sheet:   parseInt(id),
        section_results: sr,
        mark_positions: buildMarkPositionsPayload(currentPositions),
      })
    } catch {
      // Silent fail — draft is best-effort
    } finally {
      draftSaving.current = false
    }
  }, [id, buildMarkPositionsPayload])

  // Auto-save every 30 s — but not when the sheet is already submitted
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSubmitted) triggerDraftSave(markPositions)
    }, 30000)
    return () => clearInterval(interval)
  }, [markPositions, triggerDraftSave, isSubmitted])

  // Save on tab/window close
  useEffect(() => {
    const handleUnload = () => {
      // Use sendBeacon for reliable fire-and-forget on unload
      const token = sessionStorage.getItem('access_token')
      const base  = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
      const body  = JSON.stringify({
        answer_sheet:    parseInt(id),
        section_results: sectionResultsRef.current,
        mark_positions:  buildMarkPositionsPayload(markPositions),
      })
      navigator.sendBeacon &&
        navigator.sendBeacon(
          `${base}/api/evaluations/draft/`,
          new Blob([body], { type: 'application/json' })
        )
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [id, markPositions, buildMarkPositionsPayload])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (sectionResults, grandTotal) => {
    sectionResultsRef.current = sectionResults
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        answer_sheet:           parseInt(id),
        section_results:        sectionResults,
        pdf_version_at_grading: 1,
        mark_positions:         buildMarkPositionsPayload(markPositions),
      }

      const res = await submitEvaluation(payload)
      const result = res.data
      setExistingResult(result)
      // Mark as submitted and set marked PDF URL if available
      setIsSubmitted(true)
      if (result.marked_pdf_path) {
        setMarkedPdfUrl(`${BASE_URL}/api/evaluations/${result.id}/marked-pdf/`)
      }
      
      const answerSheetId = parseInt(id)
      const remainingQueue = pendingQueue.filter(qId => qId !== answerSheetId)

      if (remainingQueue.length > 0) {
        const nextId = remainingQueue[0]
        navigate(`/teacher/evaluate/${nextId}`, {
          state: { ...location.state, pendingQueue: remainingQueue }
        })
      } else if (pendingQueue.includes(answerSheetId)) {
        // Only redirect to dashboard if we actually came from the queue and finished it
        navigate('/teacher/dashboard', {
          state: { bundleCompleted: true }
        })
      } else {
        setMessage({ type: 'success', text: `✓ Evaluation submitted! Total: ${grandTotal} marks. Annotated PDF is being generated.` })
      }
    } catch (err) {
      const errData = err.response?.data
      if (typeof errData === 'object' && !errData.error) {
        const messages = Object.entries(errData)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ')
        setMessage({ type: 'error', text: messages })
      } else {
        setMessage({ type: 'error', text: errData?.error || 'Submission failed.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Intercept MarkingForm's onSubmit to capture section_results for auto-save
  const handleFormSubmit = (sectionResults, grandTotal) => {
    sectionResultsRef.current = sectionResults
    handleSubmit(sectionResults, grandTotal)
  }

  // ── Re-Evaluate ───────────────────────────────────────────────────────────
  // Unlocks the form so the teacher can correct marks and re-submit
  const handleReEvaluate = useCallback(() => {
    setIsSubmitted(false)
    setMarkedPdfUrl(null)   // revert to original PDF while re-evaluating
    setMessage({ type: '', text: '' })
  }, [])

  // ── Flag ──────────────────────────────────────────────────────────────────
  const handleFlag = async () => {
    if (!flagReason) return
    setFlagging(true)
    try {
      await flagSheet(id, { flag_reason: flagReason })
      setMessage({ type: 'success', text: 'Sheet flagged for review.' })
      setShowFlagMenu(false)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to flag sheet.' })
    } finally {
      setFlagging(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading evaluation..." />
      </div>
    )
  }

  // When submitted and a marked PDF exists, show the annotated version.
  // Otherwise, fallback to the original PDF.
  const pdfUrl = (isSubmitted && markedPdfUrl) ? markedPdfUrl : getSheetPdfUrl(id)

  return (
    <>
      {/* Top bar */}
      <div style={{
        height:          '64px',
        background:      'var(--bg-secondary)',
        borderBottom:    '1px solid var(--border-color)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '0 var(--space-xl)',
        position:        'sticky',
        top:             0,
        zIndex:          100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/teacher/dashboard')}
            style={{ padding: 0 }}
          >
            ← Back
          </button>
          <span className="logo" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Evaluation Mode
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user?.fullName}</span>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setShowFlagMenu(!showFlagMenu)}
            id="flag-toggle-btn"
          >
            🚩 Flag Issue
          </button>
        </div>
      </div>

      {/* Flag dropdown */}
      {showFlagMenu && (
        <div style={{
          position: 'fixed', top: '64px', right: '1rem', zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)', padding: '1rem', width: '260px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <select
            className="form-select"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            style={{ marginBottom: '0.5rem' }}
          >
            <option value="">Select reason...</option>
            {FLAG_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            className="btn btn-danger btn-sm"
            style={{ width: '100%' }}
            onClick={handleFlag}
            disabled={!flagReason || flagging}
          >
            {flagging ? 'Flagging...' : 'Submit Flag'}
          </button>
        </div>
      )}

      {/* Amendment banner */}
      {existingResult?.was_amended && (
        <div
          id="amendment-banner"
          style={{
            background:  'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
            border:      '1px solid rgba(245,158,11,0.3)',
            borderRadius: 0,
            padding:     '0.75rem var(--space-xl)',
            display:     'flex',
            alignItems:  'center',
            gap:         '0.75rem',
            fontSize:    'var(--font-size-sm)',
            color:       '#92400E',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span>
            <strong>Marks amended by Exam Department</strong>
            {existingResult.amended_at && (
              <> on {new Date(existingResult.amended_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}</>
            )}
            . The marks shown below reflect the updated values.
          </span>
        </div>
      )}

      {/* Toast message */}
      {message.text && (
        <div
          className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`}
          style={{ position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)', zIndex: 300 }}
        >
          {message.text}
        </div>
      )}

      {/* Split layout */}
      <div className="split-layout">
        {/* Left: PDF Viewer with badge overlays */}
        <div className="panel-left">
          <PDFViewer
            url={pdfUrl}
            token={accessToken}
            markPositions={(isSubmitted && markedPdfUrl) ? {} : markPositions}
            onBadgePositionChange={handleBadgePositionChange}
            onBadgeRemove={handleBadgeRemove}
            onVisiblePageChange={handleVisiblePageChange}
            readOnly={isSubmitted}
          />
        </div>

        {/* Right: Marking Form */}
        <div className="panel-right">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
              Evaluation
            </h2>
            {pendingQueue.length > 0 && (
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Sheet {pendingQueue.indexOf(parseInt(id)) + 1} of {pendingQueue.length}
              </span>
            )}
          </div>
          {scheme ? (
            <MarkingForm
              sections={scheme.sections}
              existingResults={existingSectionResults}
              onSubmit={handleFormSubmit}
              loading={submitting}
              onMarkChange={handleMarkChange}
              onFormChange={handleFormChange}
              isSubmitted={isSubmitted}
              onReEvaluate={handleReEvaluate}
              pendingQueue={pendingQueue}
              answerSheetId={parseInt(id)}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              No marking scheme found. Contact the exam department.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default EvaluationScreen
