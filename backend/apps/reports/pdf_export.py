"""
PDF export utility using ReportLab.
Generates per-student result card PDFs: college header, student info,
subject marks table, grand total, generated date.
"""
import io
from datetime import date
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable


def _build_student_pdf_elements(student, styles):
    """Build ReportLab elements for a single student result card."""
    elements = []

    # ── College Header ───────────────────────────
    header_style = ParagraphStyle(
        'CollegeHeader', parent=styles['Title'],
        fontSize=16, leading=20, alignment=TA_CENTER,
        textColor=colors.HexColor('#1C1D22'),
    )
    sub_header = ParagraphStyle(
        'SubHeader', parent=styles['Normal'],
        fontSize=10, alignment=TA_CENTER,
        textColor=colors.HexColor('#64748B'),
    )
    elements.append(Paragraph('ExamFlow — Examination Management System', header_style))
    elements.append(Paragraph('Student Evaluation Report Card', sub_header))
    elements.append(Spacer(1, 0.25 * inch))
    elements.append(HRFlowable(
        width='100%', thickness=1, color=colors.HexColor('#E2E8F0'),
        spaceAfter=0.2 * inch,
    ))

    # ── Student Info ─────────────────────────────
    info_style = ParagraphStyle(
        'Info', parent=styles['Normal'], fontSize=10, leading=14,
    )
    bold_style = ParagraphStyle(
        'InfoBold', parent=styles['Normal'], fontSize=10, leading=14,
        textColor=colors.HexColor('#1C1D22'),
    )

    roll = student.get('roll_number', 'N/A')
    dept = student.get('department', 'N/A')
    sem = student.get('semester', 'N/A')
    acad = student.get('academic_year', 'N/A')

    info_data = [
        [Paragraph(f'<b>Roll Number:</b> {roll}', info_style),
         Paragraph(f'<b>Department:</b> {dept}', info_style)],
        [Paragraph(f'<b>Semester:</b> {sem}', info_style),
         Paragraph(f'<b>Academic Year:</b> {acad}', info_style)],
    ]
    info_table = Table(info_data, colWidths=['50%', '50%'])
    info_table.setStyle(TableStyle([
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.3 * inch))

    # ── Subjects Table ───────────────────────────
    table_header = ['Subject Code', 'Subject Name', 'Semester', 'Total Marks', 'Evaluated On']
    table_data = [table_header]

    for subj in student.get('subjects', []):
        table_data.append([
            subj.get('subject_code', ''),
            subj.get('subject_name', ''),
            str(subj.get('semester', '')),
            str(subj.get('total_marks', 0)),
            subj.get('evaluated_on', ''),
        ])

    col_widths = [1.2 * inch, 2.0 * inch, 0.9 * inch, 1.0 * inch, 1.2 * inch]
    subjects_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    subjects_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1C1D22')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        # Data rows
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F7F8FA')]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(subjects_table)
    elements.append(Spacer(1, 0.2 * inch))

    # ── Grand Total ──────────────────────────────
    grand_total = student.get('grand_total', 0)
    total_style = ParagraphStyle(
        'GrandTotal', parent=styles['Normal'],
        fontSize=12, alignment=TA_RIGHT,
        textColor=colors.HexColor('#1C1D22'),
    )
    elements.append(Paragraph(f'<b>GRAND TOTAL:  {grand_total}</b>', total_style))
    elements.append(Spacer(1, 0.5 * inch))

    # ── Footer ───────────────────────────────────
    elements.append(HRFlowable(
        width='100%', thickness=0.5, color=colors.HexColor('#E2E8F0'),
        spaceAfter=0.1 * inch,
    ))
    footer_style = ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontSize=8, alignment=TA_CENTER,
        textColor=colors.HexColor('#94A3B8'),
    )
    elements.append(Paragraph(
        f'Generated on {date.today().strftime("%d %B %Y")} — ExamFlow Examination Management System',
        footer_style
    ))

    return elements


def generate_student_pdf_response(student):
    """Generate a downloadable PDF HttpResponse for a single student."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=0.6 * inch, leftMargin=0.6 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    elements = _build_student_pdf_elements(student, styles)
    doc.build(elements)

    roll = student.get('roll_number', 'student')
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="result_{roll}.pdf"'
    response.write(buffer.getvalue())
    buffer.close()
    return response


def generate_student_pdf_bytes(student):
    """Generate PDF bytes (BytesIO) for a single student — used for ZIP bundling."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=0.6 * inch, leftMargin=0.6 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
    )
    styles = getSampleStyleSheet()
    elements = _build_student_pdf_elements(student, styles)
    doc.build(elements)
    buffer.seek(0)
    return buffer
