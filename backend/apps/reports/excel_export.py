"""
Excel export utility using openpyxl.
Generates a results spreadsheet with roll_number × subject × marks breakdown.
"""
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from apps.evaluation.models import EvaluationResult
from apps.scanning.models import AnswerSheet


def generate_excel_report(subject_id=None):
    """
    Generate an Excel report of evaluation results.
    Optionally filter by subject_id.
    Returns an HttpResponse with the Excel file.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = 'Evaluation Results'

    # Styles
    header_font = Font(bold=True, color='FFFFFF', size=12)
    header_fill = PatternFill(start_color='2B579A', end_color='2B579A', fill_type='solid')
    header_align = Alignment(horizontal='center', vertical='center')
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin'),
    )

    # Query data
    qs = EvaluationResult.objects.select_related(
        'answer_sheet', 'answer_sheet__bundle', 'answer_sheet__bundle__subject', 'teacher'
    )
    if subject_id:
        qs = qs.filter(answer_sheet__bundle__subject_id=subject_id)

    # Build headers
    headers = ['Roll Number', 'Subject Code', 'Subject Name', 'Total Marks', 'Teacher']

    # Collect all section/question headers from the first result
    section_headers = []
    first_result = qs.first()
    if first_result and first_result.section_results:
        for section in first_result.section_results:
            section_name = section.get('section_name', '')
            for q in section.get('questions', []):
                q_no = q.get('question_no', '')
                section_headers.append(f'{section_name}-Q{q_no}')
            section_headers.append(f'{section_name} Total')

    all_headers = headers + section_headers

    # Write headers
    for col_idx, header in enumerate(all_headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align
        cell.border = thin_border

    # Write data rows
    for row_idx, result in enumerate(qs, 2):
        sheet = result.answer_sheet
        subject = sheet.bundle.subject

        row_data = [
            sheet.roll_number,
            subject.subject_code,
            subject.subject_name,
            result.total_marks,
            result.teacher.full_name if result.teacher else '',
        ]

        # Add section breakdown
        if result.section_results:
            for section in result.section_results:
                for q in section.get('questions', []):
                    row_data.append(q.get('marks_obtained', 0))
                row_data.append(section.get('section_total', 0))

        for col_idx, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center')

    # Auto-width columns
    for col in ws.columns:
        max_length = 0
        col_letter = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max_length + 4

    # Return response
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="evaluation_results.xlsx"'
    wb.save(response)
    return response
