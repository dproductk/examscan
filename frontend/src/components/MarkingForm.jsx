import { useState, useEffect, useMemo } from 'react'

function MarkingForm({ sections, existingResults, onSubmit, loading }) {
  // Initialize marks state from sections or existing results
  const [marks, setMarks] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!sections) return

    const initial = {}
    sections.forEach((section) => {
      section.questions.forEach((q) => {
        const key = `${section.section_name}_${q.question_no}`
        initial[key] = ''
      })
    })

    // Pre-populate from existing results
    if (existingResults) {
      existingResults.forEach((section) => {
        section.questions.forEach((q) => {
          const key = `${section.section_name}_${q.question_no}`
          initial[key] = q.marks_obtained ?? ''
        })
      })
    }

    setMarks(initial)
  }, [sections, existingResults])

  const handleChange = (sectionName, questionNo, maxMarks, value) => {
    const key = `${sectionName}_${questionNo}`
    const numValue = value === '' ? '' : Number(value)

    setMarks((prev) => ({ ...prev, [key]: numValue }))

    // Validate
    if (value !== '' && (numValue < 0 || numValue > maxMarks)) {
      setErrors((prev) => ({ ...prev, [key]: `Must be 0–${maxMarks}` }))
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  // Compute totals
  const sectionTotals = useMemo(() => {
    if (!sections) return {}
    const totals = {}
    sections.forEach((section) => {
      let total = 0
      section.questions.forEach((q) => {
        const key = `${section.section_name}_${q.question_no}`
        const val = marks[key]
        if (val !== '' && !isNaN(val)) total += Number(val)
      })
      totals[section.section_name] = total
    })
    return totals
  }, [marks, sections])

  const grandTotal = useMemo(
    () => Object.values(sectionTotals).reduce((sum, v) => sum + v, 0),
    [sectionTotals]
  )

  // Check if form is valid
  const isValid = useMemo(() => {
    if (!sections) return false
    const hasErrors = Object.keys(errors).length > 0
    const allFilled = sections.every((section) =>
      section.questions.every((q) => {
        const key = `${section.section_name}_${q.question_no}`
        return marks[key] !== '' && marks[key] !== undefined
      })
    )
    return !hasErrors && allFilled
  }, [marks, errors, sections])

  const handleSubmit = () => {
    if (!isValid || loading) return

    const sectionResults = sections.map((section) => ({
      section_name: section.section_name,
      questions: section.questions.map((q) => ({
        question_no: q.question_no,
        max_marks: q.max_marks,
        marks_obtained: Number(marks[`${section.section_name}_${q.question_no}`]),
      })),
      section_total: sectionTotals[section.section_name],
    }))

    onSubmit(sectionResults, grandTotal)
  }

  if (!sections || sections.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No marking scheme available for this subject.
      </div>
    )
  }

  const [collapsedSections, setCollapsedSections] = useState({})

  const toggleSection = (name) => {
    setCollapsedSections((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <div id="marking-form">
      {sections.map((section) => (
        <div key={section.section_name} className="card" style={{ marginBottom: '1rem' }}>
          {/* Section Header */}
          <div
            className="flex-between"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => toggleSection(section.section_name)}
          >
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
              Section {section.section_name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-primary-light)',
                  fontWeight: 600,
                }}
              >
                {sectionTotals[section.section_name] || 0} /{' '}
                {section.questions.reduce((s, q) => s + q.max_marks, 0)}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {collapsedSections[section.section_name] ? '▸' : '▾'}
              </span>
            </div>
          </div>

          {/* Questions */}
          {!collapsedSections[section.section_name] && (
            <div style={{ marginTop: '1rem' }}>
              {section.questions.map((q) => {
                const key = `${section.section_name}_${q.question_no}`
                return (
                  <div key={key} className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        Q{q.question_no}
                      </label>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        max: {q.max_marks}
                      </span>
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      id={`marks-${key}`}
                      min={0}
                      max={q.max_marks}
                      step={0.5}
                      value={marks[key] ?? ''}
                      onChange={(e) =>
                        handleChange(section.section_name, q.question_no, q.max_marks, e.target.value)
                      }
                      placeholder={`0 – ${q.max_marks}`}
                    />
                    {errors[key] && <p className="form-error">{errors[key]}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* Grand Total & Submit */}
      <div className="card" style={{ background: 'var(--bg-primary)' }}>
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
            {grandTotal}
          </span>
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: '1rem' }}
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
