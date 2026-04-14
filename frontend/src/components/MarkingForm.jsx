import { useState, useEffect, useMemo } from 'react'

function MarkingForm({ sections, existingResults, onSubmit, loading }) {
  // Initialize marks state from sections or existing results
  // Key format: `${q.name}_${sq.name}_${p.name}`
  const [marks, setMarks] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!sections) return

    const initial = {}
    sections.forEach((q) => {
      q.sub_questions?.forEach((sq) => {
        sq.parts?.forEach((p) => {
          const key = `${q.name}_${sq.name}_${p.name}`
          initial[key] = ''
        })
      })
    })

    // Pre-populate from existing results
    if (existingResults) {
      existingResults.forEach((q) => {
        q.sub_questions?.forEach((sq) => {
          sq.parts?.forEach((p) => {
            const key = `${q.name}_${sq.name}_${p.name}`
            initial[key] = p.marks_obtained ?? ''
          })
        })
      })
    }

    setMarks(initial)
  }, [sections, existingResults])

  const handleChange = (qName, sqName, pName, maxMarks, value) => {
    const key = `${qName}_${sqName}_${pName}`
    const numValue = value === '' ? '' : Number(value)

    setMarks((prev) => ({ ...prev, [key]: numValue }))

    // Validate
    if (value !== '' && (numValue < 0 || numValue > maxMarks)) {
      setErrors((prev) => ({ ...prev, [key]: `0–${maxMarks}` }))
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  // Compute calculated totals and max totals using attempt logic
  const computations = useMemo(() => {
    if (!sections) return { qTotals: {}, sqTotals: {}, grandTotal: 0 }
    
    const qTotals = {}
    const sqTotals = {}
    let grandTotal = 0

    sections.forEach(q => {
      let qSubTotals = []

      q.sub_questions?.forEach(sq => {
        let pTotals = []
        sq.parts?.forEach(p => {
          const val = marks[`${q.name}_${sq.name}_${p.name}`]
          if (val !== '' && !isNaN(val)) {
            pTotals.push(Number(val))
          } else {
            pTotals.push(0)
          }
        })

        // sub-question attempt logic
        let sqTotal = 0
        if (sq.rule === 'any' && sq.rule_count > 0) {
          pTotals.sort((a, b) => b - a)
          sqTotal = pTotals.slice(0, sq.rule_count).reduce((sum, v) => sum + v, 0)
        } else {
          sqTotal = pTotals.reduce((sum, v) => sum + v, 0)
        }
        
        sqTotals[`${q.name}_${sq.name}`] = sqTotal
        qSubTotals.push(sqTotal)
      })

      // question attempt logic
      let qTotal = 0
      if (q.rule === 'any' && q.rule_count > 0) {
        qSubTotals.sort((a, b) => b - a)
        qTotal = qSubTotals.slice(0, q.rule_count).reduce((sum, v) => sum + v, 0)
      } else {
        qTotal = qSubTotals.reduce((sum, v) => sum + v, 0)
      }

      qTotals[q.name] = qTotal
      grandTotal += qTotal
    })

    return { qTotals, sqTotals, grandTotal }
  }, [marks, sections])

  // Check if form is valid
  const isValid = useMemo(() => {
    if (!sections) return false
    const hasErrors = Object.keys(errors).length > 0
    // Every part must be filled
    const allFilled = sections.every((q) =>
      q.sub_questions?.every((sq) =>
        sq.parts?.every((p) => {
          const key = `${q.name}_${sq.name}_${p.name}`
          return marks[key] !== '' && marks[key] !== undefined
        })
      )
    )
    return !hasErrors && allFilled
  }, [marks, errors, sections])

  const handleSubmit = () => {
    if (!isValid || loading) return

    // Reconstruct payload mimicking sections structure
    const sectionResults = sections.map((q) => ({
      name: q.name,
      rule: q.rule,
      rule_count: q.rule_count,
      sub_questions: q.sub_questions.map((sq) => ({
        name: sq.name,
        rule: sq.rule,
        rule_count: sq.rule_count,
        parts: sq.parts.map((p) => ({
          name: p.name,
          max_marks: p.max_marks,
          marks_obtained: Number(marks[`${q.name}_${sq.name}_${p.name}`]),
        }))
      }))
    }))

    onSubmit(sectionResults, computations.grandTotal)
  }

  if (!sections || sections.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No marking scheme available for this subject.
      </div>
    )
  }

  const [collapsedQuestions, setCollapsedQuestions] = useState({})

  const toggleQuestion = (name) => {
    setCollapsedQuestions((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <div id="marking-form">
      {sections.map((q) => {
        const isExtraQ = q.rule === 'any'
        
        return (
          <div key={q.name} className="card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
            {/* Question Header */}
            <div
              className="flex-between"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleQuestion(q.name)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                  Question {q.name}
                </h3>
                {isExtraQ && (
                  <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'white', fontSize: '0.7rem' }}>
                    Any {q.rule_count}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span
                  style={{
                    fontSize: 'var(--font-size-md)',
                    color: 'var(--color-primary-light)',
                    fontWeight: 700,
                  }}
                >
                  {computations.qTotals[q.name] || 0}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {collapsedQuestions[q.name] ? '▸' : '▾'}
                </span>
              </div>
            </div>

            {/* Sub-questions */}
            {!collapsedQuestions[q.name] && (
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {q.sub_questions?.map((sq) => {
                  const isExtraSq = sq.rule === 'any'

                  return (
                    <div key={`${q.name}_${sq.name}`} style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600 }}>{sq.name}</span>
                          {isExtraSq && (
                            <span className="badge" style={{ background: 'var(--text-muted)', color: 'white', fontSize: '0.65rem' }}>
                              Any {sq.rule_count}
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary-light)', fontSize: '0.85rem' }}>
                          {computations.sqTotals[`${q.name}_${sq.name}`] || 0}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem' }}>
                        {sq.parts?.map((p) => {
                          const key = `${q.name}_${sq.name}_${p.name}`
                          return (
                            <div key={key}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textAlign: 'center' }}>
                                Part {p.name} <span style={{ opacity: 0.6 }}>({p.max_marks})</span>
                              </div>
                              <input
                                type="number"
                                className="form-input"
                                id={`marks-${key}`}
                                min={0}
                                max={p.max_marks}
                                step={0.5}
                                value={marks[key] ?? ''}
                                onChange={(e) =>
                                  handleChange(q.name, sq.name, p.name, p.max_marks, e.target.value)
                                }
                                placeholder={`0-${p.max_marks}`}
                                style={{ padding: '0.4rem', textAlign: 'center' }}
                              />
                              {errors[key] && <div style={{ color: 'var(--color-danger)', fontSize: '0.65rem', textAlign: 'center', marginTop: '0.1rem' }}>{errors[key]}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Grand Total & Submit */}
      <div className="card" style={{ background: 'var(--bg-primary)', border: '2px solid var(--bg-secondary)', marginTop: '2rem' }}>
        <div className="flex-between">
          <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Grand Total</span>
          <span
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 800,
              background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {computations.grandTotal}
          </span>
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: '1rem', height: '3.5rem' }}
        onClick={handleSubmit}
        disabled={!isValid || loading}
        id="submit-evaluation-btn"
      >
        {loading ? 'Submitting...' : 'Submit Evaluation'}
      </button>
    </div>
  )
}

export default MarkingForm
