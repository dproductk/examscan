import { useState } from 'react'
import LoadingSpinner from './LoadingSpinner'

const REASON_CHOICES = [
  { value: 'Blurry', label: 'Blurry' },
  { value: 'Missing Pages', label: 'Missing Pages' },
  { value: 'Wrong Paper', label: 'Wrong Paper' },
  { value: 'Other', label: 'Other' },
]

function AmendmentModal({ isOpen, onClose, onSubmit, answerSheetId }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason) {
      setError('Please select a reason.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await onSubmit({
        answer_sheet: answerSheetId,
        reason,
        notes,
      })
      setReason('')
      setNotes('')
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create amendment request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} id="amendment-modal">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Amendment</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="close-amendment-modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <select
              className="form-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              id="amendment-reason-select"
            >
              <option value="">Select a reason...</option>
              {REASON_CHOICES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about the issue..."
              id="amendment-notes-input"
            />
          </div>

          {error && <div className="toast toast-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="submit-amendment-btn"
            >
              {loading ? <LoadingSpinner size={16} /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AmendmentModal
