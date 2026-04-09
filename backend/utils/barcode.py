"""
Barcode detection utility.
detect_barcode(image_file) -> str | None
Uses pyzbar + OpenCV. Returns the decoded barcode string or None.
"""
import cv2
import numpy as np
from pyzbar.pyzbar import decode
from PIL import Image


def detect_barcode(image_file) -> str | None:
    """
    Detect and decode a barcode/QR code from an uploaded image file.

    Args:
        image_file: A file-like object (e.g., Django UploadedFile).

    Returns:
        The decoded barcode string, or None if no barcode is found.
    """
    image = Image.open(image_file).convert('RGB')
    img_np = np.array(image)
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    barcodes = decode(img_bgr)
    if barcodes:
        return barcodes[0].data.decode('utf-8')
    return None
