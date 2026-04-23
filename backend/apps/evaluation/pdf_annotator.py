"""
pdf_annotator.py
----------------
Generates an annotated version of a scanned answer sheet PDF by overlaying
mark badges as red rounded rectangles with white text.

Approach:
  For pages WITH badges:
    1. Extract the embedded JPEG image from the original page.
    2. Build a brand-new page with ReportLab: draw the image first,
       then draw all badges ON TOP in the same content stream.
       This guarantees badges are visible in every PDF viewer.
  For pages WITHOUT badges:
    Copy the original page unchanged.

  The result is saved as {token}_v2_marked.pdf.
  The original PDF is NEVER modified or deleted.

Badge appearance (matches the frontend red badge):
  - Red filled rounded rectangle  (#E53E3E)
  - White bold text: the mark value  (e.g. "7")
  - Font: Helvetica-Bold, 11pt
  - Badge size: 44pt wide x 24pt tall
"""

import io
import hashlib
import os
from pathlib import Path

from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter


BADGE_WIDTH  = 44   # points
BADGE_HEIGHT = 24   # points
BADGE_RADIUS = 6    # corner radius (points)
BADGE_COLOR  = HexColor('#E53E3E')
TEXT_COLOR   = white
FONT_SIZE    = 11   # points


def _draw_badge(c, x_pt, y_pt, value: str):
    """
    Draw a single red badge centred at (x_pt, y_pt).

    Args:
        c:     ReportLab Canvas
        x_pt:  centre-x of badge in points (bottom-left origin)
        y_pt:  centre-y of badge in points (bottom-left origin)
    """
    bx = x_pt - BADGE_WIDTH / 2
    by = y_pt - BADGE_HEIGHT / 2

    # Filled red rounded rectangle
    c.setFillColor(BADGE_COLOR)
    c.roundRect(bx, by, BADGE_WIDTH, BADGE_HEIGHT, BADGE_RADIUS, fill=1, stroke=0)

    # White bold text centred in badge
    c.setFillColor(TEXT_COLOR)
    c.setFont('Helvetica-Bold', FONT_SIZE)
    text_w = c.stringWidth(str(value), 'Helvetica-Bold', FONT_SIZE)
    c.drawString(
        bx + (BADGE_WIDTH - text_w) / 2,
        by + (BADGE_HEIGHT - FONT_SIZE) / 2 + 2,
        str(value),
    )


def _extract_page_image(page):
    """
    Extract the first image XObject from a PDF page.

    Returns (image_bytes, width_px, height_px) or None if no image found.
    """
    resources = page.get('/Resources')
    if not resources:
        return None
    xobjects = resources.get('/XObject')
    if not xobjects:
        return None

    resolved = xobjects.get_object() if hasattr(xobjects, 'get_object') else xobjects
    for name in resolved:
        obj = resolved[name].get_object()
        if obj.get('/Subtype') == '/Image':
            try:
                data = obj.get_data()
                w = int(obj.get('/Width'))
                h = int(obj.get('/Height'))
                return data, w, h
            except Exception:
                continue
    return None


def _build_page_with_badges(page_w, page_h, image_data, badges):
    """
    Build a complete single-page PDF:
      1. Draw the original scanned image to fill the page.
      2. Draw all mark badges on top.

    This avoids pypdf merge_page entirely, so badges are guaranteed
    to render correctly in all PDF viewers (Edge, Chrome, Adobe, etc.).

    Returns: bytes of the single-page PDF.
    """
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(page_w, page_h))

    # Draw the original scanned image to fill the entire page
    img_reader = ImageReader(io.BytesIO(image_data))
    c.drawImage(img_reader, 0, 0, width=page_w, height=page_h)

    # Draw badges on top
    for badge in badges:
        # Frontend stores positions as % from top-left.
        # ReportLab origin is bottom-left — flip y.
        cx = (badge['x_percent'] / 100.0) * page_w
        cy = page_h - (badge['y_percent'] / 100.0) * page_h

        # Clamp so badge stays fully on-page
        cx = max(BADGE_WIDTH / 2 + 2, min(page_w - BADGE_WIDTH / 2 - 2, cx))
        cy = max(BADGE_HEIGHT / 2 + 2, min(page_h - BADGE_HEIGHT / 2 - 2, cy))

        _draw_badge(c, cx, cy, badge['value'])

    c.save()
    buf.seek(0)
    return buf.read()


def annotate_pdf(
    original_pdf_path: str,
    mark_positions: list,
    output_pdf_path: str,
) -> str:
    """
    Bake red mark badges onto the original PDF and save as a new file.

    For pages that have badges, the page is rebuilt from scratch using
    ReportLab (image drawn first, then badges on top in the same content
    stream). Pages without badges are copied unchanged.

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
        page_no = page_idx + 1

        if page_no in pages_with_badges:
            page_w = float(page.mediabox.width)
            page_h = float(page.mediabox.height)

            # Extract the scanned image from this page
            img_result = _extract_page_image(page)

            if img_result:
                img_data, _, _ = img_result
                try:
                    # Rebuild the page from scratch: image + badges
                    new_page_bytes = _build_page_with_badges(
                        page_w, page_h, img_data,
                        pages_with_badges[page_no],
                    )
                    new_page = PdfReader(io.BytesIO(new_page_bytes)).pages[0]
                    writer.add_page(new_page)
                    continue
                except Exception as e:
                    print(f"Fallback to merge_page due to image format error: {e}")

            # Fallback: no extractable image or PIL could not identify it — use merge_page
            overlay_buf = io.BytesIO()
            c = rl_canvas.Canvas(overlay_buf, pagesize=(page_w, page_h))
            for badge in pages_with_badges[page_no]:
                cx = (badge['x_percent'] / 100.0) * page_w
                cy = page_h - (badge['y_percent'] / 100.0) * page_h
                cx = max(BADGE_WIDTH / 2 + 2, min(page_w - BADGE_WIDTH / 2 - 2, cx))
                cy = max(BADGE_HEIGHT / 2 + 2, min(page_h - BADGE_HEIGHT / 2 - 2, cy))
                _draw_badge(c, cx, cy, badge['value'])
            c.save()
            overlay_buf.seek(0)
            overlay_page = PdfReader(overlay_buf).pages[0]
            page.merge_page(overlay_page, over=True)
            writer.add_page(page)
        else:
            # No badges on this page — copy unchanged
            writer.add_page(page)

    # Ensure output directory exists
    Path(output_pdf_path).parent.mkdir(parents=True, exist_ok=True)

    out_buf = io.BytesIO()
    writer.write(out_buf)
    pdf_bytes = out_buf.getvalue()

    with open(output_pdf_path, 'wb') as f:
        f.write(pdf_bytes)

    return hashlib.sha256(pdf_bytes).hexdigest()
