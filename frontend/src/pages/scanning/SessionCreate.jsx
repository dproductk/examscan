import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createBundle, getSubjects, getBundles } from '../../api/bundles'
import LoadingSpinner from '../../components/LoadingSpinner'

import { Scanner } from '@yudiel/react-qr-scanner'

function SessionCreate() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [subjects, setSubjects] = useState([])
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [bundleNumber, setBundleNumber] = useState('')
  const [totalSheets, setTotalSheets] = useState('')
  const [qrRawData, setQrRawData] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [showManualForm, setShowManualForm] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [activeBundles, setActiveBundles] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      setFetchLoading(true)
      try {
        const subRes = await getSubjects()
        setSubjects(subRes.data.results || subRes.data || [])
      } catch (err) {
        console.error("Failed to load subjects:", err)
      }

      try {
        const bundleRes = await getBundles({ status: 'open' })
        setActiveBundles(bundleRes.data.results || bundleRes.data || [])
      } catch (err) {
        console.error("Failed to load active bundles:", err)
        setError('Failed to load active bundle data.')
      } finally {
        setFetchLoading(false)
      }
    }
    fetchData()
  }, [])

  const departments = [...new Set(subjects.map(s => s.department))].filter(Boolean)
  const filteredSubjects = departmentFilter 
    ? subjects.filter(s => s.department === departmentFilter) 
    : subjects

  const handleScan = (result) => {
    if (result && result.length > 0) {
      const rawText = result[0].rawValue;
      try {
        const parsed = JSON.parse(rawText);
        setQrRawData(parsed.q || rawText);
        if (parsed.s) {
          setSubjectId(parsed.s);
          // Try to auto-select department if subject is found
          const subjectObj = subjects.find(sub => sub.id === parseInt(parsed.s));
          if (subjectObj && subjectObj.department) setDepartmentFilter(subjectObj.department);
        }
        if (parsed.b) setBundleNumber(parsed.b);
        if (parsed.c) setTotalSheets(parsed.c);
      } catch (e) {
        setQrRawData(rawText);
      }
      setShowCamera(false)
      setShowManualForm(true) // auto-advance to form with QR data pre-filled
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await createBundle({
        subject: subjectId,
        bundle_number: bundleNumber,
        total_sheets: parseInt(totalSheets),
        qr_raw_data: qrRawData,
      })

      navigate(`/scanning/upload/${data.id}`)
    } catch (err) {
      if (err.response?.data) {
        const d = err.response.data
        if (d.error) setError(d.error)
        else {
          const msgs = Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          setError(msgs.join(' | '))
        }
      } else {
        setError('Failed to create bundle.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>New Bundle</h1>
          <p>Scan the QR code on the bundle cover to create a new answer-sheet bundle.</p>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem', border: '1px solid var(--color-secondary)', boxShadow: '0 0 0 1px var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--color-secondary)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Scan QR</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Point camera at bundle cover QR</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.7 }}>
          <div style={{ background: '#1A1D27', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Confirm</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Verify bundle details</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.7 }}>
          <div style={{ background: '#1A1D27', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Scan Sheets</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upload each answer sheet</div>
          </div>
        </div>
      </div>

      {/* Main Scan Area */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{color: 'var(--color-secondary)'}}>▣</span> Scan Bundle Barcode
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Open the camera and point it at the printed Barcode on the front of the bundle cover.</p>
        
        {!showManualForm && !showCamera ? (
           <div style={{ textAlign: 'center' }}>
             <button className="btn btn-primary btn-lg" style={{ width: '100%', background: '#1A1D27', marginBottom: '1rem' }} onClick={() => setShowCamera(true)}>
               📷 Open Camera & Scan QR
             </button>
             <button className="btn btn-ghost btn-sm" onClick={() => setShowManualForm(true)}>
               ▼ Can't scan? Enter QR data manually
             </button>
           </div>
        ) : showCamera ? (
           <div className="fade-in">
             <div style={{ maxWidth: '400px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }}>
               <Scanner onScan={handleScan} formats={['qr_code', 'code_128', 'code_39']} />
             </div>
             <div style={{ textAlign: 'center', marginTop: '1rem' }}>
               <button className="btn btn-secondary" onClick={() => setShowCamera(false)}>Cancel Scan</button>
             </div>
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="fade-in">
            {fetchLoading ? (
              <LoadingSpinner message="Loading subjects..." />
            ) : (
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="department-select">Department</label>
                  <select
                    id="department-select"
                    className="form-select"
                    value={departmentFilter}
                    onChange={(e) => {
                      setDepartmentFilter(e.target.value)
                      setSubjectId('')
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="subject-select">Subject</label>
                  <select
                    id="subject-select"
                    className="form-select"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    required
                  >
                    <option value="">Select a subject...</option>
                    {filteredSubjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bundle-number">Bundle Number</label>
                  <input
                    id="bundle-number"
                    type="text"
                    className="form-input"
                    value={bundleNumber}
                    onChange={(e) => setBundleNumber(e.target.value)}
                    placeholder="e.g., B-2024-CS101-001"
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" htmlFor="total-sheets">Total Sheets in Bundle</label>
                  <input
                    id="total-sheets"
                    type="number"
                    className="form-input"
                    min={1}
                    value={totalSheets}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => setTotalSheets(e.target.value)}
                    placeholder="Number of answer sheets"
                    required
                  />
                </div>
              </div>
            )}
            
            {error && <div className="toast toast-error mb-md">{error}</div>}
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                 type="button" 
                 className="btn btn-secondary" 
                 onClick={() => setShowManualForm(false)}
                 disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, background: '#1A1D27' }}
                disabled={loading}
              >
                {loading ? <LoadingSpinner size={20} /> : 'Create Bundle'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Bundles Section */}
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Resume Scanning</h3>
        {activeBundles.length > 0 && <span className="badge badge-open" style={{background: 'var(--border-color)', color: 'var(--text-secondary)'}}>{activeBundles.length} Active</span>}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {activeBundles.map(bundle => (
          <div key={bundle.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Bundle #{bundle.bundle_number || bundle.id}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>- - {bundle.total_sheets} total sheets</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                  className="btn btn-danger btn-sm" 
                  title="Delete Bundle"
                  onClick={async () => {
                     if (!window.confirm("WARNING: Are you sure you want to permanently delete this open bundle?")) return;
                     try {
                       const axiosInstance = (await import('../../api/axiosInstance')).default;
                       await axiosInstance.delete(`/api/bundles/${bundle.id}/`);
                       setActiveBundles(prev => prev.filter(b => b.id !== bundle.id));
                     } catch (err) {
                       alert(err.response?.data?.error || 'Failed to delete bundle.');
                     }
                  }}
              >
                  ✕ Delete
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/scanning/review/${bundle.id}`)}>Review</button>
              <button className="btn btn-primary btn-sm" style={{ background: '#1A1D27' }} onClick={() => navigate(`/scanning/upload/${bundle.id}`)}>Scan →</button>
            </div>
          </div>
        ))}
        {activeBundles.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No active bundles.
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionCreate
