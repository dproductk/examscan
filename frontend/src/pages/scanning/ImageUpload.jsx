import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { uploadImage, deleteImage, finalizeSheet } from '../../api/answerSheets'
import { getBundle } from '../../api/bundles'
import LoadingSpinner from '../../components/LoadingSpinner'
import Webcam from 'react-webcam'

function ImageUpload() {
  const { bundleId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const webcamRef = useRef(null)

  const [images, setImages] = useState([]) // [{id, preview, token, pageNumber}]
  const [currentToken, setCurrentToken] = useState('')
  const [isFirstPage, setIsFirstPage] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showCamera, setShowCamera] = useState(false)
  
  // Camera selection states
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')

  // Bundle progress states
  const [bundle, setBundle] = useState(null)
  const [loadingBundle, setLoadingBundle] = useState(true)

  const loadBundle = async () => {
    try {
      const { data } = await getBundle(bundleId)
      setBundle(data)
    } catch {
      setMessage({ type: 'error', text: 'Could not load bundle details.' })
    } finally {
      setLoadingBundle(false)
    }
  }

  useEffect(() => {
    loadBundle()
  }, [bundleId])

  const handleDevices = useCallback(
    (mediaDevices) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput')
      setDevices(videoDevices)
      if (videoDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(videoDevices[0].deviceId)
      }
    },
    [selectedDevice]
  )

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices)
  }, [handleDevices])

  const processFile = async (file) => {
    if (!file) return

    setUploading(true)
    setMessage({ type: '', text: '' })
    setShowCamera(false)

    const formData = new FormData()
    formData.append('image', file)
    formData.append('bundle_id', bundleId)
    formData.append('page_number', images.length + 1)
    formData.append('is_first_page', isFirstPage ? 'true' : 'false')
    if (!isFirstPage && currentToken) {
      formData.append('token', currentToken)
    }

    try {
      const { data } = await uploadImage(formData)

      if (data.detected_token) {
        setCurrentToken(data.detected_token)
        setMessage({ type: 'success', text: `✓ Barcode detected. Student Token: ${data.detected_token}` })
      }

      setImages((prev) => [
        ...prev,
        {
          id: data.id,
          preview: URL.createObjectURL(file),
          token: data.token || currentToken,
          pageNumber: data.page_number,
          is_blurry: data.is_blurry,
          is_low_quality: data.is_low_quality,
          quality_score: data.quality_score,
        },
      ])

      setIsFirstPage(false)
    } catch (err) {
      const errData = err.response?.data
      setMessage({
        type: 'error',
        text: errData?.error || (errData ? Object.values(errData).join(' ') : 'Upload failed. Please try again.'),
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleFileSelect = (e) => processFile(e.target.files?.[0])

  const captureWebcam = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (!imageSrc) return
    const res = await fetch(imageSrc)
    const blob = await res.blob()
    const file = new File([blob], 'captured_page.jpg', { type: 'image/jpeg' })
    processFile(file)
  }, [webcamRef, images.length, isFirstPage, currentToken])

  const handleDelete = async (imageId, index) => {
    try {
      await deleteImage(imageId)
      setImages((prev) => prev.filter((_, i) => i !== index))
      setMessage({ type: 'success', text: 'Image removed.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete image.' })
    }
  }

  const handleFinalize = async () => {
    if (!currentToken) {
      setMessage({ type: 'error', text: 'No token detected. Upload a first page with barcode.' })
      return
    }

    setFinalizing(true)
    setMessage({ type: '', text: '' })

    const hasBlurry = images.some((img) => img.is_blurry)
    const hasLowQuality = images.some((img) => img.is_low_quality)

    if (hasBlurry || hasLowQuality) {
      if (!window.confirm("One or more pages are flagged as blurry or low quality. Do you want to finalize this answer sheet anyway?")) {
        setFinalizing(false)
        return
      }
    }

    try {
      await finalizeSheet({ bundle_id: bundleId, token: currentToken })
      setMessage({ type: 'success', text: `Answer sheet for token ${currentToken} finalized!` })

      // Reload bundle to reflect incremented sheets_count
      await loadBundle()

      // Reset for next student
      setImages([])
      setCurrentToken('')
      setIsFirstPage(true)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Finalization failed.' })
    } finally {
      setFinalizing(false)
    }
  }

  const startNewSheet = () => {
    setImages([])
    setCurrentToken('')
    setIsFirstPage(true)
    setMessage({ type: '', text: '' })
  }

  if (loadingBundle) return <LoadingSpinner message="Loading..." />

  const isScanningComplete = bundle && bundle.sheets_count >= bundle.total_sheets

  return (
    <>
      <div className="page-container fade-in">
        <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h1>Scan Sheets</h1>
              <p>Bundle #{bundle?.bundle_number || bundleId} — Upload pages for each student</p>
            </div>
          </div>
          {bundle && (
            <div className="card" style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', background: isScanningComplete ? 'var(--color-success)' : 'var(--bg-dashboard)', color: isScanningComplete ? '#fff' : 'inherit' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{bundle.sheets_count} <span style={{ fontSize: '0.9rem', fontWeight: 400, opacity: 0.8 }}>/ {bundle.total_sheets}</span></div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sheets Scanned</div>
              </div>
              
              <button 
                className={`btn ${isScanningComplete ? 'btn-secondary' : 'btn-primary'}`}
                style={{ opacity: isScanningComplete ? 1 : 0.5, pointerEvents: isScanningComplete ? 'auto' : 'none' }}
                onClick={() => navigate(`/scanning/review/${bundleId}`)}
              >
                {isScanningComplete ? "Finalize Bundle →" : "Scanning Required"}
              </button>
            </div>
          )}
        </div>

        {/* Stepper */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.7 }}>
            <div style={{ background: '#10B981', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Scan QR</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Point camera at bundle cover QR</div>
            </div>
          </div>
          <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.7 }}>
            <div style={{ background: '#10B981', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Confirm</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Verify bundle details</div>
            </div>
          </div>
          <div className="card" style={{ padding: '1rem', border: '1px solid var(--color-secondary)', boxShadow: '0 0 0 1px var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--color-secondary)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Scan Sheets</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Upload each answer sheet</div>
            </div>
          </div>
        </div>

        {/* Current token display */}
        {currentToken && (
          <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--color-primary-glow)' }}>
            <div className="flex-between">
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Student Token (Encrypted)</span>
                <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, fontFamily: 'monospace' }}>{currentToken}</h2>
              </div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {images.length} page{images.length !== 1 ? 's' : ''} uploaded
              </span>
            </div>
          </div>
        )}

        {/* Upload area */}
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          {isScanningComplete ? (
             <div style={{ padding: '2rem' }}>
               <h2 style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>All sheets captured!</h2>
               <p style={{ color: 'var(--text-secondary)'}}>You have successfully scanned {bundle.total_sheets} sheets for this bundle. You can now finalize and submit.</p>
               <button className="btn btn-success btn-lg" style={{ marginTop: '1.5rem' }} onClick={() => navigate(`/scanning/review/${bundleId}`)}>Review & Submit Bundle</button>
             </div>
          ) : !showCamera ? (
            <>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => setShowCamera(true)}
                disabled={uploading}
                style={{ marginBottom: '1rem', display: 'block', width: '100%', maxWidth: '400px', margin: '0 auto 1rem auto' }}
                id="capture-image-btn"
              >
                {uploading ? <LoadingSpinner size={20} /> : (isFirstPage ? '📷 Capture First Page (Barcode)' : '📷 Capture Next Page')}
              </button>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: isFirstPage ? '1rem' : '0' }}>
                {isFirstPage
                  ? 'First page must contain the encrypted barcode label for student identification.'
                  : 'Upload subsequent pages in order.'}
              </p>
              
              <div style={{ marginTop: '1.5rem' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="image-file-input"
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  ▼ Or Select File Manually
                </button>
              </div>
            </>
          ) : (
            <div className="fade-in">
              {devices.length > 1 && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <label className="form-label" style={{ display: 'inline-block', marginRight: '0.5rem' }}>Camera:</label>
                  <select 
                    className="form-select" 
                    value={selectedDevice} 
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    style={{ display: 'inline-block', width: 'auto' }}
                  >
                    {devices.map((device, key) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${key + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ maxWidth: '600px', margin: '0 auto', borderRadius: '12px', overflow: 'hidden', position: 'relative', background: '#000' }}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ deviceId: selectedDevice ? { exact: selectedDevice } : undefined, facingMode: "environment" }}
                  style={{ width: '100%', display: 'block' }}
                />
                <button
                  onClick={captureWebcam}
                  style={{
                    position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: '#fff', border: '4px solid var(--color-primary)', borderRadius: '50%',
                    width: '64px', height: '64px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  title="Take Photo"
                >
                   <div style={{ width: '48px', height: '48px', border: '2px solid #ccc', borderRadius: '50%' }}></div>
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowCamera(false)}>Cancel Camera</button>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`toast ${message.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Image thumbnails */}
        {images.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: 'var(--font-size-lg)' }}>Uploaded Pages ({currentToken})</h3>
            <div className="grid-4">
              {images.map((img, idx) => {
                let borderStyle = undefined
                let opacity = 1
                if (img.is_blurry) {
                  borderStyle = '2px solid var(--color-danger)'
                  opacity = 0.7
                } else if (img.is_low_quality) {
                  borderStyle = '2px solid var(--color-warning)'
                  opacity = 0.85
                }
                
                return (
                <div key={img.id} className="card" style={{ padding: '0.75rem', position: 'relative', border: borderStyle }}>
                  <img
                    src={img.preview}
                    alt={`Page ${img.pageNumber}`}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.5rem',
                      opacity: opacity,
                    }}
                  />
                  {img.is_blurry && (
                    <div style={{
                      position: 'absolute', top: '16px', left: '16px', right: '16px',
                      background: 'var(--color-danger)', color: '#fff',
                      fontSize: '11px', fontWeight: 700, padding: '4px 8px', textAlign: 'center',
                      borderRadius: '4px', opacity: 0.95
                    }}>
                      ⚠️ Image Unclear
                    </div>
                  )}
                  {img.is_low_quality && (
                    <div style={{
                      position: 'absolute', top: '16px', left: '16px', right: '16px',
                      background: 'var(--color-warning)', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                      fontSize: '11px', fontWeight: 700, padding: '4px 8px', textAlign: 'center',
                      borderRadius: '4px', opacity: 0.95
                    }}>
                      ⚠️ Low Quality
                    </div>
                  )}
                  <div className="flex-between">
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      Page {img.pageNumber} {img.quality_score && `(Score: ${img.quality_score})`}
                    </span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(img.id, idx)}
                      id={`delete-image-${img.id}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="btn btn-success btn-lg"
              onClick={handleFinalize}
              disabled={finalizing || !currentToken}
              id="finalize-sheet-btn"
            >
              {finalizing ? <LoadingSpinner size={20} /> : '✓ Finalize Answer Sheet'}
            </button>
            <button className="btn btn-secondary" onClick={startNewSheet} id="new-sheet-btn">
              Clear Sequence
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default ImageUpload
