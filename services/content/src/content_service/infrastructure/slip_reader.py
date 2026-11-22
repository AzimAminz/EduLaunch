"""Reads a result slip held in memory: the text of a digital PDF, or OCR of a photo or scan (RapidOCR, run here on the
server with PaddleOCR models under Apache 2.0). The file is never written to disk or sent anywhere else."""

from __future__ import annotations

import io
import threading
from dataclasses import dataclass

from ..domain.errors import DomainError
from ..domain.slip import Box, SlipRow, exam_year, rows_from_boxes, rows_from_text

MAX_PAGES = 2


@dataclass(frozen=True)
class SlipReading:
    """`source`: "text" when read from a digital PDF, "ocr" when read from an image."""

    source: str
    rows: list[SlipRow]
    exam_year: int | None


class SlipReader:
    def __init__(self) -> None:
        self._engine = None
        self._lock = threading.Lock()

    def _ocr(self):
        # Loaded on first use (about half a second), then kept: the models are bundled with the package.
        with self._lock:
            if self._engine is None:
                from rapidocr import RapidOCR

                self._engine = RapidOCR()
            return self._engine

    def _boxes(self, image) -> tuple[list[Box], list[str]]:
        import numpy as np

        out = self._ocr()(np.asarray(image.convert("RGB")))
        if out.txts is None:
            return [], []
        boxes = [Box(t, float(s), [(float(x), float(y)) for x, y in corners]) for t, s, corners in zip(out.txts, out.scores, out.boxes.tolist())]
        return boxes, list(out.txts)

    def read(self, data: bytes, mime: str) -> SlipReading:
        if mime == "application/pdf":
            return self._read_pdf(data)
        if mime in ("image/jpeg", "image/png", "image/webp"):
            from PIL import Image, ImageOps

            try:
                image = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
            except Exception as err:
                raise DomainError("unreadable_file", "The image could not be opened") from err
            boxes, texts = self._boxes(image)
            return SlipReading("ocr", rows_from_boxes(boxes), exam_year(texts))
        raise DomainError("unsupported_file", "Upload a PDF, JPG, PNG or WEBP file")

    def _read_pdf(self, data: bytes) -> SlipReading:
        from pypdf import PdfReader

        try:
            pdf = PdfReader(io.BytesIO(data))
            pages = pdf.pages[:MAX_PAGES]
            text = "\n".join(page.extract_text() or "" for page in pages)
        except Exception as err:
            raise DomainError("unreadable_file", "The PDF could not be opened") from err
        rows = rows_from_text(text)
        if len(rows) >= 3:
            return SlipReading("text", rows, exam_year(text.splitlines()))
        # A scanned PDF has no text layer: render its pages and read them like photos.
        import pypdfium2 as pdfium

        doc = pdfium.PdfDocument(data)
        rows, texts = [], []
        for i in range(min(len(doc), MAX_PAGES)):
            image = doc[i].render(scale=200 / 72).to_pil()
            boxes, page_texts = self._boxes(image)
            rows += rows_from_boxes(boxes)
            texts += page_texts
        return SlipReading("ocr", rows, exam_year(texts))
