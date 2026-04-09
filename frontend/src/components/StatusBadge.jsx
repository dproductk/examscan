const STATUS_MAP = {
  pending: { label: 'Pending', className: 'badge-pending' },
  assigned: { label: 'Assigned', className: 'badge-assigned' },
  under_evaluation: { label: 'Under Evaluation', className: 'badge-under_evaluation' },
  completed: { label: 'Completed', className: 'badge-completed' },
  flagged: { label: 'Flagged', className: 'badge-flagged' },
  open: { label: 'Open', className: 'badge-open' },
  submitted: { label: 'Submitted', className: 'badge-submitted' },
  in_progress: { label: 'In Progress', className: 'badge-in_progress' },
  resolved: { label: 'Resolved', className: 'badge-resolved' },
  rejected: { label: 'Rejected', className: 'badge-rejected' },
}

function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, className: '' }

  return (
    <span className={`badge ${config.className}`} id={`status-badge-${status}`}>
      {config.label}
    </span>
  )
}

export default StatusBadge
