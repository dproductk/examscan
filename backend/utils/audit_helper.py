"""
Audit logging helper.
Call log_action() at the END of every successful write operation.
"""
from apps.audit.models import AuditLog


def log_action(request, action_type, target_model, target_id, old_value=None, new_value=None, notes=''):
    """
    Create an audit log entry.

    Args:
        request: The Django REST Framework request object.
        action_type: One of AuditLog.ACTION_CHOICES values.
        target_model: Name of the model being acted upon.
        target_id: Primary key of the target object.
        old_value: JSON-serializable dict of old values (optional).
        new_value: JSON-serializable dict of new values (optional).
        notes: Free-text description of the action.
    """
    ip = request.META.get('REMOTE_ADDR')
    AuditLog.objects.create(
        action_type=action_type,
        performed_by=request.user if request.user.is_authenticated else None,
        target_model=target_model,
        target_id=str(target_id),
        old_value=old_value,
        new_value=new_value,
        ip_address=ip,
        notes=notes,
    )
