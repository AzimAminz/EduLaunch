"""Reading result slips: rows from PDF text and from (tilted) OCR boxes, and a real OCR run on a generated slip."""

from __future__ import annotations

import io
import math
from pathlib import Path

import pytest

from content_service.domain.slip import Box, exam_year, rows_from_boxes, rows_from_text

ROWS = [("1103", "BAHASA MELAYU", "A"), ("1249", "SEJARAH", "B+"), ("3472", "MATEMATIK TAMBAHAN", "A-"), ("4551", "BIOLOGI", "C")]


def test_rows_from_pdf_text():
    text = "LEMBAGA PEPERIKSAAN\nSIJIL PELAJARAN MALAYSIA 2025\nNAMA : CALON\n" + "\n".join(f"{c} {n} {g}" for c, n, g in ROWS) + "\nBILANGAN 4"
    rows = rows_from_text(text)
    assert [(r.code, r.name, r.grade, r.confidence) for r in rows] == [(c, n, g, 1.0) for c, n, g in ROWS]
    assert exam_year(text.splitlines()) == 2025


def test_year_split_from_the_title():
    assert exam_year(["SIJIL PELAJARAN MALAYSIA", "2025", "NAMA"]) == 2025
    assert exam_year(["SIJIL PELAJARANMALAYSIA 2025"]) == 2025
    assert exam_year(["NAMA : CALON"]) is None


def test_a_grade_that_is_not_on_the_scale_is_left_empty():
    rows = rows_from_text("3472 MATEMATIK TAMBAHAN 8")
    assert rows[0].grade is None
    assert rows[0].name == "MATEMATIK TAMBAHAN"


@pytest.mark.parametrize(
    ("line", "expected"),
    [
        # The official layout: code, name, grade and the grade's words.
        ("1103 BAHASA MELAYU A+ CEMERLANG TERTINGGI", ("1103", "BAHASA MELAYU", "A+")),
        # Code stuck to the name, spaces lost in the words.
        ("1449MATEMATIK B KEPUJIANTINGGI", ("1449", "MATEMATIK", "B")),
        # The letter misread: the words still give the grade.
        ("4551 BIOLOGI 8 KEPUJIAN ATAS", ("4551", "BIOLOGI", "C+")),
        # "A +" read as two tokens.
        ("1249 SEJARAH A +", ("1249", "SEJARAH", "A+")),
        # A school's slip: row number and marks, no code.
        ("1 BAHASA INGGERIS 75 A-", ("", "BAHASA INGGERIS", "A-")),
        ("3. PENDIDIKAN ISLAM 40 LULUS", ("", "PENDIDIKAN ISLAM", "E")),
        ("2280 GEOGRAFI TH TIDAK HADIR", ("2280", "GEOGRAFI", "TH")),
    ],
)
def test_lines_in_the_layouts_slips_use(line, expected):
    from content_service.domain.slip import parse_line

    row = parse_line(line, 1.0)
    assert row is not None
    assert (row.code, row.name, row.grade) == expected


@pytest.mark.parametrize(
    "line",
    [
        "SIJIL PELAJARAN MALAYSIA TAHUN 2025",
        "NAMA : AHMAD BIN ALI",
        "NO. KAD PENGENALAN : 080101-10-1234",
        "ANGKA GILIRAN : AB123C456",
        "KOD MATA PELAJARAN GRED",
        "BILANGAN MATA PELAJARAN 9",
    ],
)
def test_lines_that_are_not_subjects(line):
    from content_service.domain.slip import parse_line

    assert parse_line(line, 1.0) is None


def _box(text: str, x: float, y: float, w: float, angle: float, score: float = 0.99) -> Box:
    # A box of width w and height 30 at (x, y), turned by `angle` about the page origin (a tilted photo).
    ca, sa = math.cos(angle), math.sin(angle)
    corners = [(x, y), (x + w, y), (x + w, y + 30), (x, y + 30)]
    return Box(text, score, [(px * ca - py * sa, px * sa + py * ca) for px, py in corners])


@pytest.mark.parametrize("degrees", [0, 3, -5])
def test_rows_from_tilted_boxes(degrees: float):
    a = math.radians(degrees)
    boxes = []
    for i, (code, name, grade) in enumerate(ROWS):
        y = 500 + i * 60
        boxes += [_box(grade, 1000, y, 40, a), _box(code, 80, y, 70, a), _box(name, 200, y, 300, a)]
    rows = rows_from_boxes(boxes)
    assert [(r.code, r.name, r.grade) for r in rows] == ROWS


def test_the_least_sure_box_sets_the_row_confidence():
    boxes = [_box("4551", 80, 500, 70, 0), _box("BIOLOGI", 200, 500, 200, 0), _box("C", 1000, 500, 30, 0, score=0.61)]
    assert rows_from_boxes(boxes)[0].confidence == 0.61


def _font():
    # Arial on macOS, DejaVu Sans on Linux (CI). OCR reads them differently: in DejaVu a small "B+" first comes back
    # as "8", which the enlarged second reading must recover.
    for path in ["/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if Path(path).exists():
            return path
    return None


@pytest.mark.skipif(_font() is None, reason="needs a TrueType font to draw the test slip")
def test_reads_a_photographed_slip():
    from PIL import Image, ImageDraw, ImageFilter, ImageFont

    from content_service.infrastructure.slip_reader import SlipReader

    font = ImageFont.truetype(_font(), 28)
    img = Image.new("RGB", (1240, 900), "white")
    d = ImageDraw.Draw(img)
    d.text((300, 60), "SIJIL PELAJARAN MALAYSIA 2025", font=font, fill="black")
    for i, (code, name, grade) in enumerate(ROWS):
        y = 200 + i * 60
        d.text((80, y), code, font=font, fill="black")
        d.text((200, y), name, font=font, fill="black")
        d.text((1000, y), grade, font=font, fill="black")
    photo = img.rotate(2.5, expand=True, fillcolor=(235, 232, 225)).filter(ImageFilter.GaussianBlur(1.0))
    buf = io.BytesIO()
    photo.save(buf, "JPEG", quality=60)

    reading = SlipReader().read(buf.getvalue(), "image/jpeg")
    assert reading.source == "ocr"
    assert reading.exam_year == 2025
    assert [(r.code, r.name, r.grade) for r in reading.rows] == ROWS
    assert all(r.confidence >= 0.9 for r in reading.rows)


@pytest.mark.skipif(_font() is None, reason="needs a TrueType font to draw the test slip")
@pytest.mark.parametrize("turn", [90, 270])
def test_reads_a_slip_photographed_sideways(turn: int):
    from PIL import Image, ImageDraw, ImageFont

    from content_service.infrastructure.slip_reader import SlipReader

    font = ImageFont.truetype(_font(), 28)
    img = Image.new("RGB", (1240, 700), "white")
    d = ImageDraw.Draw(img)
    for i, (code, name, grade) in enumerate(ROWS):
        y = 200 + i * 60
        d.text((80, y), code, font=font, fill="black")
        d.text((200, y), name, font=font, fill="black")
        d.text((1000, y), grade, font=font, fill="black")
    buf = io.BytesIO()
    img.rotate(turn, expand=True).save(buf, "JPEG", quality=80)

    reading = SlipReader().read(buf.getvalue(), "image/jpeg")
    assert [(r.code, r.name, r.grade) for r in reading.rows] == ROWS


def test_refuses_other_files():
    from content_service.domain.errors import DomainError
    from content_service.infrastructure.slip_reader import SlipReader

    with pytest.raises(DomainError):
        SlipReader().read(b"hello", "text/plain")
