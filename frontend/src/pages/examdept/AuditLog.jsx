import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import axiosInstance from '../../api/axiosInstance'
import AuditTimeline from '../../components/AuditTimeline'
import LoadingSpinner from '../../components/LoadingSpinner'

function AuditLog() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchLogs()
  }, [actionFilter, page])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = { page }
      if (actionFilter) params.action_type = actionFilter

      const { data } = await axiosInstance.get('/api/audit-log/', { params })
      setEntries(data.results || data)
      if (data.count) {
        setTotalPages(Math.ceil(data.count / 20))
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  const ACTION_TYPES = [
    'LOGIN', 'SCAN', 'SUBMIT_SESSION', 'ASSIGN', 'GRADE',
    'EDIT_MARKS', 'FLAG', 'AMENDMENT_REQUEST', 'AMENDMENT_COMPLETE', 'RESULT_GENERATED',
  ]

  return (
    <>
      

      <div className="page-container fade-in">
        <div className="page-header">
          <h1>Audit Log</h1>
          <p>Complete trail of all actions performed in the system</p>
        </div>

        {/* Filter */}
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '200px' }}
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            id="audit-action-filter"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading audit log..." />
        ) : (
          <div className="card">
            <AuditTimeline entries={entries} />
          </div>
        )}
      </div>
    </>
  )
}

export default AuditLog
