import { useState } from 'react'
import { downloadModerationBundlePDF } from '../api/reports'

export default function DownloadModerationReportButton({ bundleId, disabled }) {
  const [state, setState] = useState('idle')
  // state: 'idle' | 'loading' | 'done' | 'error'

  const handleClick = async (e) => {
    e.stopPropagation()
    if (state === 'loading' || disabled) return
    setState('loading')
    try {
      await downloadModerationBundlePDF(bundleId)
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch (err) {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  const labels = {
    idle:    `↓ Download Moderation Report`,
    loading: 'Generating PDF...',
    done:    '✓ Download started',
    error:   '✗ Failed — retry?',
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading' || disabled}
      style={{
        padding: '6px 14px',
        fontSize: '13px',
        borderRadius: '6px',
        border: '1px solid',
        cursor: state === 'loading' || disabled ? 'not-allowed' : 'pointer',
        borderColor: state === 'error' ? '#E53E3E'
                   : state === 'done'  ? '#D97706'
                   : '#CBD5E0',
        color: state === 'error' ? '#E53E3E'
             : state === 'done'  ? '#D97706'
             : '#2D3748',
        background: 'white',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {labels[state]}
    </button>
  )
}
