import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAnswerSheets } from '../../api/answerSheets'
import { getBundles } from '../../api/bundles'
import { changePassword } from '../../api/auth'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'

function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [sheets, setSheets] = useState([])
  const [bundles, setBundles] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedBundle, setExpandedBundle] = useState(null)

  const [showPasswordModal, setShowPasswordModal] = useState(
    location.state?.mustChangePassword || false
  )
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sheetsRes, bundlesRes] = await Promise.all([
        getAnswerSheets(),
        getBundles()
      ])
      setSheets(sheetsRes.data.results || sheetsRes.data)
      setBundles(bundlesRes.data.results || bundlesRes.data || [])
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwdLoading(true)
    setPwdMessage({ type: '', text: '' })

    try {
      await changePassword({ old_password: oldPwd, new_password: newPwd })
      setPwdMessage({ type: 'success', text: 'Password changed successfully!' })
      setTimeout(() => setShowPasswordModal(false), 1500)
    } catch (err) {
      setPwdMessage({
        type: 'error',
        text: err.response?.data?.old_password?.[0] || err.response?.data?.new_password?.[0] || 'Failed to change password.',
      })
    } finally {
      setPwdLoading(false)
    }
  }

  const stats = {
    total_bundles: bundles.length,
    assigned: sheets.filter((s) => s.status === 'assigned').length,
    completed: sheets.filter((s) => s.status === 'completed').length,
    flagged: sheets.filter((s) => s.status === 'flagged').length,
  }

  const toggleBundle = (bundleId) => {
    if (expandedBundle === bundleId) {
      setExpandedBundle(null)
    } else {
      setExpandedBundle(bundleId)
    }
  }

  return (
    <>
      <div className="page-container fade-in">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Your assigned marking bundles</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowPasswordModal(true)}>
          Change Password
        </button>
      </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: '2rem' }}>
          <div className="card stat-card">
            <div className="stat-value" style={{ color: 'var(--color-primary-light)' }}>{stats.total_bundles}</div>
            <div className="stat-label">Assigned Bundles</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value" style={{ color: 'var(--color-info)' }}>{stats.assigned}</div>
            <div className="stat-label">Sheets Pending</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.completed}</div>
            <div className="stat-label">Sheets Completed</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.flagged}</div>
            <div className="stat-label">Sheets Flagged</div>
          </div>
        </div>

        {/* Filter & Title */}
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)' }}>Assigned Bundles</h2>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading assigned bundles..." />
        ) : (
          <div className="table-container" style={{ borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <table>
              <thead>
                <tr>
                  <th>Bundle #</th>
                  <th>Subject</th>
                  <th>Total Sheets</th>
                  <th>Grading Progress</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle) => {
                   // Calculate grading progress specifically from assigned sheets mapping
                   const bundleSheets = sheets.filter(s => s.bundle === bundle.id);
                   const bundleGraded = bundleSheets.filter(s => s.status === 'completed').length;
                   const totalToGrade = bundleSheets.length;

                   return (
                     <React.Fragment key={bundle.id}>
                       {/* Main Bundle Row */}
                       <tr 
                          style={{ cursor: 'pointer', backgroundColor: expandedBundle === bundle.id ? 'var(--background-secondary)' : 'transparent', borderBottom: expandedBundle === bundle.id ? 'none' : '1px solid var(--border-color)' }}
                          onClick={() => toggleBundle(bundle.id)}
                       >
                         <td style={{ fontWeight: 600 }}>#{bundle.bundle_number}</td>
                         <td>
                           <div>{bundle.subject_name || 'Subject'}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bundle.subject_code}</div>
                         </td>
                         <td>{totalToGrade} sheets</td>
                         <td>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             <div style={{ flex: 1, background: 'var(--border-color)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                               <div style={{ background: bundleGraded === totalToGrade ? 'var(--color-success)' : 'var(--color-primary)', height: '100%', width: `${totalToGrade > 0 ? (bundleGraded / totalToGrade) * 100 : 0}%` }}></div>
                             </div>
                             <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{bundleGraded}/{totalToGrade}</span>
                           </div>
                         </td>
                         <td>
                           <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); toggleBundle(bundle.id); }}>
                             {expandedBundle === bundle.id ? 'Close' : 'View Sheets'}
                           </button>
                         </td>
                       </tr>
                       
                       {/* Expanded Sheets View */}
                       {expandedBundle === bundle.id && (
                         <tr>
                            <td colSpan="5" style={{ padding: 0 }}>
                              <div style={{ background: 'var(--background-primary)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem', margin: '0', boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.1)' }}>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Answer Sheets</h4>
                                {bundleSheets.length === 0 ? (
                                   <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No sheets assigned to you in this bundle.</div>
                                ) : (
                                   <table style={{ margin: 0, background: 'var(--background-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                                     <thead>
                                       <tr style={{ background: 'var(--border-color)' }}>
                                         <th style={{ padding: '0.75rem 1rem' }}>S.No. & Barcode</th>
                                         <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                         <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {bundleSheets.map((sheet, idx) => (
                                          <tr key={sheet.id}>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                              <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>#{idx + 1}</span>
                                              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{sheet.token}</span>
                                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>(v{sheet.pdf_version})</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={sheet.status} /></td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                              <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => navigate(`/teacher/evaluate/${sheet.id}`, { state: { subjectCode: bundle.subject_code } })}
                                                id={`evaluate-sheet-${sheet.id}`}
                                              >
                                                {sheet.status === 'completed' ? 'View Details' : 'Evaluate Paper'}
                                              </button>
                                            </td>
                                          </tr>
                                       ))}
                                     </tbody>
                                   </table>
                                )}
                              </div>
                            </td>
                         </tr>
                       )}
                     </React.Fragment>
                   )
                })}
                {bundles.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                      No bundles have been assigned to you yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop" onClick={() => !location.state?.mustChangePassword && setShowPasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              {!location.state?.mustChangePassword && (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPasswordModal(false)}>✕</button>
              )}
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={8} />
              </div>
              {pwdMessage.text && (
                <div className={`toast ${pwdMessage.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
                  {pwdMessage.text}
                </div>
              )}
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={pwdLoading}>
                  {pwdLoading ? <LoadingSpinner size={16} /> : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default TeacherDashboard
