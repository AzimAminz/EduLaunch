"""Reading a result slip's subject rows: each row is a 4-digit subject code, the subject's name and a grade.

The rows come either from the text of a digital PDF (the slip printed from the results portal) or from OCR boxes of
a photo or scan. Nothing here decides which catalogue subject a row is, or whether its grade is final: the web app
checks each row against the official subject codes and the student confirms every row before anything is saved.
"""

from __future__ import annotations

import math
import re
import statistics
from dataclasses import dataclass

CODE = re.compile(r"^\d{4}$")
# SPM grades, and TH (tidak hadir, absent). Anything else in the grade column is left for the student to pick.
GRADE = re.compile(r"^(A\+|A-|A|B\+|B|C\+|C|D|E|G|TH)$")
# Spaces between the words are often lost in a photo ("PELAJARANMALAYSIA").
YEAR = re.compile(r"SIJIL\s*PELAJARAN\s*MALAYSIA\s*(?:TAHUN\s*)?(20\d{2})", re.IGNORECASE)


@dataclass(frozen=True)
class SlipRow:
    code: str
    name: str
    grade: str | None
    """How sure the reading is, 0 to 1 (1 for text read straight from a digital PDF)."""
    confidence: float


@dataclass(frozen=True)
class Box:
    text: str
    score: float
    # Four corners, clockwise from the top left, as OCR returns them.
    corners: list[tuple[float, float]]


def _grade(token: str) -> str | None:
    t = token.replace(" ", "").upper()
    return t if GRADE.match(t) else None


def rows_from_boxes(boxes: list[Box]) -> list[SlipRow]:
    """Groups OCR boxes into lines and keeps the lines that start with a subject code.

    A photo is rarely straight, so the page is first turned by the median slope of the wider boxes (subject names),
    then boxes whose centres sit on the same line are put together, left to right.
    """
    angles = [math.atan2(b.corners[1][1] - b.corners[0][1], b.corners[1][0] - b.corners[0][0]) for b in boxes if b.corners[1][0] - b.corners[0][0] > 120]
    angle = statistics.median(angles) if angles else 0.0
    cos, sin = math.cos(-angle), math.sin(-angle)
    placed = []
    for b in boxes:
        cx = sum(p[0] for p in b.corners) / 4
        cy = sum(p[1] for p in b.corners) / 4
        height = abs(b.corners[3][1] - b.corners[0][1]) or 20.0
        placed.append((cx * sin + cy * cos, cx * cos - cy * sin, height, b))
    placed.sort(key=lambda p: p[0])

    lines: list[list[tuple[float, float, float, Box]]] = []
    for p in placed:
        if lines and abs(p[0] - lines[-1][-1][0]) < 0.6 * p[2]:
            lines[-1].append(p)
        else:
            lines.append([p])

    rows: list[SlipRow] = []
    for line in lines:
        line.sort(key=lambda p: p[1])
        boxes_in_line = [p[3] for p in line]
        first = boxes_in_line[0].text.replace(" ", "")
        if not CODE.match(first):
            continue
        rest = boxes_in_line[1:]
        grade_box = next((b for b in reversed(rest) if _grade(b.text)), None)
        name = " ".join(b.text.strip() for b in rest if b is not grade_box)
        rows.append(SlipRow(first, name, _grade(grade_box.text) if grade_box else None, round(min(b.score for b in boxes_in_line), 2)))
    return rows


def rows_from_text(text: str) -> list[SlipRow]:
    """Rows from the text of a digital PDF: one line per subject, "1103 BAHASA MELAYU A"."""
    rows: list[SlipRow] = []
    for raw in text.splitlines():
        parts = raw.split()
        if len(parts) < 2 or not CODE.match(parts[0]):
            continue
        grade = _grade(parts[-1])
        name = " ".join(parts[1:-1] if grade else parts[1:])
        rows.append(SlipRow(parts[0], name, grade, 1.0))
    return rows


def exam_year(texts: list[str]) -> int | None:
    """The examination year printed on the slip ("SIJIL PELAJARAN MALAYSIA 2025"), when it is there."""
    # OCR may split the title and the year into separate boxes, so look across all the text in reading order.
    m = YEAR.search(" ".join(texts))
    return int(m.group(1)) if m else None
