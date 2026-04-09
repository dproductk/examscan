from rest_framework import serializers
from .models import AmendmentRequest


class AmendmentRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    assigned_scanner_name = serializers.CharField(source='assigned_scanner.full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True)
    answer_sheet_id = serializers.IntegerField(source='answer_sheet.id', read_only=True)

    class Meta:
        model = AmendmentRequest
        fields = [
            'id', 'answer_sheet', 'answer_sheet_id',
            'requested_by', 'requested_by_name', 'requested_at',
            'assigned_scanner', 'assigned_scanner_name',
            'reason', 'notes', 'status',
            'resolved_at', 'resolved_by', 'resolved_by_name',
            'new_pdf_version',
        ]
        read_only_fields = [
            'id', 'requested_at', 'requested_by',
            'resolved_at', 'resolved_by', 'new_pdf_version',
        ]
