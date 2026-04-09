from django.contrib import admin
from .models import Subject, MarkingScheme, Bundle, AnswerSheet, AnswerSheetImage


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('subject_code', 'subject_name', 'department', 'semester')
    search_fields = ('subject_code', 'subject_name', 'department')
    list_filter = ('department', 'semester')


@admin.register(MarkingScheme)
class MarkingSchemeAdmin(admin.ModelAdmin):
    list_display = ('subject', 'total_marks')
    search_fields = ('subject__subject_code', 'subject__subject_name')


@admin.register(Bundle)
class BundleAdmin(admin.ModelAdmin):
    list_display = ('bundle_number', 'subject', 'total_sheets', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'subject__department')
    search_fields = ('bundle_number', 'subject__subject_code')


@admin.register(AnswerSheet)
class AnswerSheetAdmin(admin.ModelAdmin):
    list_display = ('roll_number', 'bundle', 'status', 'assigned_teacher', 'pdf_version', 'uploaded_at')
    list_filter = ('status',)
    search_fields = ('roll_number',)


@admin.register(AnswerSheetImage)
class AnswerSheetImageAdmin(admin.ModelAdmin):
    list_display = ('roll_number', 'bundle', 'page_number', 'is_first_page', 'uploaded_at')
    list_filter = ('is_first_page',)
