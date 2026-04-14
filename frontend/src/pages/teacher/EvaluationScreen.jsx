import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSheetPdfUrl, flagSheet } from '../../api/answerSheets'
import { getEvaluation, submitEvaluation } from '../../api/evaluations'
import { getMarkingSchemes } from '../../api/markingSchemes'
import PDFViewer from '../../components/PDFViewer'
import MarkingForm from '../../components/MarkingForm'
import LoadingSpinner from '../../components/LoadingSpinner'

const FLAG_REASONS = [
  { value: 'Blurry', label: 'Blurry' },
  { value: 'Malpractice', label: 'Malpractice' },
  { value: 'Missing Pages', label: 'Missing Pages' },
  { value: 'Other', label: 'Other' },
]

function EvaluationScreen() {
  const { id } = useParams()
  const { user, accessToken, logout } = useAuth()
  const navigate = useNavigate()

  const location = useLocation()
  const [scheme, setScheme] = useState(null)
  const [existingResult, setExistingResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Flag state
  const [showFlagMenu, setShowFlagMenu] = useState(false)
  const [flagReason, setFlagReason] = useState('')
  const [flagging, setFlagging] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        let subjectCode = location.state?.subjectCode

        // Fallback: If no subjectCode in state, try to find it from answering sheet data
        // For absolute safety we could fetch it explicitly, but typically teachers come from dashboard.
        // Let's assume we can fetch all assigned sheets and find this one.
        if (!subjectCode) {
           const { getAnswerSheets } = await import('../../api/answerSheets')
           const sheetsRes = await getAnswerSheets()
           const allSheets = sheetsRes.data.results || sheetsRes.data || []
           const currentSheet = allSheets.find(s => s.id === parseInt(id))
           if (currentSheet) subjectCode = currentSheet.subject_code
        }

        if (subjectCode) {
           // Fetch marking scheme explicitly for this subject
           const schemesRes = await getMarkingSchemes({ subject_code: subjectCode })
           const schemes = schemesRes.data.results || schemesRes.data || []
           if (schemes.length > 0) {
             setScheme(schemes[0])
           } else {
             setMessage({ type: 'error', text: `No marking scheme found for subject ${subjectCode}.` })
           }
        } else {
           setMessage({ type: 'error', text: `Could not identify subject for sheet #${id}. Please return to Dashboard and try again.` })
        }

        // Try to fetch existing evaluation
        try {
          const evalRes = await getEvaluation(id)
          setExistingResult(evalRes.data)
        } catch {
          // No existing evaluation — that's fine
        }
      } catch {
        setMessage({ type: 'error', text: 'Failed to load evaluation data.' })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, location.state])

  const handleSubmit = async (sectionResults, grandTotal) => {
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        answer_sheet: parseInt(id),
        section_results: sectionResults,
        pdf_version_at_grading: 1,
      }

      await submitEvaluation(payload)
      setMessage({ type: 'success', text: 'Evaluation submitted successfully!' })
    } catch (err) {
      const errData = err.response?.data
      if (typeof errData === 'object' && !errData.error) {
        // Field-level validation errors
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

  const pdfUrl = getSheetPdfUrl(id)

  return (
    <>
      <div style={{ height: '64px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teacher/dashboard')} style={{ padding: 0 }}>
            ← Back
          </button>
          <span className="logo" style={{ fontSize: '1.25rem', fontWeight: 800 }}>Evaluation Mode</span>
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
          <select className="form-select" value={flagReason} onChange={(e) => setFlagReason(e.target.value)} style={{ marginBottom: '0.5rem' }}>
            <option value="">Select reason...</option>
            {FLAG_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleFlag} disabled={!flagReason || flagging}>
            {flagging ? 'Flagging...' : 'Submit Flag'}
          </button>
        </div>
      )}

      {/* Amendment Banner */}
      {existingResult?.was_amended && (
        <div
          id="amendment-banner"
          style={{
            background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 0,
            padding: '0.75rem var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: 'var(--font-size-sm)',
            color: '#92400E',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <span>
            <strong>Marks amended by Exam Department</strong>
            {existingResult.amended_at && (
              <> on {new Date(existingResult.amended_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</>
            )}
            . The marks shown below reflect the updated values.
          </span>
        </div>
      )}

      {/* Messages */}
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
        {/* Left: PDF Viewer */}
        <div className="panel-left">
          <PDFViewer url={pdfUrl} token={accessToken} />
        </div>

        {/* Right: Marking Form */}
        <div className="panel-right">
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '1rem' }}>
            Evaluation
          </h2>
          {scheme ? (
            <MarkingForm
              sections={scheme.sections}
              existingResults={existingResult?.section_results}
              onSubmit={handleSubmit}
              loading={submitting}
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
