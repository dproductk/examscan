function LoadingSpinner({ size = 40, message = '' }) {
  return (
    <div className="spinner-overlay" id="loading-spinner">
      <div style={{ textAlign: 'center' }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 50 50"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="4"
            strokeDasharray="80, 200"
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        </svg>
        {message && (
          <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default LoadingSpinner
