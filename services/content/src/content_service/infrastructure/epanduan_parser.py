"""Reads an ePanduan programme list page (10 programmes per page) into FoundProgramme values.

Every value is found by the text of its label ("KOD PROGRAM", "Tempoh Pengajian", the "Kampus" panel), never by its
position or CSS class, so small layout changes do not shift values into the wrong fields. A page that has no result
count, or programme blocks without a programme code, raises PageLayoutChanged so a run stops instead of storing
half-read data. A page cut short in transfer (fewer blocks than it should have, or a block without its details)
raises PageIncomplete, so the reader can fetch it again.
"""

from __future__ import annotations

import html as html_lib
import re
from dataclasses import dataclass

from selectolax.lexbor import LexborHTMLParser as HTMLParser
from selectolax.lexbor import LexborNode as Node

from ..domain.epanduan import (
    PROGRAMME_CODE,
    FoundCategory,
    FoundProgramme,
    clean_text,
    parse_duration_semesters,
    parse_merit,
    parse_nec,
    parse_yes_no,
    spell_names,
    study_level,
    study_mode,
    title_case,
)

# Each programme starts with its card; the panels (details, campus, careers) follow it until the next card.
_CARD_START = '<div class="card-body content'
_RESULT_COUNT = re.compile(r"daripada\s*([\d.,]+)\s*carian", re.IGNORECASE)


class PageLayoutChanged(Exception):
    """The page does not look like an ePanduan programme list any more."""


class PageIncomplete(Exception):
    """The page arrived cut short; reading it again usually works."""


PAGE_SIZE = 10


def requirement_text(fragment: str | None) -> str | None:
    """Requirement HTML (Syarat Am or Syarat Khas) as plain lines: headings, '• ' list items, DAN / ATAU."""
    if not fragment:
        return None
    s = re.sub(r"(?is)<(script|style)\b.*?</\1>", "", fragment)
    # Line breaks in the source are only layout; lines come from the block elements below.
    s = re.sub(r"\s+", " ", s)
    # Subject lists are tables with a bullet cell: written as indented items under their requirement.
    s = re.sub(r"(?i)<td\b[^>]*>\s*(?:&#8226;|&bull;|•)\s*</td>", "\n  - ", s)
    s = re.sub(r"(?i)<li\b[^>]*>", "\n• ", s)
    s = re.sub(r"(?i)<br\s*/?>|</(div|p|li|ol|ul|h[1-6]|tr)>", "\n", s)
    s = html_lib.unescape(re.sub(r"<[^>]+>", " ", s))
    lines: list[str] = []
    for raw in s.split("\n"):
        indent = "  " if raw.startswith("  - ") else ""
        line = clean_text(raw)
        if not line or line in ("•", "-"):
            continue
        line = re.sub(r"\s+([.,:;])", r"\1", line)
        if lines and line == lines[-1].strip():
            continue
        lines.append(indent + line)
    return "\n".join(lines) or None


@dataclass
class ListingPage:
    total: int
    programmes: list[FoundProgramme]


def _text(node: Node | None) -> str | None:
    return clean_text(node.text(separator=" ")) if node else None


def result_count(html: str) -> int:
    """The 'N' in '1 - 10 daripada N carian' above the list."""
    head, _, _ = html.partition(_CARD_START)
    count = _RESULT_COUNT.search(re.sub(r"<[^>]+>", " ", head))
    if not count:
        raise PageLayoutChanged("No result count ('… daripada N carian') on the page")
    return int(re.sub(r"[.,]", "", count.group(1)))


def parse_listing(
    html: str,
    jenprog: str | None = None,
    category: str | None = None,
    source_url: str | None = None,
    page: int | None = None,
) -> ListingPage:
    total = result_count(html)
    blocks = html.split(_CARD_START)[1:]
    if total and not blocks:
        raise PageLayoutChanged(f"The page says {total} programmes but shows none")
    if page is not None:
        expected = max(0, min(PAGE_SIZE, total - (page - 1) * PAGE_SIZE))
        if len(blocks) < expected:
            raise PageIncomplete(f"Page {page} shows {len(blocks)} of {expected} programmes")
    programmes = [_programme(_CARD_START + block, jenprog, category, source_url) for block in blocks]
    return ListingPage(total=total, programmes=programmes)


