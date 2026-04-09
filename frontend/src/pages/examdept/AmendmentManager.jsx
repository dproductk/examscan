import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAmendments, resolveAmendment, createAmendment } from '../../api/amendments'
import StatusBadge from '../../components/StatusBadge'
import AmendmentModal from '../../components/AmendmentModal'
import LoadingSpinner from '../../components/LoadingSpinner'

function AmendmentManager() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [amendments, setAmendments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchAmendments()
  }, [])

  const fetchAmendments = async () => {
    setLoading(true)
    try {
      const { data } = await getAmendments()
      setAmendments(data.results || data)
    } catch {
      setMessage({ type: 'error', text: 'Failed to load amendments.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (id, status) => {
    try {
      await resolveAmendment(id, { status })
      setMessage({ type: 'success', text: `Amendment ${status}!` })
      fetchAmendments()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Action failed.' })
    }
  }

  const handleCreateAmendment = async (data) => {
    await createAmendment(data)
    setMessage({ type: 'success', text: 'Amendment request created!' })
    fetchAmendments()
  }

  return (
    <>
      

      <div className="page-container fade-in">
        <div className="page-header">
          <div className="flex-between">
            <div>
              <h1>Amendment Requests</h1>
              <p>Manage rescan and correction requests</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} id="new-amendment-btn">
              + New Request
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {loading ? (
          <LoadingSpinner message="Loading amendments..." />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sheet ID</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested By</th>
                  <th>Requested At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {amendments.map((a) => (
                  <tr key={a.id}>
                    <td>#{a.id}</td>
                    <td>Sheet #{a.answer_sheet}</td>
                    <td>{a.reason}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>{a.requested_by_name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {new Date(a.requested_at).toLocaleString()}
                    </td>
                    <td>
                      {(a.status === 'open' || a.status === 'in_progress') && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleResolve(a.id, 'resolved')}
                            id={`resolve-${a.id}`}
                          >
                            Resolve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleResolve(a.id, 'rejected')}
                            id={`reject-${a.id}`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {a.status === 'resolved' && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                          Resolved by {a.resolved_by_name || '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {amendments.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                      No amendment requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AmendmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateAmendment}
        answerSheetId={null}
      />
    </>
  )
}

export default AmendmentManager
