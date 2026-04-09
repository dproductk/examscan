"""
PDF export utility using ReportLab.
Generates a results PDF table with roll_number × subject × marks breakdown.
"""
import io
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from apps.evaluation.models import EvaluationResult


def generate_pdf_report(subject_id=None):
    """
    Generate a PDF report of evaluation results.
    Optionally filter by subject_id.
    Returns an HttpResponse with the PDF file.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=landscape(A4),
        rightMargin=0.5 * inch, leftMargin=0.5 * inch,
        topMargin=0.5 * inch, bottomMargin=0.5 * inch,
    )

    styles = getSampleStyleSheet()
    elements = []

    # Title
    title = Paragraph('ExamFlow — Evaluation Results Report', styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.3 * inch))

    # Query data
    qs = EvaluationResult.objects.select_related(
        'answer_sheet', 'answer_sheet__bundle', 'answer_sheet__bundle__subject', 'teacher'
    )
    if subject_id:
        qs = qs.filter(answer_sheet__bundle__subject_id=subject_id)

    # Build headers
    headers = ['Roll No.', 'Subject', 'Total', 'Teacher']

    # Collect section headers
    section_headers = []
    first_result = qs.first()
    if first_result and first_result.section_results:
        for section in first_result.section_results:
            section_name = section.get('section_name', '')
            for q in section.get('questions', []):
                section_headers.append(f'{section_name}-Q{q.get("question_no", "")}')
            section_headers.append(f'{section_name} Tot')

    all_headers = headers + section_headers
    table_data = [all_headers]

    # Build data rows
    for result in qs:
        sheet = result.answer_sheet
        subject = sheet.bundle.subject

        row = [
            sheet.roll_number,
            subject.subject_code,
            str(result.total_marks),
            result.teacher.full_name if result.teacher else '',
        ]

        if result.section_results:
            for section in result.section_results:
                for q in section.get('questions', []):
                    row.append(str(q.get('marks_obtained', 0)))
                row.append(str(section.get('section_total', 0)))

        table_data.append(row)

    if len(table_data) == 1:
        elements.append(Paragraph('No evaluation results found.', styles['Normal']))
    else:
        # Create table
        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2B579A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F2F2F2')]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)

    doc.build(elements)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="evaluation_results.pdf"'
    response.write(buffer.getvalue())
    buffer.close()
    return response
