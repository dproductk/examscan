import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '../../context/AuthContext'
import { getMarkingSchemes, createMarkingScheme, updateMarkingScheme } from '../../api/markingSchemes'
import LoadingSpinner from '../../components/LoadingSpinner'

function SchemeManager() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form state
  const [subjectName, setSubjectName] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [sections, setSections] = useState([])

  useEffect(() => {
    fetchSchemes()
  }, [])

  const fetchSchemes = async () => {
    setLoading(true)
    try {
      const res = await getMarkingSchemes()
      setSchemes(res.data.results || res.data)
    } catch {
      setMessage({ type: 'error', text: 'Failed to load schemes.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (scheme) => {
    setEditingId(scheme.id)
    setSubjectName(scheme.subject_name || '')
    setSubjectCode(scheme.subject_code || '')
    setDepartment(scheme.department || '')
    setSemester(scheme.semester?.toString() || '')
    
    // Map sections to include internal IDs for React keys
    const loadedSections = (scheme.sections || []).map(sec => ({
      id: uuidv4(),
      section_name: sec.section_name,
      questions: (sec.questions || []).map(q => ({
        id: uuidv4(),
        question_no: q.question_no,
        max_marks: q.max_marks || ''
      }))
    }))
    
    setSections(loadedSections)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingId(null)
    setSubjectName('')
    setSubjectCode('')
    setDepartment('')
    setSemester('')
    setSections([
      {
        id: uuidv4(),
        section_name: 'Section 1',
        questions: [{ id: uuidv4(), question_no: 'Q1', max_marks: '' }]
      }
    ])
    setShowForm(true)
  }

  // Section Builder Helpers
  const addSection = () => {
    setSections([
      ...sections,
      { id: uuidv4(), section_name: `Section ${sections.length + 1}`, questions: [{ id: uuidv4(), question_no: 'Q1', max_marks: '' }] }
    ])
  }

  const removeSection = (secId) => {
    setSections(sections.filter(s => s.id !== secId))
  }

  const updateSectionName = (secId, name) => {
    setSections(sections.map(s => s.id === secId ? { ...s, section_name: name } : s))
  }

  const addQuestion = (secId) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          questions: [...s.questions, { id: uuidv4(), question_no: `Q${s.questions.length + 1}`, max_marks: '' }]
        }
      }
      return s
    }))
  }

  const removeQuestion = (secId, qId) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return { ...s, questions: s.questions.filter(q => q.id !== qId) }
      }
      return s
    }))
  }

  const updateQuestion = (secId, qId, field, value) => {
    setSections(sections.map(s => {
      if (s.id === secId) {
        return {
          ...s,
          questions: s.questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
        }
      }
      return s
    }))
  }

  const calculateSectionTotal = (sec) => {
    return sec.questions.reduce((sum, q) => sum + (parseFloat(q.max_marks) || 0), 0)
  }

  const calculateGrandTotal = () => {
    return sections.reduce((sum, s) => sum + calculateSectionTotal(s), 0)
  }
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)

  const handleSave = async () => {
    if (!subjectName || !subjectCode) {
      setMessage({ type: 'error', text: 'Subject Name and Subject Code are required.' })
      return
    }

    // Clean payload for API (remove internal IDs)
    const cleanSections = sections.map(sec => ({
      section_name: sec.section_name,
      questions: sec.questions.map(q => ({
        question_no: q.question_no,
        max_marks: parseFloat(q.max_marks) || 0
      }))
    }))

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        subject_name: subjectName,
        subject_code: subjectCode,
        department: department,
        semester: semester,
        sections: cleanSections
      }

      if (editingId) {
        await updateMarkingScheme(editingId, payload)
        setMessage({ type: 'success', text: 'Marking scheme updated!' })
      } else {
        await createMarkingScheme(payload)
        setMessage({ type: 'success', text: 'Marking scheme created!' })
      }

      setShowForm(false)
      fetchSchemes()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.response?.data?.sections?.[0] || 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
      <div className="page-container fade-in">
        <div className="page-header">
          <div className="flex-between">
            <div>
              <h1>Marking Schemes</h1>
              <p>Manage question paper marking schemes</p>
            </div>
            {!showForm && (
              <button className="btn btn-primary" onClick={handleNew} id="new-scheme-btn">
                + New Scheme
              </button>
            )}
          </div>
        </div>

        {message.text && (
          <div className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Form */}
        {showForm ? (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>
              {editingId ? 'Edit Marking Scheme' : 'New Marking Scheme'}
            </h3>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Subject name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type the full subject name</span>
              </div>
              <div className="form-group">
                <label className="form-label">Subject code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS301"
                  value={subjectCode}
                  onChange={e => setSubjectCode(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Semester</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Sections & questions</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Add sections (e.g. Section A, Section B), then add questions inside each section with their max marks.
              </p>
            </div>

            {/* Visual Builder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sections.map((sec, secIdx) => (
                <div key={sec.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-primary)' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ width: '300px', fontSize: '1rem', fontWeight: 600 }}
                      value={sec.section_name}
                      onChange={e => updateSectionName(sec.id, e.target.value)}
                      placeholder="Section name"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 600 }}>
                        {sec.questions.length} questions • {calculateSectionTotal(sec)} marks
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeSection(sec.id)}>✕</button>
                    </div>
                  </div>

                  {/* Questions wrapper */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
                    {sec.questions.map((q, qIdx) => (
                      <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)', width: '20px' }}>{qIdx + 1}.</span>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: '100px' }}
                          value={q.question_no}
                          onChange={e => updateQuestion(sec.id, q.id, 'question_no', e.target.value)}
                          placeholder="Q No."
                        />
                        <span style={{ color: 'var(--text-muted)' }}>Max</span>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: '100px' }}
                          value={q.max_marks}
                          onChange={e => updateQuestion(sec.id, q.id, 'max_marks', e.target.value)}
                          placeholder="5"
                        />
                        <span style={{ color: 'var(--text-muted)' }}>marks</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => removeQuestion(sec.id, q.id)}>✕</button>
                      </div>
                    ))}
                    
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ width: 'fit-content', marginTop: '0.5rem' }} 
                      onClick={() => addQuestion(sec.id)}
                    >
                      + Add question
                    </button>
                  </div>
                </div>
              ))}

              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', padding: '0.75rem' }} 
                onClick={addSection}
              >
                + Add section
              </button>
            </div>

            {/* Totals Summary */}
            <div style={{ background: 'var(--color-info-bg)', borderRadius: '8px', padding: '1rem', marginTop: '1.5rem', display: 'flex', gap: '2rem' }}>
              <div>
                <div style={{ color: 'var(--color-info)', fontSize: '0.85rem' }}>Sections</div>
                <div style={{ color: 'var(--color-info)', fontSize: '1.2rem', fontWeight: 600 }}>{sections.length}</div>
              </div>
              <div>
                <div style={{ color: 'var(--color-info)', fontSize: '0.85rem' }}>Questions</div>
                <div style={{ color: 'var(--color-info)', fontSize: '1.2rem', fontWeight: 600 }}>{totalQuestions}</div>
              </div>
              <div>
                <div style={{ color: 'var(--color-info)', fontSize: '0.85rem' }}>Total marks</div>
                <div style={{ color: 'var(--color-info)', fontSize: '1.2rem', fontWeight: 600 }}>{calculateGrandTotal()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? <LoadingSpinner size={16} /> : 'Save scheme'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          /* Schemes list */
          loading ? (
            <LoadingSpinner message="Loading schemes..." />
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Details</th>
                    <th>Total Marks</th>
                    <th>Sections</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.subject_name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.subject_code}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                         <div>{s.department || '-'}</div>
                         <div style={{ fontSize: '0.85rem' }}>Sem: {s.semester || '-'}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-primary-light)', fontSize: '1.1rem', fontWeight: 700 }}>{s.total_marks}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {s.sections?.length || 0} section(s)
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(s)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {schemes.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                        No marking schemes created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
  )
}

export default SchemeManager
