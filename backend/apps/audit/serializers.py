from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'action_type', 'performed_by', 'performed_by_name',
            'performed_at', 'target_model', 'target_id',
            'old_value', 'new_value', 'ip_address', 'notes',
        ]
        read_only_fields = fields
