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

# A 4-digit subject code anywhere in the line, also stuck to the name ("1103BAHASA"), but not part of a longer number,
# an identity card number (digits joined by "-") or a year in the title.
CODE = re.compile(r"(?<![\d-])(\d{4})(?![\d-])")
# SPM grades, and TH (tidak hadir, absent). Anything else in the grade column is left for the student to pick.
GRADE = re.compile(r"^(A\+|A-|A|B\+|B|C\+|C|D|E|G|TH)$")
# The words printed beside each grade on the slip (Lembaga Peperiksaan's scale). Longest first, so "CEMERLANG
# TERTINGGI" is not taken for "CEMERLANG". They also give the grade when the letter itself is misread.
DESCRIPTORS = [
    ("CEMERLANG TERTINGGI", "A+"),
    ("CEMERLANG TINGGI", "A"),
    ("KEPUJIAN TERTINGGI", "B+"),
    ("KEPUJIAN TINGGI", "B"),
    ("KEPUJIAN ATAS", "C+"),
    ("TIDAK HADIR", "TH"),
    ("LULUS ATAS", "D"),
    ("CEMERLANG", "A-"),
    ("KEPUJIAN", "C"),
    ("LULUS", "E"),
    ("GAGAL", "G"),
]
_DESCRIPTOR = re.compile("|".join(r"\b" + d.replace(" ", r"\s*") + r"\b" for d, _ in DESCRIPTORS))
# Lines that are never a subject, even when they hold a 4-digit number or a lone letter.
_NOT_A_ROW = re.compile(r"SIJIL|TAHUN|NAMA|PENGENALAN|GILIRAN|PUSAT|SEKOLAH|BILANGAN|JUMLAH|TARIKH|LEMBAGA", re.IGNORECASE)
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


def parse_line(line: str, confidence: float) -> SlipRow | None:
    """One line of a slip as a subject row, or None when it is not one.

    Slips differ: the official slip has the code, the name, the grade and its words ("1103 BAHASA MELAYU A+
    CEMERLANG TERTINGGI"); a school's slip may have a row number and marks instead of a code ("1 BAHASA MELAYU 75
    A-"). A row needs a subject code, or a grade beside a name; the web app then checks the name against the
    official subjects and drops a code-less line whose name is not one.
    """
    text = " ".join(line.upper().split())
    if not text or _NOT_A_ROW.search(text):
        return None
    m = CODE.search(text)
    code = m.group(1) if m else ""
    if m:
        text = (text[: m.start()] + " " + text[m.end() :]).strip()
    grade = None
    d = _DESCRIPTOR.search(text)
    if d:
        found = re.sub(r"\s", "", d.group(0))
        grade = next((g for name, g in DESCRIPTORS if name.replace(" ", "") == found), None)
        text = text[: d.start()].strip()
    # "A +" read as two tokens.
    tokens = re.sub(r"\b([A-E])\s+([+-])(?=\s|$)", r"\1\2", text).split()
    # The letter grade is the last grade-like token after the name; it wins over the words when both are there.
    for i in range(len(tokens) - 1, 0, -1):
        g = _grade(tokens[i])
        if g:
            grade = g
            tokens = tokens[:i] + tokens[i + 1 :]
            break
    # Row numbers, marks and stray punctuation are not part of the name.
    name = " ".join(t for t in tokens if re.search(r"[A-Z]{2,}", t)).strip(" .:-")
    if len(re.sub(r"[^A-Z]", "", name)) < 3 or (not code and grade is None):
        return None
    return SlipRow(code, name, grade, confidence)


def rows_from_boxes(boxes: list[Box]) -> list[SlipRow]:
    """Groups OCR boxes into lines and reads each line as a possible subject row.

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
        row = parse_line(" ".join(p[3].text for p in line), round(min(p[3].score for p in line), 2))
        if row:
            rows.append(row)
    return rows


def rows_from_text(text: str) -> list[SlipRow]:
    """Rows from the text of a digital PDF, one line per subject."""
    return [row for raw in text.splitlines() if (row := parse_line(raw, 1.0))]


def exam_year(texts: list[str]) -> int | None:
    """The examination year printed on the slip ("SIJIL PELAJARAN MALAYSIA 2025"), when it is there."""
    # OCR may split the title and the year into separate boxes, so look across all the text in reading order.
    m = YEAR.search(" ".join(texts))
    return int(m.group(1)) if m else None
