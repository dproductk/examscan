from rest_framework import generics
from apps.users.permissions import IsExamDept
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """GET /api/audit-log/ — Exam dept views the full audit trail."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsExamDept]

    def get_queryset(self):
        qs = AuditLog.objects.select_related('performed_by').all()

        # Optional filters
        action_type = self.request.query_params.get('action_type')
        target_model = self.request.query_params.get('target_model')
        target_id = self.request.query_params.get('target_id')

        if action_type:
            qs = qs.filter(action_type=action_type)
        if target_model:
            qs = qs.filter(target_model=target_model)
        if target_id:
            qs = qs.filter(target_id=target_id)

        return qs


class AuditLogDetailView(generics.RetrieveAPIView):
    """GET /api/audit-log/{id}/ — Exam dept views a single audit entry."""
    queryset = AuditLog.objects.select_related('performed_by').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsExamDept]
