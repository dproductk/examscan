import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAnswerSheets, assignSheet, bulkAssignSheets } from '../../api/answerSheets'
import { getBundles } from '../../api/bundles'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import axiosInstance from '../../api/axiosInstance'

function AssignTeacher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bundleFilter = searchParams.get('bundle') || ''

  const [sheets, setSheets] = useState([])
  const [bundles, setBundles] = useState([])
  const [teachers, setTeachers] = useState([])
  const [selectedSheets, setSelectedSheets] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [expandedBundle, setExpandedBundle] = useState(bundleFilter ? parseInt(bundleFilter) : null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchData()
  }, [bundleFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (bundleFilter) params.bundle = bundleFilter

      const [sheetsRes, bundlesRes, teachersRes] = await Promise.all([
        getAnswerSheets(params),
        getBundles(params),
        axiosInstance.get('/api/users/?role=teacher'),
      ])
      setSheets(sheetsRes.data.results || sheetsRes.data)
      setBundles(bundlesRes.data.results || bundlesRes.data || [])
      setTeachers(teachersRes.data.results || teachersRes.data || [])
    } catch {
      setMessage({ type: 'error', text: 'Failed to load data.' })
    } finally {
      setLoading(false)
    }
  }

  const toggleBundle = (bundleId) => {
    if (expandedBundle === bundleId) {
      setExpandedBundle(null)
    } else {
      setExpandedBundle(bundleId)
    }
  }

  const toggleSheet = (sheetId) => {
    setSelectedSheets((prev) =>
      prev.includes(sheetId) ? prev.filter((id) => id !== sheetId) : [...prev, sheetId]
    )
  }

  const selectAllInBundle = (bundleId) => {
    const bundleSheets = sheets.filter(s => s.bundle === bundleId).map(s => s.id)
    const allSelected = bundleSheets.every(id => selectedSheets.includes(id))

    if (allSelected) {
      setSelectedSheets(prev => prev.filter(id => !bundleSheets.includes(id)))
    } else {
      setSelectedSheets(prev => {
        const newSet = new Set([...prev, ...bundleSheets])
        return Array.from(newSet)
      })
    }
  }

  const handleAssign = async () => {
    if (!selectedTeacher || selectedSheets.length === 0) {
      setMessage({ type: 'error', text: 'Select a teacher and at least one answer sheet.' })
      return
    }

    setAssigning(true)
    setMessage({ type: '', text: '' })

    try {
      if (selectedSheets.length === 1) {
        await assignSheet(selectedSheets[0], { teacher_id: selectedTeacher })
      } else {
        await bulkAssignSheets({ teacher_id: selectedTeacher, sheet_ids: selectedSheets })
      }

      setMessage({ type: 'success', text: `${selectedSheets.length} sheet(s) assigned successfully!` })
      setSelectedSheets([])
      fetchData()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Assignment failed.' })
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1>Assign Teachers</h1>
          <p>Assign entire bundles or specific answer sheets to teachers for evaluation.</p>
        </div>
      </div>

        {/* Assignment controls */}
        <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--background-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: '1 1 300px' }}>
              <label className="form-label">Teacher Deployment Database</label>
              <select
                className="form-select"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                id="teacher-id-input"
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} ({t.username})</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleAssign}
              disabled={assigning || !selectedTeacher || selectedSheets.length === 0}
              id="assign-btn"
            >
              {assigning ? <LoadingSpinner size={16} /> : `Perform Bulk Assign (${selectedSheets.length} Sheets)`}
            </button>
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Sheets table */}
        {loading ? (
          <LoadingSpinner message="Loading bundles and sheets..." />
        ) : (
          <div className="table-container" style={{ borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <table>
              <thead>
                <tr>
                  <th>Bundle #</th>
                  <th>Subject</th>
                  <th>Total Sheets</th>
                  <th>Assigned State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle) => {
                   const bundleSheets = sheets.filter(s => s.bundle === bundle.id);
                   const bundleAssigned = bundleSheets.filter(s => s.assigned_teacher_name).length;
                   const totalSheets = bundleSheets.length;

                   return (
                     <React.Fragment key={bundle.id}>
                       {/* Main Bundle Row */}
                       <tr 
                          style={{ cursor: 'pointer', backgroundColor: expandedBundle === bundle.id ? 'var(--background-secondary)' : 'transparent', borderBottom: expandedBundle === bundle.id ? 'none' : '1px solid var(--border-color)' }}
                          onClick={() => toggleBundle(bundle.id)}
                       >
                         <td style={{ fontWeight: 600 }}>#{bundle.bundle_number}</td>
                         <td>
                           <div style={{ fontWeight: 500 }}>{bundle.subject_name || 'Subject'}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bundle.subject_code}</div>
                         </td>
                         <td>{totalSheets} sheets</td>
                         <td>
                           {bundleAssigned === totalSheets && totalSheets > 0 ? (
                              <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>Fully Assigned ✓</span>
                           ) : bundleAssigned > 0 ? (
                              <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>Partially Assigned ({bundleAssigned}/{totalSheets})</span>
                           ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Unassigned (0/{totalSheets})</span>
                           )}
                         </td>
                         <td>
                           <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); toggleBundle(bundle.id); }}>
                             {expandedBundle === bundle.id ? 'Close Sheets' : 'View Sheets'}
                           </button>
                         </td>
                       </tr>
                       
                       {/* Expanded Sheets View */}
                       {expandedBundle === bundle.id && (
                         <tr>
                            <td colSpan="5" style={{ padding: 0 }}>
                              <div style={{ background: 'var(--background-primary)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem', margin: '0', boxShadow: 'inset 0 4px 6px -4px rgba(0,0,0,0.1)' }}>
                                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                   <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Answer Sheets</h4>
                                   <button 
                                      className="btn btn-ghost btn-sm" 
                                      onClick={() => selectAllInBundle(bundle.id)}
                                      style={{ color: 'var(--color-primary)' }}
                                   >
                                      {bundleSheets.every(s => selectedSheets.includes(s.id)) && bundleSheets.length > 0 ? 'Deselect All' : 'Select All in Bundle'}
                                   </button>
                                </div>
                                {bundleSheets.length === 0 ? (
                                   <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No answer sheets found in this bundle.</div>
                                ) : (
                                   <table style={{ margin: 0, background: 'var(--background-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                                     <thead>
                                       <tr style={{ background: 'var(--border-color)' }}>
                                         <th style={{ width: '40px', padding: '0.75rem 1rem' }}></th>
                                         <th style={{ padding: '0.75rem 1rem' }}>Roll Number</th>
                                         <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                         <th style={{ padding: '0.75rem 1rem' }}>Assigned To</th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {bundleSheets.map((sheet, idx) => (
                                          <tr key={sheet.id} onClick={(e) => { e.stopPropagation(); toggleSheet(sheet.id) }} style={{ cursor: 'pointer' }}>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                               <input
                                                  type="checkbox"
                                                  checked={selectedSheets.includes(sheet.id)}
                                                  onChange={() => {}} // Controlled by row click
                                               />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{sheet.roll_number}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={sheet.status} /></td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                                              {sheet.assigned_teacher_name ? (
                                                 <span style={{ color: 'var(--color-secondary)' }}> {sheet.assigned_teacher_name}</span>
                                              ) : '-'}
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
                      No bundles found in the system.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
  )
}

export default AssignTeacher
