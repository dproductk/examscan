function AuditTimeline({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No audit entries found.
      </div>
    )
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const ACTION_LABELS = {
    LOGIN: '🔑 Login',
    SCAN: '📷 Scan',
    SUBMIT_SESSION: '📦 Session Submitted',
    ASSIGN: '👤 Assignment',
    GRADE: '✏️ Grading',
    EDIT_MARKS: '📝 Marks Edited',
    FLAG: '🚩 Flagged',
    AMENDMENT_REQUEST: '🔧 Amendment Requested',
    AMENDMENT_COMPLETE: '✅ Amendment Completed',
    RESULT_GENERATED: '📊 Result Generated',
  }

  return (
    <div className="timeline" id="audit-timeline">
      {entries.map((entry) => (
        <div key={entry.id} className="timeline-item">
          <div className="timeline-time">{formatDate(entry.performed_at)}</div>
          <div className="timeline-action">
            {ACTION_LABELS[entry.action_type] || entry.action_type}
          </div>
          <div className="timeline-detail">
            {entry.performed_by_name && (
              <span>by {entry.performed_by_name}</span>
            )}
            {entry.notes && <span> — {entry.notes}</span>}
          </div>
          {entry.ip_address && (
            <div className="timeline-detail" style={{ fontSize: '0.65rem', opacity: 0.6 }}>
              IP: {entry.ip_address}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default AuditTimeline
