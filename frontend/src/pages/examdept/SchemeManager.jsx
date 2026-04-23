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
  const [questions, setQuestions] = useState([])

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
    
    // Map existing structure
    const loadedQuestions = (scheme.sections || []).map(q => ({
      id: uuidv4(),
      name: q.name || 'Q1',
      rule: q.rule || 'all',
      rule_count: q.rule_count || '',
      sub_questions: (q.sub_questions || []).map(sq => ({
        id: uuidv4(),
        name: sq.name || 'A',
        rule: sq.rule || 'all',
        rule_count: sq.rule_count || '',
        parts: (sq.parts || []).map(p => ({
          id: uuidv4(),
          name: p.name || '1',
          max_marks: p.max_marks || ''
        }))
      }))
    }))
    
    setQuestions(loadedQuestions)
    setShowForm(true)
  }

  const handleNew = () => {
    setEditingId(null)
    setSubjectName('')
    setSubjectCode('')
    setDepartment('')
    setSemester('')
    setQuestions([
      {
        id: uuidv4(),
        name: 'Q1',
        rule: 'all',
        rule_count: '',
        sub_questions: [
          {
            id: uuidv4(),
            name: 'Q1A',
            rule: 'all',
            rule_count: '',
            parts: [
              { id: uuidv4(), name: '1', max_marks: '' },
              { id: uuidv4(), name: '2', max_marks: '' },
              { id: uuidv4(), name: '3', max_marks: '' }
            ]
          },
          {
            id: uuidv4(),
            name: 'Q1B',
            rule: 'all',
            rule_count: '',
            parts: [
               { id: uuidv4(), name: '1', max_marks: '' },
               { id: uuidv4(), name: '2', max_marks: '' }
            ]
          }
        ]
      }
    ])
    setShowForm(true)
  }

  // --- Question Helpers ---
  const addQuestion = () => {
    const nextQIdx = questions.length + 1;
    setQuestions([
      ...questions,
      {
        id: uuidv4(),
        name: `Q${nextQIdx}`,
        rule: 'all',
        rule_count: '',
        sub_questions: [
          {
            id: uuidv4(),
            name: `Q${nextQIdx}A`,
            rule: 'all',
            rule_count: '',
            parts: [{ id: uuidv4(), name: '1', max_marks: '' }]
          }
        ]
      }
    ])
  }

  const removeQuestion = (qId) => {
    setQuestions(questions.filter(q => q.id !== qId))
  }

  const updateQuestion = (qId, field, value) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, [field]: value } : q))
  }

  // --- Sub-Question Helpers ---
  const addSubQuestion = (qId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const nextLetter = String.fromCharCode(65 + q.sub_questions.length);
        return {
          ...q,
          sub_questions: [
            ...q.sub_questions,
            {
              id: uuidv4(),
              name: `${q.name}${nextLetter}`,
              rule: 'all',
              rule_count: '',
              parts: [{ id: uuidv4(), name: '1', max_marks: '' }]
            }
          ]
        }
      }
      return q;
    }))
  }

  const removeSubQuestion = (qId, sqId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          sub_questions: q.sub_questions.filter(sq => sq.id !== sqId)
        }
      }
      return q;
    }))
  }

  const updateSubQuestion = (qId, sqId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          sub_questions: q.sub_questions.map(sq => sq.id === sqId ? { ...sq, [field]: value } : sq)
        }
      }
      return q;
    }))
  }

  // --- Part Helpers ---
  const addPart = (qId, sqId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          sub_questions: q.sub_questions.map(sq => {
            if (sq.id === sqId) {
              return {
                ...sq,
                parts: [
                  ...sq.parts,
                  { id: uuidv4(), name: `${sq.parts.length + 1}`, max_marks: '' }
                ]
              }
            }
            return sq;
          })
        }
      }
      return q;
    }))
  }

  const removePart = (qId, sqId, pId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          sub_questions: q.sub_questions.map(sq => {
            if (sq.id === sqId) {
              return {
                ...sq,
                parts: sq.parts.filter(p => p.id !== pId)
              }
            }
            return sq;
          })
        }
      }
      return q;
    }))
  }

  const updatePart = (qId, sqId, pId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          sub_questions: q.sub_questions.map(sq => {
            if (sq.id === sqId) {
              return {
                ...sq,
                parts: sq.parts.map(p => p.id === pId ? { ...p, [field]: value } : p)
              }
            }
            return sq;
          })
        }
      }
      return q;
    }))
  }

  // Calculations
  const calculateTotals = () => {
    let totalOnPaper = 0;
    let resultOutOf = 0;
    let totalQuestions = questions.length;

    questions.forEach(q => {
      let qTotalOnPaper = 0;
      let sqOuts = [];

      q.sub_questions.forEach(sq => {
        let sqTotalOnPaper = 0;
        let pOuts = [];

        sq.parts.forEach(p => {
          const marks = parseFloat(p.max_marks) || 0;
          sqTotalOnPaper += marks;
          pOuts.push(marks);
        });

        qTotalOnPaper += sqTotalOnPaper;

        let sqResult = 0;
        if (sq.rule === 'any' && parseInt(sq.rule_count) > 0) {
          pOuts.sort((a, b) => b - a);
          sqResult = pOuts.slice(0, parseInt(sq.rule_count)).reduce((sum, val) => sum + val, 0);
        } else {
          sqResult = sqTotalOnPaper;
        }
        sqOuts.push(sqResult);
      });

      totalOnPaper += qTotalOnPaper;

      let qResult = 0;
      if (q.rule === 'any' && parseInt(q.rule_count) > 0) {
        sqOuts.sort((a, b) => b - a);
        qResult = sqOuts.slice(0, parseInt(q.rule_count)).reduce((sum, val) => sum + val, 0);
      } else {
        qResult = sqOuts.reduce((sum, val) => sum + val, 0);
      }
      resultOutOf += qResult;
    });

    return {
      totalOnPaper,
      resultOutOf,
      extraMarks: totalOnPaper < resultOutOf ? 0 : totalOnPaper - resultOutOf,
      totalQuestions
    };
  };

  const calculateSubQuestionResultOutOf = (sq) => {
    let pOuts = [];
    sq.parts.forEach(p => {
      pOuts.push(parseFloat(p.max_marks) || 0);
    });
    if (sq.rule === 'any' && parseInt(sq.rule_count) > 0) {
      pOuts.sort((a, b) => b - a);
      return pOuts.slice(0, parseInt(sq.rule_count)).reduce((sum, val) => sum + val, 0);
    }
    return pOuts.reduce((sum, val) => sum + val, 0);
  };

  const calculateQuestionResultOutOf = (q) => {
    let sqOuts = [];
    q.sub_questions.forEach(sq => {
      sqOuts.push(calculateSubQuestionResultOutOf(sq));
    });
    if (q.rule === 'any' && parseInt(q.rule_count) > 0) {
      sqOuts.sort((a, b) => b - a);
      return sqOuts.slice(0, parseInt(q.rule_count)).reduce((sum, val) => sum + val, 0);
    }
    return sqOuts.reduce((sum, val) => sum + val, 0);
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    if (!subjectName || !subjectCode) {
      setMessage({ type: 'error', text: 'Subject Name and Subject Code are required.' })
      return
    }

    // Clean payload for API (remove internal IDs, convert types)
    const cleanQuestions = questions.map(q => ({
      name: q.name,
      rule: q.rule,
      rule_count: q.rule === 'any' ? (parseInt(q.rule_count) || null) : null,
      sub_questions: q.sub_questions.map(sq => ({
        name: sq.name,
        rule: sq.rule,
        rule_count: sq.rule === 'any' ? (parseInt(sq.rule_count) || null) : null,
        parts: sq.parts.map(p => ({
          name: p.name,
          max_marks: parseFloat(p.max_marks) || 0
        }))
      }))
    }))

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const payload = {
        subject_name: subjectName,
        subject_code: subjectCode,
        department: department,
        semester: semester ? parseInt(semester) : null,
        sections: cleanQuestions 
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
      console.error("Save error:", err, err.response?.data);
      let errMsg = 'Save failed.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') errMsg = err.response.data;
        else if (err.response.data.error) errMsg = err.response.data.error;
        else if (err.response.data.sections && Array.isArray(err.response.data.sections)) errMsg = err.response.data.sections[0];
        else errMsg = JSON.stringify(err.response.data);
      } else if (err.message) {
        errMsg = err.message;
      }
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSaving(false)
    }
  }

  return (
      <div className="page-container fade-in">
        <div className="page-header">
          <div className="flex-between">
            <div>
              <h1 style={{ fontWeight: 800 }}>Marking Schemes</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Manage question paper marking schemes</p>
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

        {showForm ? (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>{totals.totalOnPaper}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total on paper</p>
              </div>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ color: 'var(--color-success)', fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>{totals.resultOutOf}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Result out of</p>
              </div>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ color: 'rgb(147, 51, 234)', fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>{totals.extraMarks}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Extra / choice marks</p>
              </div>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', marginBottom: '0.5rem', lineHeight: 1 }}>{totals.totalQuestions}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Questions</p>
              </div>
            </div>

            {/* Subject details card */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Subject details</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Subject Name</label>
                        <input 
                          type="text"
                          value={subjectName}
                          onChange={e => setSubjectName(e.target.value)}
                          placeholder="e.g. Data Structures"
                          style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.95rem', minWidth: '200px' }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Subject Code</label>
                        <input 
                          type="text"
                          value={subjectCode}
                          onChange={e => setSubjectCode(e.target.value)}
                          placeholder="e.g. CS301"
                          style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.95rem', width: '120px' }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Department</label>
                        <input 
                          type="text"
                          value={department}
                          onChange={e => setDepartment(e.target.value)}
                          placeholder="e.g. Computer Science"
                          style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.95rem', minWidth: '150px' }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Semester</label>
                        <input 
                          type="number"
                          value={semester}
                          onChange={e => setSemester(e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          placeholder="e.g. 5"
                          style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.6rem 1rem', fontSize: '0.95rem', width: '90px' }} 
                        />
                    </div>
                </div>
            </div>

            {/* Paper structure grid */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Paper structure</h3>
              {questions.map((q, qIdx) => (
                  <div key={q.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '1.5rem', overflow: 'hidden' }}>
                     {/* Question Header */}
                     <div style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', minWidth: '30px' }}>{q.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Sub-question rule:</div>
                        <select 
                           style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.9rem', outline: 'none' }}
                           value={q.rule}
                           onChange={e => updateQuestion(q.id, 'rule', e.target.value)}
                        >
                           <option value="all">Answer all</option>
                           <option value="any">Attempt any</option>
                        </select>
                        {q.rule === 'any' && (
                            <input 
                              type="number" 
                              style={{ width: '60px', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
                              value={q.rule_count} 
                              onChange={e => updateQuestion(q.id, 'rule_count', e.target.value)} 
                              onWheel={(e) => e.target.blur()}
                              placeholder="e.g. 2"
                            />
                        )}
                        <div style={{ marginLeft: 'auto', background: '#dcfce7', color: '#16a34a', padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700 }}>
                          {calculateQuestionResultOutOf(q)} marks
                        </div>
                        <button style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '0.5rem' }} onClick={() => removeQuestion(q.id)}>&times;</button>
                     </div>

                     {/* Sub-questions */}
                     <div style={{ padding: '0' }}>
                        {q.sub_questions.map((sq, sqIdx) => (
                            <div key={sq.id} style={{ borderBottom: sqIdx < q.sub_questions.length - 1 ? '1px solid #f1f5f9' : 'none', padding: '1.5rem' }}>
                                {/* Sub-question Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem', minWidth: '35px' }}>{sq.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Part rule:</div>
                                    <select 
                                        style={{ background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.8rem', fontSize: '0.9rem', outline: 'none' }}
                                        value={sq.rule}
                                        onChange={e => updateSubQuestion(q.id, sq.id, 'rule', e.target.value)}
                                    >
                                       <option value="all">Answer all</option>
                                       <option value="any">Attempt any</option>
                                    </select>
                                    {sq.rule === 'any' && (
                                       <input 
                                         type="number" 
                                         style={{ width: '60px', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                         value={sq.rule_count} 
                                         onChange={e => updateSubQuestion(q.id, sq.id, 'rule_count', e.target.value)} 
                                         onWheel={(e) => e.target.blur()}
                                         placeholder="e.g. 2"
                                       />
                                    )}
                                    <div style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem', fontWeight: 700 }}>
                                       {calculateSubQuestionResultOutOf(sq)} marks
                                    </div>
                                    <button style={{ background: 'transparent', border: 'none', color: '#e2e8f0', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '0.5rem' }} onClick={() => removeSubQuestion(q.id, sq.id)}>&times;</button>
                                </div>

                                {/* Parts grid */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {sq.parts.map((p, pIdx) => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{p.name}.</span>
                                            <input 
                                                type="number" 
                                                style={{ width: '48px', background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem', textAlign: 'center', fontSize: '0.95rem', outline: 'none' }} 
                                                value={p.max_marks}
                                                placeholder=""
                                                onWheel={(e) => e.target.blur()}
                                                onChange={e => updatePart(q.id, sq.id, p.id, 'max_marks', e.target.value)}
                                            />
                                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>marks</span>
                                            <button style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', marginLeft: '0.2rem', padding: '0 4px', fontSize: '1.1rem' }} onClick={() => removePart(q.id, sq.id, p.id)}>&times;</button>
                                        </div>
                                    ))}
                                    <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#fafafb', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => addPart(q.id, sq.id)}>+</button>
                                </div>
                            </div>
                        ))}
                     </div>
                     <div style={{ padding: '1rem', background: '#fafafa', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
                         <button className="btn btn-secondary btn-sm" style={{ background: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, width: 'fit-content' }} onClick={() => addSubQuestion(q.id)}>
                            + Add {String.fromCharCode(65 + q.sub_questions.length)}
                         </button>
                     </div>
                  </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.75rem 2rem', border: '1px dashed #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', fontWeight: 600 }} onClick={addQuestion}>
                      + Add question
                  </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? <LoadingSpinner size={16} /> : 'Save scheme'}
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          /* Schemes list */
          loading ? (
            <LoadingSpinner message="Loading schemes..." />
          ) : (
            <div className="table-container fade-in">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Details</th>
                    <th>Total Marks</th>
                    <th>Paper Config</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {schemes.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.subject_name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.subject_code}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                         <div>{s.department || '-'}</div>
                         <div style={{ fontSize: '0.85rem' }}>Sem: {s.semester || '-'}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-success)', fontSize: '1.1rem', fontWeight: 700 }}>{s.total_marks}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {s.sections?.length || 0} question(s)
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