def _programme(block_html: str, jenprog: str | None, category: str | None, source_url: str | None) -> FoundProgramme:
    tree = HTMLParser(block_html)
    labels = _labelled_values(tree)
    code = (labels.get("KOD PROGRAM") or "").upper()
    if not PROGRAMME_CODE.match(code):
        raise PageLayoutChanged(f"A programme block has no valid programme code ({code or 'empty'})")
    title = tree.css_first("a.h5")
    # The title's own text is the name; small labels inside it ("BARU", "#") are kept apart.
    name = clean_text(title.text(deep=False)) if title else None
    marks = [m for m in (_text(span) for span in (title.css("span") if title else [])) if m]
    if not name:
        raise PageLayoutChanged(f"Programme {code} has no name")
    details = _details(tree)
    if "peringkat pengajian" not in details:
        raise PageIncomplete(f"Programme {code} arrived without its details")
    panels = _panels(tree)
    general = tree.css_first(f'[id="syarat-am-{code}"]')
    badges = {(_text(b) or "").lower() for b in tree.css(".executive-badges-container .badge")}
    nec_code, nec_name = parse_nec(details.get("bidang nec"))
    year = labels.get("TAHUN")
    return FoundProgramme(
        code=code,
        name=title_case(name),
        institution_name=_text(tree.css_first("a.h5 ~ p, p.text-muted.small")),
        year=int(year) if year and year.isdigit() else None,
        merit=parse_merit(labels.get("PURATA MARKAH MERIT") or details.get("purata markah merit")),
        level=study_level(details.get("peringkat pengajian")),
        level_text=details.get("peringkat pengajian"),
        study_mode=study_mode(details.get("mod pengajian")),
        duration_semesters=parse_duration_semesters(details.get("tempoh pengajian")),
        nec_code=nec_code,
        nec_name=nec_name,
        has_interview=parse_yes_no(details.get("bertemu duga / ujian")),
        joint_degree=parse_yes_no(details.get("joint / dual / double degree")),
        is_stem=any("stem" in b for b in badges),
        is_tvet=any("tvet" in b for b in badges),
        bumiputera_only=any("bumiputera" in b for b in badges),
        feeder=any("perintis" in b or "feeder" in b for b in badges),
        is_new=any(m.lower() == "baru" for m in marks),
        name_marks=marks,
        note=details.get("catatan") or None,
        campuses=_campuses(panels.get("kampus")),
        careers=_careers(panels.get("laluan kerjaya")),
        fees=clean_text(panels.get("yuran pengajian")) or None,
        categories=[FoundCategory(jenprog, category, requirement_text(general.html if general else None))]
        if jenprog and category
        else [],
        source_url=source_url,
    )


def _labelled_values(tree: Node) -> dict[str, str]:
    """The card's label / value pairs: KOD PROGRAM, TAHUN, PURATA MARKAH MERIT."""
    values: dict[str, str] = {}
    for label in tree.css(".executive-data-label"):
        key = (_text(label) or "").upper()
        value = label.next
        while value is not None and not (
            value.tag == "span" and "executive-data-value" in (value.attributes.get("class") or "")
        ):
            value = value.next
        if key and value is not None:
            values[key] = _text(value) or ""
    return values


def _details(tree: Node) -> dict[str, str]:
    """The details panel: 'Peringkat Pengajian : <b>Sarjana Muda</b>' and the like, by lower-case label."""
    values: dict[str, str] = {}
    for p in tree.css("p.para-desc"):
        bold = p.css_first("b")
        full = _text(p) or ""
        if not bold or ":" not in full:
            continue
        label = clean_text(full.split(":", 1)[0])
        if label:
            values[label.lower()] = _text(bold) or ""
    return values


def _panels(tree: Node) -> dict[str, str]:
    """Each pop-up panel's text by its title ('Kampus', 'Laluan Kerjaya', 'Bidang NEC'), without the title lines."""
    panels: dict[str, str] = {}
    for title in tree.css("h4.compact-modal-title"):
        key = (_text(title) or "").lower()
        body = title.parent
        # Climb to the panel's body (the element that holds more than the header).
        while body is not None and body.tag != "body" and "modal-body" not in (body.attributes.get("class") or ""):
            body = body.parent
        if body is None or key in panels:
            continue
        header = body.css_first(".compact-modal-header")
        # Line by line, so items separated only by line breaks (careers) stay apart.
        skip = {clean_text(x) for x in (header.text(separator="\n").split("\n") if header is not None else [])}
        lines = [
            line for line in (clean_text(x) for x in body.text(separator="\n").split("\n")) if line and line not in skip
        ]
        panels[key] = "\n".join(lines)
    return panels


def _careers(text: str | None) -> str | None:
    """Careers as ePanduan lists them, one line per line break (commas are left for the reader to split), with names
    such as R&D spelt right."""
    if not text:
        return None
    return "\n".join(spell_names(line) for line in text.split("\n") if line) or None


def _campuses(text: str | None) -> list[str]:
    """'- Kampus Induk, Melaka - Kampus Teknologi, Melaka' -> ['Kampus Induk, Melaka', 'Kampus Teknologi, Melaka']."""
    if not text:
        return []
    parts = [clean_text(p) for p in re.split(r"(?:^|\s)-\s", " " + text)]
    return [spell_names(p) for p in parts if p]
