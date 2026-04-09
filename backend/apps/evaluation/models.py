from django.conf import settings
from django.db import models


class EvaluationResult(models.Model):
    """
    Stores the grading result for a single answer sheet.
    section_results JSON schema:
    [
        {
            "section_name": "A",
            "questions": [
                {"question_no": "1", "max_marks": 5, "marks_obtained": 4}
            ],
            "section_total": 4
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

    class Meta:
        db_table = 'evaluation_results'

    def __str__(self):
        return f"Evaluation for Sheet #{self.answer_sheet_id} — {self.total_marks} marks"
