from django.contrib import admin
from .models import AmendmentRequest


@admin.register(AmendmentRequest)
class AmendmentRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'answer_sheet', 'reason', 'status', 'requested_by', 'requested_at', 'resolved_at')
    list_filter = ('status', 'reason')
    search_fields = ('answer_sheet__roll_number', 'notes')
