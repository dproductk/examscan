from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action_type', 'performed_by', 'performed_at', 'target_model', 'target_id', 'ip_address')
    list_filter = ('action_type', 'target_model')
    search_fields = ('notes', 'target_id')
    readonly_fields = (
        'action_type', 'performed_by', 'performed_at', 'target_model',
        'target_id', 'old_value', 'new_value', 'ip_address', 'notes',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
