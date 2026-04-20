import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getBundle, submitBundle } from '../../api/bundles'
import { getAnswerSheets } from '../../api/answerSheets'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'

function BundleReview() {
  const { bundleId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [bundle, setBundle] = useState(null)
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bundleRes, sheetsRes] = await Promise.all([
          getBundle(bundleId),
          getAnswerSheets({ bundle: bundleId }),
        ])
        setBundle(bundleRes.data)
        setSheets(sheetsRes.data.results || sheetsRes.data)
      } catch {
        setMessage({ type: 'error', text: 'Failed to load bundle data.' })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [bundleId])

  const handleSubmit = async () => {
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      await submitBundle(bundleId)
      setMessage({ type: 'success', text: 'Bundle submitted successfully!' })
      setBundle((prev) => ({ ...prev, status: 'submitted' }))
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit bundle.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("WARNING: Are you sure you want to permanently delete this entire bundle and all its scanned answer sheets? This action cannot be undone.")) {
      return
    }

    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      // Direct call to securely delete the bundle and its physical folders
      const axiosInstance = (await import('../../api/axiosInstance')).default
      await axiosInstance.delete(`/api/bundles/${bundleId}/`)
      setMessage({ type: 'success', text: 'Bundle deleted successfully! Closing session...' })
      setTimeout(() => navigate('/scanning/session'), 1500)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete bundle.' })
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading bundle..." />

  return (
    <>
      

      <div className="page-container fade-in">
        <div className="page-header">
          <h1>Bundle Review</h1>
          <p>Review scanned sheets before submitting the bundle.</p>
        </div>

        {bundle && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="flex-between">
              <div>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                  Bundle #{bundle.bundle_number}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '0.25rem' }}>
                  {bundle.subject_code} — {bundle.subject_name}
                </p>
              </div>
              <StatusBadge status={bundle.status} />
            </div>
            <div className="grid-3" style={{ marginTop: '1rem' }}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-primary-light)' }}>{bundle.total_sheets}</div>
                <div className="stat-label">Expected Sheets</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-success)' }}>{sheets.length}</div>
                <div className="stat-label">Scanned Sheets</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: sheets.length < bundle.total_sheets ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {bundle.total_sheets - sheets.length}
                </div>
                <div className="stat-label">Remaining</div>
              </div>
            </div>
          </div>
        )}

        {/* Sheets table */}
        <div className="table-container" style={{ marginBottom: '1.5rem' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Roll Number</th>
                <th>Status</th>
                <th>PDF Version</th>
                <th>Scanned At</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet, idx) => (
                <tr key={sheet.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{sheet.roll_number}</td>
                  <td><StatusBadge status={sheet.status} /></td>
                  <td>v{sheet.pdf_version}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                    {new Date(sheet.scanned_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {sheets.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No sheets scanned yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate(`/scanning/upload/${bundleId}`)}
              disabled={bundle?.status === 'submitted'}
              id="continue-scanning-btn"
            >
              Continue Scanning
            </button>
            {bundle?.status !== 'submitted' && (
              <button
                className="btn btn-success btn-lg"
                onClick={() => navigate(`/scan/submit/${bundleId}`)}
                disabled={sheets.length === 0}
                id="submit-bundle-btn"
              >
                Review &amp; Submit Bundle
              </button>
            )}
          </div>
          
          {bundle?.status !== 'submitted' && (
            <button
              className="btn btn-danger"
              style={{ fontWeight: 600 }}
              onClick={handleDelete}
              disabled={submitting}
              id="delete-bundle-btn"
            >
              ✕ Delete Bundle
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default BundleReview
