import io
import zipfile
from collections import defaultdict

from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from apps.users.permissions import IsExamDept
from apps.evaluation.models import EvaluationResult
from apps.scanning.models import Subject, Bundle, AnswerSheet
from utils.audit_helper import log_action
from .excel_export import generate_excel_report
from .pdf_export import generate_student_pdf_response, generate_student_pdf_bytes


# ── Helper ────────────────────────────────────────
def _build_student_data(request):
    """
    Query EvaluationResults filtered by request query params and return:
    - students: list of grouped student dicts
    - filters: dict of available filter values for dropdowns
    """
    department = request.query_params.get('department', '')
    semester = request.query_params.get('semester', '')
    academic_year = request.query_params.get('academic_year', '')
    subject_id = request.query_params.get('subject', '')
    roll_number = request.query_params.get('roll_number', '')

    qs = EvaluationResult.objects.select_related(
        'answer_sheet',
        'answer_sheet__bundle',
        'answer_sheet__bundle__subject',
        'teacher',
    ).filter(answer_sheet__bundle__status='submitted')

    if department:
        qs = qs.filter(answer_sheet__bundle__subject__department=department)
    if semester:
        qs = qs.filter(answer_sheet__bundle__subject__semester=int(semester))
    if academic_year:
        qs = qs.filter(answer_sheet__bundle__academic_year=academic_year)
    if subject_id:
        qs = qs.filter(answer_sheet__bundle__subject_id=subject_id)
    if roll_number:
        qs = qs.filter(answer_sheet__roll_number__icontains=roll_number)

    # Group by roll_number
    grouped = defaultdict(lambda: {
        'roll_number': '',
        'department': '',
        'semester': '',
        'academic_year': '',
        'subjects': [],
        'grand_total': 0,
    })

    for result in qs:
        sheet = result.answer_sheet
        bundle = sheet.bundle
        subject = bundle.subject
        roll = sheet.roll_number

        entry = grouped[roll]
        entry['roll_number'] = roll
        entry['department'] = subject.department
        entry['semester'] = subject.semester
        entry['academic_year'] = bundle.academic_year

        # Get max_marks from marking scheme if available
        max_marks = 0
        try:
            max_marks = subject.marking_scheme.total_marks
        except Exception:
            pass

        entry['subjects'].append({
            'subject_code': subject.subject_code,
            'subject_name': subject.subject_name,
            'semester': subject.semester,
            'total_marks': result.total_marks,
            'max_marks': max_marks,
            'evaluated_on': result.graded_at.strftime('%d/%m/%Y') if result.graded_at else '',
        })

    # Compute grand totals
    students = []
    for roll, data in sorted(grouped.items()):
        data['grand_total'] = sum(s['total_marks'] for s in data['subjects'])
        students.append(data)

    # Build available filter values
    all_bundles = Bundle.objects.filter(status='submitted').select_related('subject')
    departments_list = sorted(set(b.subject.department for b in all_bundles if b.subject.department))
    semesters_list = sorted(set(b.subject.semester for b in all_bundles))
    academic_years_list = sorted(set(b.academic_year for b in all_bundles if b.academic_year), reverse=True)
    subjects_list = [
        {'id': s.id, 'code': s.subject_code, 'name': s.subject_name}
        for s in Subject.objects.filter(
            bundles__status='submitted'
        ).distinct().order_by('subject_code')
    ]

    filters = {
        'departments': departments_list,
        'semesters': semesters_list,
        'academic_years': academic_years_list,
        'subjects': subjects_list,
    }

    return students, filters


# ── Views ─────────────────────────────────────────

class ReportsSummaryView(APIView):
    """
    GET /api/reports/
    Returns student-grouped evaluation results with filter values.
    Query params: department, semester, academic_year, subject, roll_number
    """
    permission_classes = [IsExamDept]

    def get(self, request):
        students, filters = _build_student_data(request)
        return Response({
            'students': students,
            'filters': filters,
            'count': len(students),
        })


class ExcelExportView(APIView):
    """GET /api/reports/export/excel/ — Download grouped results as Excel."""
    permission_classes = [IsExamDept]

    def get(self, request):
        students, _ = _build_student_data(request)

        log_action(
            request, 'RESULT_GENERATED', 'Report', 0,
            notes=f'Excel report exported. {len(students)} students.'
        )

        return generate_excel_report(students)


class StudentPDFExportView(APIView):
    """GET /api/reports/export/student-pdf/<roll_number>/ — Single student PDF."""
    permission_classes = [IsExamDept]

    def get(self, request, roll_number):
        # Build full student data then find the specific student
        students, _ = _build_student_data(request)
        student = next((s for s in students if s['roll_number'] == roll_number), None)

        if not student:
            return Response(
                {'error': f'No results found for roll number {roll_number}.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        log_action(
            request, 'RESULT_GENERATED', 'Report', 0,
            notes=f'Student PDF exported for roll {roll_number}.'
        )

        return generate_student_pdf_response(student)


class AllPDFsExportView(APIView):
    """GET /api/reports/export/all-pdfs/ — ZIP of all student PDFs matching filters."""
    permission_classes = [IsExamDept]

    def get(self, request):
        students, _ = _build_student_data(request)

        if not students:
            return Response(
                {'error': 'No results found for the current filters.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Build ZIP in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            for student in students:
                roll = student['roll_number']
                pdf_bytes = generate_student_pdf_bytes(student)
                zf.writestr(f'result_{roll}.pdf', pdf_bytes.read())

        zip_buffer.seek(0)

        log_action(
            request, 'RESULT_GENERATED', 'Report', 0,
            notes=f'Bulk PDF ZIP exported. {len(students)} students.'
        )

        response = HttpResponse(zip_buffer.read(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="all_student_results.zip"'
        return response
