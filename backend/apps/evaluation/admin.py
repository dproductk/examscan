from django.contrib import admin
from .models import EvaluationResult


@admin.register(EvaluationResult)
class EvaluationResultAdmin(admin.ModelAdmin):
    list_display = ('answer_sheet', 'teacher', 'total_marks', 'submitted_at', 'last_edited_at')
    search_fields = ('answer_sheet__roll_number',)
    list_filter = ('submitted_at',)
