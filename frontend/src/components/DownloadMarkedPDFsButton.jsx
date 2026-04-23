import { useState } from 'react'
import { downloadMarkedPDFs } from '../api/reports'

export default function DownloadMarkedPDFsButton({ subjectId, bundleId, completedCount }) {
  const [state, setState] = useState('idle')
  // state: 'idle' | 'loading' | 'done' | 'error'

  const handleClick = async () => {
    if (state === 'loading') return
    setState('loading')
    try {
      await downloadMarkedPDFs(
        subjectId ? { subject_id: subjectId } : { bundle_id: bundleId }
      )
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch (err) {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const labels = {
    idle:    `↓ Download Marked PDFs (${completedCount})`,
    loading: 'Preparing ZIP...',
    done:    '✓ Download started',
    error:   '✗ Failed — retry?',
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading' || completedCount === 0}
      style={{
        padding: '6px 14px',
        fontSize: '13px',
        borderRadius: '6px',
        border: '1px solid',
        cursor: state === 'loading' || completedCount === 0 ? 'not-allowed' : 'pointer',
        borderColor: state === 'error' ? '#E53E3E'
                   : state === 'done'  ? '#1D9E75'
                   : '#CBD5E0',
        color: state === 'error' ? '#E53E3E'
             : state === 'done'  ? '#1D9E75'
             : '#2D3748',
        background: 'white',
        opacity: completedCount === 0 ? 0.5 : 1,
      }}
    >
      {labels[state]}
    </button>
  )
}
