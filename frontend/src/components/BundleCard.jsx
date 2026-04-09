import StatusBadge from './StatusBadge'

function BundleCard({ bundle, onClick }) {
  const progress = bundle.sheets_count > 0
    ? Math.round((bundle.graded_count / bundle.sheets_count) * 100)
    : 0

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      id={`bundle-card-${bundle.id}`}
    >
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
          Bundle #{bundle.bundle_number}
        </h3>
        <StatusBadge status={bundle.status} />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
          {bundle.subject_code} — {bundle.subject_name}
        </p>
        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Created by: {bundle.created_by_name || '—'}
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex-between" style={{ marginBottom: '0.375rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Graded: {bundle.graded_count}/{bundle.sheets_count}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-light)', fontWeight: 600 }}>
            {progress}%
          </span>
        </div>
        <div
          style={{
            height: '6px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-primary)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default BundleCard
