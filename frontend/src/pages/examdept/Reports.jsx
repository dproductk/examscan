import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getReportsSummary, exportExcel, exportPdf } from '../../api/reports'
import { getSubjects } from '../../api/bundles'
import LoadingSpinner from '../../components/LoadingSpinner'

function Reports() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [subjectFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (subjectFilter) params.subject = subjectFilter

      const [statsRes, subjectsRes] = await Promise.all([
        getReportsSummary(params),
        getSubjects(),
      ])
      setStats(statsRes.data)
      setSubjects(subjectsRes.data.results || subjectsRes.data)
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (type) => {
    setExporting(true)
    try {
      const params = {}
      if (subjectFilter) params.subject = subjectFilter

      const response = type === 'excel' ? await exportExcel(params) : await exportPdf(params)
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `evaluation_results.${type === 'excel' ? 'xlsx' : 'pdf'}`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // Handle export error
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      

      <div className="page-container fade-in">
        <div className="page-header">
          <div className="flex-between">
            <div>
              <h1>Reports & Analytics</h1>
              <p>View evaluation statistics and export results</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-success"
                onClick={() => handleExport('excel')}
                disabled={exporting}
                id="export-excel-btn"
              >
                {exporting ? <LoadingSpinner size={16} /> : '📊 Export Excel'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                id="export-pdf-btn"
              >
                {exporting ? <LoadingSpinner size={16} /> : '📄 Export PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: '1.5rem' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '240px' }}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            id="report-subject-filter"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading reports..." />
        ) : stats ? (
          <>
            {/* Summary stats */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--color-primary-light)' }}>{stats.total_sheets}</div>
                <div className="stat-label">Total Sheets</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.graded_sheets}</div>
                <div className="stat-label">Graded</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.average_marks}</div>
                <div className="stat-label">Avg Marks</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.flagged_sheets}</div>
                <div className="stat-label">Flagged</div>
              </div>
            </div>

            {/* Per-subject breakdown */}
            {stats.subject_breakdown?.length > 0 && (
              <>
                <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: '1rem' }}>Subject Breakdown</h2>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>Total</th>
                        <th>Graded</th>
                        <th>Pending</th>
                        <th>Flagged</th>
                        <th>Avg Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.subject_breakdown.map((s, idx) => (
                        <tr key={idx}>
                          <td>{s.subject_name}</td>
                          <td style={{ fontWeight: 600 }}>{s.subject_code}</td>
                          <td>{s.total_sheets}</td>
                          <td style={{ color: 'var(--color-success)' }}>{s.graded}</td>
                          <td style={{ color: 'var(--color-warning)' }}>{s.pending}</td>
                          <td style={{ color: 'var(--color-danger)' }}>{s.flagged}</td>
                          <td style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{s.average_marks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
    </>
  )
}

export default Reports
