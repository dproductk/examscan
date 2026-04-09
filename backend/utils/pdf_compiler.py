"""
PDF compiler utility.
compile_images_to_pdf(image_paths, output_pdf_path) -> None
Uses img2pdf. Raises RuntimeError on failure.
"""
import img2pdf
import os


def compile_images_to_pdf(image_paths: list, output_pdf_path: str) -> None:
    """
    Compile a list of image file paths into a single PDF.

    Args:
        image_paths: List of absolute paths to image files.
        output_pdf_path: Absolute path for the output PDF.

    Raises:
        RuntimeError: If compilation fails.
    """
    try:
        os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)
        with open(output_pdf_path, 'wb') as f:
            f.write(img2pdf.convert(image_paths))
    except Exception as e:
        raise RuntimeError(f'Failed to compile images to PDF: {e}') from e
