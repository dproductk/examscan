from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.users.permissions import IsExamDept
from apps.evaluation.models import EvaluationResult
from apps.scanning.models import Subject, Bundle, AnswerSheet
from utils.audit_helper import log_action
from .excel_export import generate_excel_report
from .pdf_export import generate_pdf_report


class ReportsSummaryView(APIView):
    """
    GET /api/reports/
    Returns summary statistics for the exam dept dashboard.
    """
    permission_classes = [IsExamDept]

    def get(self, request):
        subject_id = request.query_params.get('subject')

        sheets_qs = AnswerSheet.objects.all()
        eval_qs = EvaluationResult.objects.all()

        if subject_id:
            sheets_qs = sheets_qs.filter(bundle__subject_id=subject_id)
            eval_qs = eval_qs.filter(answer_sheet__bundle__subject_id=subject_id)

        total_sheets = sheets_qs.count()
        graded_sheets = sheets_qs.filter(status='completed').count()

        bundles_qs = Bundle.objects.filter(status='submitted')
        if subject_id:
            bundles_qs = bundles_qs.filter(subject_id=subject_id)

        total_bundles = bundles_qs.count()
        unassigned_bundles = bundles_qs.filter(answer_sheets__assigned_teacher__isnull=True).distinct().count()
        assigned_bundles = total_bundles - unassigned_bundles

        # Average marks
        evaluations = eval_qs.values_list('total_marks', flat=True)
        avg_marks = sum(evaluations) / len(evaluations) if evaluations else 0

        # Per-subject breakdown
        subjects = Subject.objects.all()
        subject_breakdown = []
        for subj in subjects:
            subj_sheets = sheets_qs.filter(bundle__subject=subj)
            subj_evals = eval_qs.filter(answer_sheet__bundle__subject=subj)
            subj_marks = subj_evals.values_list('total_marks', flat=True)

            subject_breakdown.append({
                'subject_code': subj.subject_code,
                'subject_name': subj.subject_name,
                'total_sheets': subj_sheets.count(),
                'graded': subj_sheets.filter(status='completed').count(),
                'average_marks': round(sum(subj_marks) / len(subj_marks), 2) if subj_marks else 0,
            })

        return Response({
            'total_bundles': total_bundles,
            'unassigned_bundles': unassigned_bundles,
            'assigned_bundles': assigned_bundles,
            'total_sheets': total_sheets,
            'graded_sheets': graded_sheets,
            'average_marks': round(avg_marks, 2),
            'subject_breakdown': subject_breakdown,
        })


class ExcelExportView(APIView):
    """GET /api/reports/export/excel/ — Download results as Excel."""
    permission_classes = [IsExamDept]

    def get(self, request):
        subject_id = request.query_params.get('subject')

        log_action(
            request, 'RESULT_GENERATED', 'Report', 0,
            notes=f'Excel report exported. Subject filter: {subject_id or "all"}.'
        )

        return generate_excel_report(subject_id=subject_id)


class PDFExportView(APIView):
    """GET /api/reports/export/pdf/ — Download results as PDF."""
    permission_classes = [IsExamDept]

    def get(self, request):
        subject_id = request.query_params.get('subject')

        log_action(
            request, 'RESULT_GENERATED', 'Report', 0,
            notes=f'PDF report exported. Subject filter: {subject_id or "all"}.'
        )

        return generate_pdf_report(subject_id=subject_id)
