import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { generateTokens, listTokens, uploadTokenFile } from '../../api/tokens'
import axiosInstance from '../../api/axiosInstance'
import LoadingSpinner from '../../components/LoadingSpinner'
import JsBarcode from 'jsbarcode'

// ── Barcode Label Component ──────────────────────────────
function BarcodeLabel({ token, width = 1.6, height = 50 }) {
  const svgRef = useRef()
  useEffect(() => {
    if (svgRef.current && token) {
      JsBarcode(svgRef.current, token, {
        format: 'CODE128',
        width: width,
        height: height,
        displayValue: false,
        margin: 0,
      })
    }
  }, [token, width, height])
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: '450px', width: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <svg ref={svgRef} style={{ width: '100%', height: 'auto' }} />
      </div>
      <div style={{ fontSize: '13px', fontFamily: 'monospace', marginTop: '6px', letterSpacing: '1px' }}>
        {token}
      </div>
    </div>
  )
}

function TokenManager() {
  const { user } = useAuth()

  // Subject selection
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  // Input modes
  const [inputMode, setInputMode] = useState('manual') // 'manual' | 'file'
  const [rollNumberText, setRollNumberText] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const fileInputRef = useRef(null)

  // Preview before generation
  const [previewRolls, setPreviewRolls] = useState([])
  const [showPreview, setShowPreview] = useState(false)

  // Results
  const [generatedTokens, setGeneratedTokens] = useState([])
  const [existingTokens, setExistingTokens] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Tab for viewing existing vs generated
  const [activeTab, setActiveTab] = useState('generate') // 'generate' | 'existing' | 'bundle'
  
  // Bundle Barcode State
  const [bundleNumber, setBundleNumber] = useState('')
  const [totalSheets, setTotalSheets] = useState('')
  const [bundleBarcodeData, setBundleBarcodeData] = useState('')

  useEffect(() => {
    fetchSubjects()
  }, [])

  useEffect(() => {
    if (activeTab === 'existing' && selectedSubject) {
      fetchExistingTokens()
    }
  }, [activeTab, selectedSubject])

  const fetchSubjects = async () => {
    try {
      const res = await axiosInstance.get('/api/bundles/subjects/')
      setSubjects(res.data.results || res.data || [])
    } catch {
      setMessage({ type: 'error', text: 'Failed to load subjects.' })
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchExistingTokens = async () => {
    if (!selectedSubject) return
    setLoading(true)
    try {
      const res = await listTokens({ subject_id: selectedSubject })
      setExistingTokens(res.data.results || res.data || [])
    } catch {
      setMessage({ type: 'error', text: 'Failed to load existing tokens.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Manual input: parse textarea ──
  const handleParseManual = () => {
    const rolls = rollNumberText
      .split(/[\n,;]+/)
      .map(r => r.trim())
      .filter(r => r.length > 0)
    const unique = [...new Set(rolls)]
    if (unique.length === 0) {
      setMessage({ type: 'error', text: 'Please enter at least one roll number.' })
      return
    }
    setPreviewRolls(unique)
    setShowPreview(true)
    setMessage({ type: '', text: '' })
  }

  // ── File upload: parse and preview ──
  const handleFileUpload = async () => {
    if (!uploadFile || !selectedSubject) {
      setMessage({ type: 'error', text: 'Please select a subject and upload a file.' })
      return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('subject_id', selectedSubject)
      const res = await uploadTokenFile(formData)
      const data = res.data
      setGeneratedTokens(data.tokens || [])
      setShowPreview(false)
      setMessage({
        type: 'success',
        text: `✓ ${data.count} tokens generated from ${data.source_file}`
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'File upload failed.'
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Generate tokens from preview ──
  const handleGenerate = async () => {
    if (!selectedSubject || previewRolls.length === 0) return
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const res = await generateTokens({
        subject_id: parseInt(selectedSubject),
        roll_numbers: previewRolls,
      })
      setGeneratedTokens(res.data)
      setShowPreview(false)
      setMessage({
        type: 'success',
        text: `✓ ${res.data.length} tokens generated successfully!`
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Token generation failed.'
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Download CSV ──
  const downloadCSV = (tokens) => {
    const header = 'Roll Number,Token\n'
    const rows = tokens.map(t => `${t.roll_number},${t.token}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tokens_${selectedSubject || 'all'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Print barcode sheet ──
  const handlePrint = () => {
    window.print()
  }

  // ── Generate Bundle Barcode ──
  const handleGenerateBundleBarcode = () => {
    if (!selectedSubject || !bundleNumber || !totalSheets) {
      setMessage({ type: 'error', text: 'Please fill all bundle fields.' })
      return
    }
    const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase()
    const jsonData = JSON.stringify({
      s: parseInt(selectedSubject),
      b: bundleNumber,
      c: parseInt(totalSheets),
      q: randomHash
    })
    setBundleBarcodeData(jsonData)
    setMessage({ type: 'success', text: 'Bundle barcode generated!' })
  }

  // Determine which token list to display
  const displayTokens = activeTab === 'existing' ? existingTokens : generatedTokens

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1>Token Manager</h1>
          <p>Generate encrypted barcodes for blind grading</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)' }}>
        <button
          className={`btn ${activeTab === 'generate' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === 'generate' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('generate')}
        >
          Generate Tokens
        </button>
        <button
          className={`btn ${activeTab === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === 'existing' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('existing')}
        >
          Existing Tokens
        </button>
        <button
          className={`btn ${activeTab === 'bundle' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '8px 8px 0 0', borderBottom: activeTab === 'bundle' ? '2px solid var(--color-primary)' : 'none' }}
          onClick={() => setActiveTab('bundle')}
        >
          Bundle Barcode
        </button>
      </div>

      {/* Subject selector */}
      <div className="card no-print" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Subject *</label>
          {loadingSubjects ? (
            <LoadingSpinner size={20} />
          ) : (
            <select
              className="form-select"
              value={selectedSubject}
              onChange={(e) => { setSelectedSubject(e.target.value); setGeneratedTokens([]); setExistingTokens([]) }}
              id="subject-select"
            >
              <option value="">Select a subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Generate Tab Content */}
      {activeTab === 'generate' && selectedSubject && (
        <div className="card no-print" style={{ marginBottom: '1.5rem' }}>
          {/* Input mode toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              className={`btn btn-sm ${inputMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('manual')}
            >
              Manual Entry
            </button>
            <button
              className={`btn btn-sm ${inputMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInputMode('file')}
            >
              CSV / Excel Upload
            </button>
          </div>

          {inputMode === 'manual' ? (
            <>
              <div className="form-group">
                <label className="form-label">Roll Numbers (one per line, or comma-separated)</label>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder={"2023CS001\n2023CS002\n2023CS003\n..."}
                  value={rollNumberText}
                  onChange={(e) => setRollNumberText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  id="roll-number-input"
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleParseManual}
                disabled={!rollNumberText.trim()}
                id="preview-tokens-btn"
              >
                Preview & Generate
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Upload File (.csv or .xlsx)</label>
                <div
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: uploadFile ? 'var(--color-primary-glow)' : 'transparent',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                    id="file-upload-input"
                  />
                  {uploadFile ? (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                      <div style={{ fontWeight: 600 }}>{uploadFile.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {(uploadFile.size / 1024).toFixed(1)} KB — Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                      <div style={{ fontWeight: 500 }}>Drop a file here or click to browse</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Supports .csv and .xlsx files. Auto-detects roll number column.
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleFileUpload}
                disabled={!uploadFile || loading}
                id="upload-generate-btn"
              >
                {loading ? <LoadingSpinner size={18} /> : 'Upload & Generate Tokens'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="modal-backdrop" onClick={() => setShowPreview(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Confirm Token Generation</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div style={{ padding: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {previewRolls.length} roll numbers will be processed. Existing tokens will be reused.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {previewRolls.map((roll, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'var(--bg-dashboard)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {roll}
                  </span>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreview(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading}
                id="confirm-generate-btn"
              >
                {loading ? <LoadingSpinner size={16} /> : `Generate ${previewRolls.length} Tokens`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bundle Tab Content */}
      {activeTab === 'bundle' && selectedSubject && (
        <div className="card no-print" style={{ marginBottom: '1.5rem' }}>
          <h3>Generate Bundle Barcode</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Generate a barcode to stick onto the bundle cover. Scanning staff can scan this barcode to instantly set up the bundle session attributes without manual typing, eliminating errors.
          </p>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="bundle-number">Bundle Number</label>
              <input
                id="bundle-number"
                type="text"
                className="form-input"
                value={bundleNumber}
                onChange={(e) => setBundleNumber(e.target.value)}
                placeholder="e.g., B-2024-CS101-001"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="total-sheets">Total Sheets in Bundle</label>
              <input
                id="total-sheets"
                type="number"
                className="form-input"
                min={1}
                value={totalSheets}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setTotalSheets(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerateBundleBarcode}
            disabled={!bundleNumber || !totalSheets}
          >
            Generate Barcode
          </button>
        </div>
      )}

      {/* Messages */}
      {message.text && (
        <div className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
          {message.text}
        </div>
      )}

      {/* Results Table */}
      {displayTokens.length > 0 && (
        <div className="no-print">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)' }}>
              {activeTab === 'existing' ? 'Existing' : 'Generated'} Tokens ({displayTokens.length})
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadCSV(displayTokens)}>
                📥 Download CSV
              </button>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                🖨️ Print / Download PDF
              </button>
            </div>
          </div>

          <div className="table-container" style={{ borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll Number</th>
                  <th>Token</th>
                  <th>Barcode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayTokens.map((t, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.roll_number}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>{t.token}</td>
                    <td><BarcodeLabel token={t.token} /></td>
                    <td>
                      {t.is_used ? (
                        <span className="badge badge-submitted">Scanned</span>
                      ) : (
                        <span className="badge badge-open">Unused</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print-only barcode table */}
      {displayTokens.length > 0 && (
        <div className="print-only" style={{ padding: '2rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Barcode List — {subjects.find(s => s.id === parseInt(selectedSubject))?.subject_code || 'Subject'}
          </h2>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            margin: '0 auto',
            maxWidth: '800px'
          }}>
            <thead>
              <tr>
                <th style={{ border: '2px solid #000', padding: '12px', textAlign: 'left', width: '30%', fontSize: '1.1rem' }}>Roll Number</th>
                <th style={{ border: '2px solid #000', padding: '12px', textAlign: 'center', fontSize: '1.1rem' }}>Barcode Label</th>
              </tr>
            </thead>
            <tbody>
              {displayTokens.map((t, idx) => (
                <tr key={idx} style={{ pageBreakInside: 'avoid' }}>
                  <td style={{ 
                    border: '2px solid #000', 
                    padding: '12px', 
                    fontFamily: 'monospace', 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold',
                    verticalAlign: 'middle'
                  }}>
                    {t.roll_number}
                  </td>
                  <td style={{ 
                    border: '2px solid #000', 
                    padding: '16px 12px', 
                    textAlign: 'center',
                    verticalAlign: 'middle'
                  }}>
                    <BarcodeLabel token={t.token} width={2} height={60} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {activeTab === 'existing' && selectedSubject && existingTokens.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No tokens generated yet</h3>
          <p>Switch to "Generate Tokens" to create barcodes for this subject.</p>
        </div>
      )}
      {/* Bundle Barcode Print Sheet */}
      {activeTab === 'bundle' && bundleBarcodeData && (
        <div className="print-only print-sheet bundle-print-sheet" style={{ display: 'none' }}>
           <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
               <h2>{subjects.find(s => s.id === parseInt(selectedSubject))?.subject_code} — Bundle Record</h2>
               <h3>Bundle: {bundleNumber} ({totalSheets} Sheets)</h3>
           </div>
           
           <div style={{ border: '2px solid #000', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
               <BarcodeLabel token={bundleBarcodeData} width={2} height={100} />
           </div>
        </div>
      )}

      {/* Bundle UI Results (Screen Only) */}
      {activeTab === 'bundle' && bundleBarcodeData && (
        <div className="no-print card" style={{ textAlign: 'center' }}>
           <h3 style={{ marginBottom: '1rem' }}>Generated Bundle Barcode</h3>
           <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2rem', display: 'inline-block', backgroundColor: '#fff', color: '#000', marginBottom: '1rem' }}>
              <BarcodeLabel token={bundleBarcodeData} width={1.8} height={80} />
           </div>
           <div>
               <button className="btn btn-primary btn-lg" onClick={handlePrint}>🖨️ Print Bundle Label</button>
           </div>
        </div>
      )}

    </div>
  )
}

export default TokenManager
