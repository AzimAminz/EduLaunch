"""Reads a result slip held in memory: the text of a digital PDF, or OCR of a photo or scan (RapidOCR, run here on the
server with PaddleOCR models under Apache 2.0). The file is never written to disk or sent anywhere else."""

from __future__ import annotations

import io
import threading
from dataclasses import dataclass

from ..domain.errors import DomainError
from ..domain.slip import Box, SlipRow, exam_year, rows_from_boxes, rows_from_text

MAX_PAGES = 2
# A reading with fewer subject rows than this, or less sure than SURE on average, is tried again another way.
ENOUGH_ROWS = 3
SURE = 0.85


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

    def _read_image(self, image) -> tuple[list[SlipRow], list[str]]:
        """Reads an image; when the reading is weak, tries it again turned (a photo taken sideways or upside down)
        and enlarged with stronger contrast (a small or dim photo), and keeps the best reading.

        The fallbacks run only when needed, so a clear photo is read once (about a second).
        """
        best = self._attempt(image)
        if not _good(best[0]):
            for variant in _variants(image):
                attempt = self._attempt(variant)
                if _score(attempt[0]) > _score(best[0]):
                    best = attempt
                if _good(best[0]):
                    break
        rows, texts = best
        # A small grade such as "B+" is easily misread ("8"), leaving that row without one: read the page again
        # enlarged and take the missing grades from rows with the same code (or name).
        if rows and any(r.grade is None for r in rows):
            rows = _fill_grades(rows, self._attempt(_enlarged(image))[0])
        return rows, texts

    def _attempt(self, image) -> tuple[list[SlipRow], list[str]]:
        boxes, texts = self._boxes(image)
        return rows_from_boxes(boxes), texts

    def read(self, data: bytes, mime: str) -> SlipReading:
        if mime == "application/pdf":
            return self._read_pdf(data)
        if mime in ("image/jpeg", "image/png", "image/webp"):
            from PIL import Image, ImageOps

            try:
                image = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
            except Exception as err:
                raise DomainError("unreadable_file", "The image could not be opened") from err
            rows, texts = self._read_image(image)
            return SlipReading("ocr", rows, exam_year(texts))
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
            page_rows, page_texts = self._read_image(image)
            rows += page_rows
            texts += page_texts
        return SlipReading("ocr", rows, exam_year(texts))


def _graded(rows: list[SlipRow]) -> list[SlipRow]:
    # A page read upside down still gives lines, but its grades land before the names and are lost: a reading
    # counts by the rows that have a grade.
    return [r for r in rows if r.grade]


def _good(rows: list[SlipRow]) -> bool:
    graded = _graded(rows)
    return len(graded) >= ENOUGH_ROWS and sum(r.confidence for r in graded) / len(graded) >= SURE


def _score(rows: list[SlipRow]) -> float:
    """More graded rows wins; among equal counts, the surer reading."""
    graded = _graded(rows)
    return len(graded) + (sum(r.confidence for r in graded) / len(graded) if graded else 0)


def _variants(image):
    """Other ways to look at a weak photo: turned a quarter either way or upside down, then enlarged with its
    contrast stretched. Made one at a time, so a later one is only made when an earlier one did not do."""
    from PIL import ImageOps

    for angle in (90, 270, 180):
        yield image.rotate(angle, expand=True)
    yield ImageOps.autocontrast(_enlarged(image).convert("L"), cutoff=1)


def _enlarged(image):
    """The image at twice its size (at most 3200 px on the longer side), so small marks such as "+" are clearer."""
    from PIL import Image

    k = min(2.0, 3200 / max(image.size))
    if k <= 1.05:
        return image
    return image.resize((round(image.width * k), round(image.height * k)), Image.LANCZOS)


def _fill_grades(rows: list[SlipRow], again: list[SlipRow]) -> list[SlipRow]:
    """Rows without a grade take it from the second reading's row with the same code (or, with no code, name)."""
    from dataclasses import replace

    def key(r: SlipRow) -> str:
        return r.code or r.name

    found = {key(r): r for r in again if r.grade}
    out = []
    for r in rows:
        other = found.get(key(r)) if r.grade is None else None
        out.append(replace(r, grade=other.grade, confidence=min(r.confidence, other.confidence)) if other else r)
    return out
