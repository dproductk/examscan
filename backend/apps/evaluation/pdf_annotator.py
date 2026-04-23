"""
pdf_annotator.py
----------------
Generates an annotated version of a scanned answer sheet PDF by overlaying
draggable mark badges as red rounded rectangles with white text.

Approach:
  1. Group badges by page number.
  2. For each page with badges, build a transparent ReportLab overlay page
     with the red badges drawn at the correct percentage-based positions.
  3. Use pypdf to merge each overlay onto the corresponding original page.
  4. Save the result as a new file: {token}_v2_marked.pdf
  5. The original PDF is NEVER modified or deleted.

Badge appearance (matches the frontend red badge):
  - Red filled rounded rectangle  (#E53E3E)
  - White bold text: the mark value  (e.g. "7")
  - Font: Helvetica-Bold, 11pt
  - Badge size: ~44pt wide x 24pt tall
"""

import io
import hashlib
import os
from pathlib import Path

from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.colors import HexColor, white
from pypdf import PdfReader, PdfWriter


BADGE_WIDTH  = 44   # points
BADGE_HEIGHT = 24   # points
BADGE_RADIUS = 6    # corner radius (points)
BADGE_COLOR  = HexColor('#E53E3E')
TEXT_COLOR   = white


def _draw_badge(c, x_pt, y_pt, value: str):
    """
    Draw a single red badge.

    Args:
        c:     ReportLab Canvas
        x_pt:  left edge of badge in points (ReportLab bottom-left origin)
        y_pt:  TOP of badge in points (ReportLab bottom-left origin)
    """
    # Convert top → bottom for ReportLab
    bx = x_pt
    by = y_pt - BADGE_HEIGHT

    # Filled red rounded rectangle
    c.setFillColor(BADGE_COLOR)
    c.roundRect(bx, by, BADGE_WIDTH, BADGE_HEIGHT, BADGE_RADIUS, fill=1, stroke=0)

    # White bold text centred in badge
    c.setFillColor(TEXT_COLOR)
    c.setFont('Helvetica-Bold', 11)
    text_width = c.stringWidth(value, 'Helvetica-Bold', 11)
    c.drawString(
        bx + (BADGE_WIDTH - text_width) / 2,
        by + (BADGE_HEIGHT - 11) / 2 + 2,
        value,
    )


def _build_overlay_page(page_w: float, page_h: float, badges: list) -> bytes:
    """
    Build a single-page transparent PDF overlay containing all badges for
    one page of the original document.

    Args:
        page_w:  page width in points
        page_h:  page height in points
        badges:  list of { x_percent, y_percent, value }

    Returns:
        bytes of a single-page PDF
    """
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(page_w, page_h))
    c.setPageCompression(0)

    for badge in badges:
        # Frontend origin is top-left; ReportLab origin is bottom-left
        x_pt = (badge['x_percent'] / 100.0) * page_w
        y_pt = page_h - (badge['y_percent'] / 100.0) * page_h   # top of badge

        _draw_badge(c, x_pt, y_pt, str(badge['value']))

    c.save()
    buf.seek(0)
    return buf.read()


def annotate_pdf(
    original_pdf_path: str,
    mark_positions: list,
    output_pdf_path: str,
) -> str:
    """
    Merge red mark badges onto the original PDF and save as a new file.

    Args:
        original_pdf_path: Absolute path to the original scanned PDF.
        mark_positions:    List of badge dicts from EvaluationResult.mark_positions.
                           Each dict: {question_id, value, page (1-indexed),
                                       x_percent, y_percent}
        output_pdf_path:   Absolute path where the annotated PDF will be saved.

    Returns:
        SHA-256 hex digest of the generated PDF bytes (for tamper detection).

    Raises:
        FileNotFoundError: if the original PDF does not exist.
    """
    if not os.path.exists(original_pdf_path):
        raise FileNotFoundError(f"Original PDF not found: {original_pdf_path}")

    # Group badges by 1-indexed page number
    pages_with_badges: dict[int, list] = {}
    for badge in mark_positions:
        page_no = int(badge.get('page', 1))
        pages_with_badges.setdefault(page_no, []).append(badge)

    reader = PdfReader(original_pdf_path)
    writer = PdfWriter()

    for page_idx, page in enumerate(reader.pages):
        page_no = page_idx + 1   # 1-indexed

        if page_no in pages_with_badges:
            page_w = float(page.mediabox.width)
            page_h = float(page.mediabox.height)

            overlay_bytes = _build_overlay_page(
                page_w, page_h, pages_with_badges[page_no]
            )
            overlay_page = PdfReader(io.BytesIO(overlay_bytes)).pages[0]
            page.merge_page(overlay_page)

        writer.add_page(page)

    # Ensure output directory exists
    Path(output_pdf_path).parent.mkdir(parents=True, exist_ok=True)

    out_buf = io.BytesIO()
    writer.write(out_buf)
    pdf_bytes = out_buf.getvalue()

    with open(output_pdf_path, 'wb') as f:
        f.write(pdf_bytes)

    return hashlib.sha256(pdf_bytes).hexdigest()
