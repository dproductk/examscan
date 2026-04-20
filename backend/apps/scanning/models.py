from django.conf import settings
from django.db import models


class Subject(models.Model):
    """Academic subject for the examination."""
    subject_name = models.CharField(max_length=200)
    subject_code = models.CharField(max_length=50, unique=True)
    department = models.CharField(max_length=200)
    semester = models.PositiveSmallIntegerField()

    class Meta:
        db_table = 'subjects'
        ordering = ['subject_code']

    def __str__(self):
        return f"{self.subject_code} — {self.subject_name}"


class MarkingScheme(models.Model):
    """
    Marking scheme for a subject. One-to-one with Subject.
    sections JSON schema:
    [
        {
            "section_name": "A",
            "questions": [
                {"question_no": "1", "max_marks": 5},
                {"question_no": "2", "max_marks": 5}
            ]
        }
    ]
    """
    subject = models.OneToOneField(Subject, on_delete=models.CASCADE, related_name='marking_scheme')
    total_marks = models.PositiveIntegerField()
    sections = models.JSONField()

    class Meta:
        db_table = 'marking_schemes'

    def __str__(self):
        return f"Scheme for {self.subject.subject_code} (Total: {self.total_marks})"


class StudentToken(models.Model):
    """
    Maps an opaque short token to a real roll number.
    Only exam_dept and backend logic can access roll_number.
    Scanning staff and teachers never see this model's data directly.
    """
    token = models.CharField(max_length=50, unique=True, db_index=True)
    roll_number = models.CharField(max_length=50)
    subject = models.ForeignKey('scanning.Subject', on_delete=models.PROTECT, related_name='student_tokens')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)  # True once scanned

    class Meta:
        db_table = 'student_tokens'
        unique_together = ('roll_number', 'subject')  # one token per student per subject

    def __str__(self):
        return f"{self.token} → {self.roll_number}"


class Bundle(models.Model):
    """A physical bundle of answer sheets scanned together."""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('submitted', 'Submitted'),
    ]

    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name='bundles')
    bundle_number = models.CharField(max_length=100)
    total_sheets = models.PositiveIntegerField()
    academic_year = models.CharField(max_length=20, default='2025-26', help_text='e.g. 2025-26')
    qr_raw_data = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_bundles'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bundles'
        ordering = ['-created_at']

    def __str__(self):
        return f"Bundle #{self.bundle_number} — {self.subject.subject_code}"


class AnswerSheetImage(models.Model):
    """
    Individual scanned page image before PDF compilation.
    Temporary storage — cleaned up after finalization.
    """
    bundle = models.ForeignKey(Bundle, on_delete=models.CASCADE, related_name='images')
    token = models.CharField(max_length=50, blank=True)
    roll_number = models.CharField(max_length=50, blank=True)
    image = models.ImageField(upload_to='scanned_images/')
    page_number = models.PositiveIntegerField()
    is_first_page = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'answer_sheet_images'
        ordering = ['token', 'page_number']

    def __str__(self):
        return f"Image p{self.page_number} — Token: {self.token}"



class AnswerSheet(models.Model):
    """A finalized answer sheet PDF for a student in a bundle."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('under_evaluation', 'Under Evaluation'),
        ('completed', 'Completed'),
        ('flagged', 'Flagged'),
    ]
    FLAG_REASON_CHOICES = [
        ('Blurry', 'Blurry'),
        ('Malpractice', 'Malpractice'),
        ('Missing Pages', 'Missing Pages'),
        ('Other', 'Other'),
    ]

    bundle = models.ForeignKey(Bundle, on_delete=models.CASCADE, related_name='answer_sheets')
    token = models.CharField(max_length=50, db_index=True, blank=True, default='')
    roll_number = models.CharField(max_length=50)
    pdf_file = models.FileField(upload_to='answer_sheets/')
    pdf_version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    assigned_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='assigned_sheets'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='scanned_sheets'
    )
    scanned_at = models.DateTimeField(auto_now_add=True)
    last_flagged_at = models.DateTimeField(null=True, blank=True)
    flag_reason = models.CharField(max_length=50, choices=FLAG_REASON_CHOICES, null=True, blank=True)

    class Meta:
        db_table = 'answer_sheets'
        unique_together = ('bundle', 'token')
        ordering = ['token']

    def __str__(self):
        return f"Sheet {self.token or self.roll_number} — Bundle #{self.bundle.bundle_number}"
