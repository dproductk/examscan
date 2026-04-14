import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getBundles } from '../../api/bundles'
import axiosInstance from '../../api/axiosInstance'
import LoadingSpinner from '../../components/LoadingSpinner'

function ExamDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [bundles, setBundles] = useState([])
  const [stats, setStats] = useState(null)
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  const [assigningId, setAssigningId] = useState(null)
  const [selectedTeacher, setSelectedTeacher] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [bundlesRes, teachersRes] = await Promise.all([
        getBundles(),
        axiosInstance.get('/api/users/?role=teacher'),
      ])
      const fetchedBundles = bundlesRes.data.results || bundlesRes.data
      setBundles(fetchedBundles)
      setStats({
        total_bundles: fetchedBundles.length,
        unassigned_bundles: fetchedBundles.filter(b => b.assigned_count === 0 && b.status === 'submitted').length,
        assigned_bundles: fetchedBundles.filter(b => b.assigned_count > 0).length,
        total_sheets: fetchedBundles.reduce((sum, b) => sum + (b.sheets_count || b.total_sheets || 0), 0)
      })
      setTeachers(teachersRes.data.results || teachersRes.data || [])
    } catch (err) {
      console.error("Failed to fetch dashboard data", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTeacher = async (bundleId) => {
    if (!selectedTeacher) {
      alert("Please select a teacher from the database first.")
      return
    }
    try {
      await axiosInstance.patch(`/api/bundles/${bundleId}/assign/`, { teacher_id: selectedTeacher })
      setAssigningId(null)
      setSelectedTeacher('')
      fetchData() // Refresh status UI naturally
    } catch (err) {
      alert(err.response?.data?.error || "Failed to assign teacher.")
    }
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of all bundles spanning the examination ecosystem.</p>
        </div>
      </div>

        {/* Stats */}
        {stats && (
          <div className="grid-4" style={{ marginBottom: '2rem' }}>
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}>📦</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total_bundles || 0}</div>
                <div className="stat-label">Total Bundles</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.unassigned_bundles || 0}</div>
                <div className="stat-label">Unassigned Bundles</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981' }}>🧑‍🏫</div>
              <div className="stat-content">
                <div className="stat-value">{stats.assigned_bundles || 0}</div>
                <div className="stat-label">Assigned Bundles</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}>📄</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total_sheets || 0}</div>
                <div className="stat-label">Total Answer Sheets</div>
              </div>
            </div>
          </div>
        )}

        {/* Bundles */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: 0 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Assignment Tracker</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{bundles.length} tracked</div>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading ecosystem..." />
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              {bundles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No bundles tracked yet</h3>
                  <p>Bundles appear here once scanning staff fully finalize their capture sessions.</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Bundle #</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th style={{ width: '250px' }}>Assignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundles.map((bundle) => (
                      <tr key={bundle.id}>
                        <td style={{ fontWeight: 500 }}>#{bundle.bundle_number}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{bundle.subject_name || 'Subject'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bundle.subject_code || 'CODE'}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${bundle.status}`}>
                            {bundle.status}
                          </span>
                        </td>
                        <td>{new Date(bundle.created_at || Date.now()).toLocaleDateString()}</td>
                        <td>
                          {bundle.status === 'submitted' && bundle.assigned_count === 0 ? (
                             assigningId === bundle.id ? (
                               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                 <select 
                                   className="form-select" 
                                   style={{ padding: '0.3rem', fontSize: '0.8rem', width: '150px' }}
                                   value={selectedTeacher} 
                                   onChange={(e) => setSelectedTeacher(e.target.value)}
                                 >
                                   <option value="">Select Teacher...</option>
                                   {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                                 </select>
                                 <button className="btn btn-primary btn-sm" onClick={() => handleAssignTeacher(bundle.id)}>Assign</button>
                                 <button className="btn btn-ghost btn-sm" onClick={() => setAssigningId(null)}>✕</button>
                               </div>
                             ) : (
                               <button className="btn btn-secondary btn-sm" onClick={() => setAssigningId(bundle.id)}>+ Assign Teacher</button>
                             )
                          ) : bundle.status === 'submitted' && bundle.assigned_count > 0 ? (
                               <span style={{ color: 'var(--color-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>✓ Assigned</span>
                          ) : (
                               <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'capitalize' }}>{bundle.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
  )
}

export default ExamDashboard
