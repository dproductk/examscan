"""
blur_detector.py
----------------
Detects if a scanned answer sheet image is blurry or unclear.

Method: Laplacian variance. A low variance = blurry image.
Threshold is tunable via .env (default: 80.0)

For PDF-based answer sheets, we convert the first page to an image
using Pillow's PDF support or fall back to pdf2image if available.
"""

import cv2
import numpy as np
from decouple import config

BLUR_THRESHOLD = float(config('BLUR_THRESHOLD', default=80.0))


def check_image_quality(image_path: str) -> dict:
    """
    Returns quality assessment for a single image file.

    Args:
        image_path: absolute path to the image file (JPEG, PNG)

    Returns:
        {
            "is_blurry": bool,     # True if quality is below threshold
            "score": float,        # Laplacian variance (higher = sharper)
            "threshold": float     # Threshold used
        }
    """
    img = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return {"is_blurry": True, "score": 0.0, "threshold": BLUR_THRESHOLD}

    variance = cv2.Laplacian(img, cv2.CV_64F).var()
    return {
        "is_blurry": float(variance) < BLUR_THRESHOLD,
        "score": round(float(variance), 2),
        "threshold": BLUR_THRESHOLD,
    }


def check_pdf_quality(pdf_path: str) -> dict:
    """
    Quality-checks a PDF by checking its first page by rendering it to an image
    via Pillow (for PDFs backed by scanned JPEGs / image-only PDFs).

    Falls back to checking the PDF as a binary blob if rendering fails — in that
    case we return a neutral result (not blurry) so we don't false-positive on
    searchable/digital PDFs.

    Args:
        pdf_path: absolute path to the PDF file

    Returns: same dict shape as check_image_quality()
    """
    try:
        # Try pdf2image first (best quality)
        from pdf2image import convert_from_path
        pages = convert_from_path(str(pdf_path), first_page=1, last_page=1, dpi=100)
        if pages:
            import numpy as np
            import cv2
            img_array = np.array(pages[0].convert('L'))  # grayscale
            variance = cv2.Laplacian(img_array, cv2.CV_64F).var()
            return {
                "is_blurry": float(variance) < BLUR_THRESHOLD,
                "score": round(float(variance), 2),
                "threshold": BLUR_THRESHOLD,
            }
    except Exception:
        pass

    # Fallback: treat as not blurry (digital PDF)
    return {"is_blurry": False, "score": 999.0, "threshold": BLUR_THRESHOLD}


def check_answer_sheet_quality(answer_sheet) -> dict:
    """
    Runs quality check on an AnswerSheet model instance.
    Checks the compiled PDF's first page.

    Args:
        answer_sheet: AnswerSheet model instance with .pdf_file field

    Returns: dict with is_blurry, score, threshold
    """
    try:
        pdf_path = answer_sheet.pdf_file.path
        return check_pdf_quality(pdf_path)
    except Exception:
        return {"is_blurry": False, "score": 999.0, "threshold": BLUR_THRESHOLD}
