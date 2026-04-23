from django.conf import settings
from django.db import models


class EvaluationResult(models.Model):
    """
    Stores the grading result for a single answer sheet.
    section_results JSON schema:
    [
        {
            "name": "Q1",
            "sub_questions": [
                {"name": "1a", "parts": [{"name": "i", "max_marks": 5, "marks_obtained": 4}]}
            ]
        }
    ]
    """
    answer_sheet = models.OneToOneField(
        'scanning.AnswerSheet', on_delete=models.CASCADE, related_name='evaluation'
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='evaluations'
    )
    section_results = models.JSONField()
    total_marks = models.PositiveIntegerField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(auto_now_add=True)
    last_edited_at = models.DateTimeField(auto_now=True)
    pdf_version_at_grading = models.PositiveIntegerField()
    was_amended = models.BooleanField(default=False)
    amended_at = models.DateTimeField(null=True, blank=True)

    # ── Mark badge positions ─────────────────────────────────────────────────
    mark_positions = models.JSONField(default=list)
    # List of badge dicts, e.g.:
    # [{"question_id": "Q1_1a_i", "value": 7, "page": 2,
    #   "x_percent": 42.5, "y_percent": 31.2}]
    # Positions stored as % of page dimensions → resolution-independent.

    marked_pdf_path = models.CharField(max_length=500, blank=True, null=True)
    # Path to annotated PDF relative to MEDIA_ROOT.
    # e.g. "answer_sheets/{bundle_id}/{token}_v2_marked.pdf"
    # The original AnswerSheet.pdf_file is NEVER modified.
    # ── End mark badge fields ────────────────────────────────────────────────

    class Meta:
        db_table = 'evaluation_results'

    def __str__(self):
        return f"Evaluation for Sheet #{self.answer_sheet_id} — {self.total_marks} marks"
