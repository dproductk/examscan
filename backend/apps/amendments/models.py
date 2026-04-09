from django.conf import settings
from django.db import models


class AmendmentRequest(models.Model):
    """
    Request to rescan/fix an answer sheet.
    Created by exam dept or teachers, resolved by scanning staff.
    """
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
    ]
    REASON_CHOICES = [
        ('Blurry', 'Blurry'),
        ('Missing Pages', 'Missing Pages'),
        ('Wrong Paper', 'Wrong Paper'),
        ('Other', 'Other'),
    ]

    answer_sheet = models.ForeignKey(
        'scanning.AnswerSheet', on_delete=models.CASCADE, related_name='amendments'
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='amendment_requests'
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    assigned_scanner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_amendments'
    )
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_amendments'
    )
    new_pdf_version = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'amendment_requests'
        ordering = ['-requested_at']

    def __str__(self):
        return f"Amendment #{self.pk} — {self.reason} ({self.status})"
