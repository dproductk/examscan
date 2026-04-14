import { useState, useEffect } from 'react'
import { getReportsSummary, exportExcel, exportStudentPdf, exportAllPdfs } from '../../api/reports'
import LoadingSpinner from '../../components/LoadingSpinner'

function Reports() {
  const [students, setStudents] = useState([])
  const [availableFilters, setAvailableFilters] = useState({
    departments: [],
    semesters: [],
    academic_years: [],
    subjects: [],
  })
  
  // Filter settings
  const [filters, setFilters] = useState({
    department: '',
    semester: '',
    academic_year: '',
    subject: '',
    roll_number: '',
  })

  // UI state
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'table'
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null) // 'excel' | 'zip' | roll_number

  useEffect(() => {
    fetchData()
  }, [filters.department, filters.semester, filters.academic_year, filters.subject])

  const fetchData = async () => {
    setLoading(true)
    try {
      const activeFilters = {}
      if (filters.department) activeFilters.department = filters.department
      if (filters.semester) activeFilters.semester = filters.semester
      if (filters.academic_year) activeFilters.academic_year = filters.academic_year
      if (filters.subject) activeFilters.subject = filters.subject
      if (filters.roll_number) activeFilters.roll_number = filters.roll_number

      const res = await getReportsSummary(activeFilters)
      setStudents(res.data.students || [])
      setAvailableFilters(res.data.filters || {})
    } catch (err) {
      console.error('Failed to fetch reports summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchData()
  }

  const doExport = async (type, rollNumber = null) => {
    setExporting(rollNumber || type)
    try {
      const activeFilters = { ...filters }
      Object.keys(activeFilters).forEach(key => !activeFilters[key] && delete activeFilters[key])

      let response;
      let filename = '';
      
      if (type === 'excel') {
        response = await exportExcel(activeFilters)
        filename = 'evaluation_results.xlsx'
      } else if (type === 'zip') {
        response = await exportAllPdfs(activeFilters)
        filename = 'all_student_results.zip'
      } else if (type === 'student-pdf' && rollNumber) {
        response = await exportStudentPdf(rollNumber, activeFilters)
        filename = `result_${rollNumber}.pdf`
      }

      if (response && response.data) {
        const blob = new Blob([response.data])
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error(`Failed to export ${type}:`, err)
      alert(err.response?.data?.error || `Export failed. Please check filters or try again.`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1>Reports & Export Manager</h1>
            <p>Generate academic reports, view per-student results, and download report cards in PDF format.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-success"
              onClick={() => doExport('excel')}
              disabled={!!exporting}
            >
              {exporting === 'excel' ? <LoadingSpinner size={16} /> : '📊 Download Excel'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => doExport('zip')}
              disabled={!!exporting || students.length === 0}
            >
              {exporting === 'zip' ? <LoadingSpinner size={16} /> : '📦 ZIP All PDFs'}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Filters Area */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Data Filters</h3>
        <div className="grid-4" style={{ gap: '1rem' }}>
          {/* Academic Year */}
          <div>
            <label className="form-label">Academic Year</label>
            <select
              className="form-select"
              value={filters.academic_year}
              onChange={(e) => handleFilterChange('academic_year', e.target.value)}
            >
              <option value="">All Years</option>
              {availableFilters.academic_years?.map((ay) => (
                <option key={ay} value={ay}>{ay}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {availableFilters.departments?.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="form-label">Semester</label>
            <select
              className="form-select"
              value={filters.semester}
              onChange={(e) => handleFilterChange('semester', e.target.value)}
            >
              <option value="">All Semesters</option>
              {availableFilters.semesters?.map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="form-label">Subject Filter</label>
            <select
              className="form-select"
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
            >
              <option value="">All Subjects</option>
              {availableFilters.subjects?.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.code} — {subj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary: Roll Number Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search specific Roll Number..."
            value={filters.roll_number}
            onChange={(e) => handleFilterChange('roll_number', e.target.value)}
            style={{ maxWidth: '300px' }}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
          
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>View:</span>
            <div className="btn-group" style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', padding: '0.2rem' }}>
                <button 
                  type="button"
                  className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                  onClick={() => setViewMode('cards')}
                >
                  Cards
                </button>
                <button 
                  type="button"
                  className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                  onClick={() => setViewMode('table')}
                >
                  Table
                </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Fetching report data..." />
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <span style={{ fontSize: '3rem', opacity: 0.5, display: 'block', marginBottom: '1rem' }}>📭</span>
          <h3>No Data Matches Criteria</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or ensure bundles point to submitted states.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Showing Results for {students.length} Student{students.length !== 1 && 's'}
          </div>

          {viewMode === 'cards' ? (
            <div className="grid-3" style={{ gap: '1.5rem' }}>
              {students.map((student) => (
                <div className="card" key={student.roll_number} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div className="flex-between">
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>{student.roll_number}</h3>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => doExport('student-pdf', student.roll_number)}
                        disabled={!!exporting}
                      >
                        {exporting === student.roll_number ? <LoadingSpinner size={14} /> : '📄 PDF'}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {student.department || 'N/A Dept'} • Sem {student.semester || 'N/A'} • {student.academic_year || 'N/A Year'}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-light)' }}>SUBJECTS EVALUATED</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                      {student.subjects.map(subj => (
                        <li key={subj.subject_code} className="flex-between" style={{ padding: '0.3rem 0', borderBottom: '1px dashed var(--border-color)' }}>
                           <span title={subj.subject_name}>{subj.subject_code}</span>
                           <span style={{ fontWeight: 600 }}>{subj.total_marks} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {subj.max_marks || '-'}</span></span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontWeight: 600 }}>
                    <span>Grand Total</span>
                    <span style={{ fontSize: '1.25rem', color: 'var(--color-success)' }}>{student.grand_total}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-container" style={{ margin: 0, borderRadius: 'var(--radius-lg)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Department</th>
                      <th>Sem</th>
                      <th>Year</th>
                      <th>Evaluated Subjects</th>
                      <th>Grand Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student.roll_number}>
                         <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{student.roll_number}</td>
                         <td>{student.department || '-'}</td>
                         <td>{student.semester || '-'}</td>
                         <td>{student.academic_year || '-'}</td>
                         <td>
                           {student.subjects.map(s => (
                             <div key={s.subject_code} style={{ fontSize: '0.85rem' }}>
                               {s.subject_code}: <strong>{s.total_marks}</strong>
                             </div>
                           ))}
                         </td>
                         <td style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-success)' }}>{student.grand_total}</td>
                         <td>
                            <button 
                              className="btn btn-sm btn-ghost"
                              onClick={() => doExport('student-pdf', student.roll_number)}
                              disabled={!!exporting}
                              title="Download Report Card"
                            >
                              {exporting === student.roll_number ? <LoadingSpinner size={14} /> : '📥 Download'}
                            </button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Reports
