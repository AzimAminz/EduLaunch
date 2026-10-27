"""Programmes as the JPT ePanduan site lists them, cleaned into plain values (no HTML), ready to compare with the
catalogue. Nothing here goes to students directly: an admin accepts found programmes as drafts and another admin
publishes them."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

# Candidate categories on ePanduan (as `jenprog` and category code) and the EduLaunch entry route each one is.
CATEGORY_ROUTES: dict[tuple[str, str], str | None] = {
    ("spm", "A"): "spm",
    ("spm", "B"): "spm",
    ("stpm", "S"): "stpm",
    ("stpm", "A"): "stpm",
    ("stpm", "N"): "matrikulasi",
    ("stpm", "P"): "matrikulasi",
    ("stpm", "J"): "matrikulasi",
    ("stpm", "K"): "matrikulasi",
    ("stpm", "M"): "matrikulasi",
    ("stpm", "V"): "matrikulasi",
    ("stpm", "L"): "matrikulasi",
    ("stpm", "U"): "matrikulasi",
    ("stpm", "T"): None,  # STAM: no EduLaunch route yet
    ("stpm", "G1"): "diploma",
    ("stpm", "G2"): "diploma",
    ("stpm", "E1"): "dkm",
    ("stpm", "E2"): "dvm",
    ("stpm", "E3"): "diploma",
    ("stpm", "F1"): "a_level",
}

# The categories an import reads (checked 27 Oct 2026): SPM current and earlier years; STPM science and arts;
# Asasi TVET (V), Asasi Sains Sosial (M), Matrikulasi / Asasi Sains (N), Matrikulasi Perakaunan (P); STAM (T);
# Diploma UA (G1), Diploma Politeknik / Kolej Komuniti (G2); DKM / DLKM (E1); DVM (E2). The same programme appears
# under every category it accepts candidates from, with that category's general requirements.
CATEGORIES_TO_READ: tuple[tuple[str, str], ...] = (
    ("spm", "A"),
    ("spm", "B"),
    ("stpm", "S"),
    ("stpm", "A"),
    ("stpm", "V"),
    ("stpm", "M"),
    ("stpm", "N"),
    ("stpm", "P"),
    ("stpm", "T"),
    ("stpm", "G1"),
    ("stpm", "G2"),
    ("stpm", "E1"),
    ("stpm", "E2"),
)

PROGRAMME_CODE = re.compile(r"^[A-Z]{2}\d{7}$")

# Words kept in lower case inside a title-cased name (Malay and English).
_SMALL_WORDS = frozenset(
    ["dan", "dengan", "di", "dalam", "untuk", "bagi", "atau", "serta", "ke", "kepada", "daripada", "dari", "secara", "of", "and", "in", "the", "for", "with", "on", "to"]
)
_ACRONYMS = frozenset(["ICT", "IT", "TESL", "TVET", "STEM", "AI", "UA", "IPTA", "MBBS", "IB", "BSC", "HR"])


def clean_text(value: str | None) -> str | None:
    """One kind of space and dash, Unicode NFC, trimmed; empty, '-' and 'Tiada' become None."""
    if value is None:
        return None
    text = unicodedata.normalize("NFC", value)
    text = text.replace(" ", " ").replace("–", "-").replace("—", "-")
    text = re.sub(r"\s+", " ", text).strip()
    if text in ("", "-", "--") or text.lower() in ("tiada", "tidak berkenaan", "n/a"):
        return None
    return text


def title_case(value: str) -> str:
    """'IJAZAH SARJANA MUDA KEJURUTERAAN ELEKTRIK DENGAN KEPUJIAN' -> 'Ijazah Sarjana Muda Kejuruteraan Elektrik dengan
    Kepujian'. Small words stay lower case (except first); known acronyms stay upper case."""

    def word(w: str, first: bool) -> str:
        core = w.strip("()[],.;:/")
        if core.upper() in _ACRONYMS:
            return w.upper()
        lower = w.lower()
        if not first and core.lower() in _SMALL_WORDS:
            return lower
        # Capitalise the first letter after any opening bracket, and after hyphens or slashes inside a word.
        return re.sub(r"(^|[(\[/-])([a-zà-ÿ])", lambda m: m.group(1) + m.group(2).upper(), lower)

    parts = clean_text(value) or ""
    words = parts.split(" ")
    return " ".join(word(w, i == 0 or words[i - 1] == "/") for i, w in enumerate(words))


def parse_merit(value: str | None) -> float | None:
    """'88.91%' -> 88.91; anything without a number in 0..100 -> None."""
    text = clean_text(value)
    if not text:
        return None
    match = re.search(r"\d+(?:[.,]\d+)?", text)
    if not match:
        return None
    number = float(match.group(0).replace(",", "."))
    return number if 0 <= number <= 100 else None


def parse_duration_semesters(value: str | None) -> int | None:
    """'08 Semester' -> 8; '01 Tahun' -> 2; '1 Tahun 6 Bulan' -> 3. Out of range (1..16) -> None."""
    text = (clean_text(value) or "").lower()
    if not text:
        return None
    total = 0.0
    found = False
    for number, unit in re.findall(r"(\d+(?:[.,]\d+)?)\s*(semester|sem|tahun|thn|year|bulan|month)", text):
        n = float(number.replace(",", "."))
        found = True
        if unit.startswith("sem"):
            total += n
        elif unit in ("tahun", "thn", "year"):
            total += n * 2
        else:
            total += n / 6
    if not found:
        return None
    semesters = round(total)
    return semesters if 1 <= semesters <= 16 else None


def parse_nec(value: str | None) -> tuple[str | None, str | None]:
    """'0712 Kuasa Elektrik Dan Tenaga' -> ('0712', 'Kuasa Elektrik dan Tenaga')."""
    text = clean_text(value)
    if not text:
        return None, None
    match = re.match(r"^(\d{4})\s*(.*)$", text)
    if not match:
        return None, text
    return match.group(1), (title_case(match.group(2)) if match.group(2) else None)


def parse_yes_no(value: str | None) -> bool | None:
    text = (clean_text(value) or "").lower()
    if text in ("ya", "yes"):
        return True
    if text in ("tidak", "no"):
        return False
    return None


def study_level(value: str | None) -> str | None:
    """ePanduan's 'Peringkat Pengajian' as an EduLaunch study level."""
    text = (clean_text(value) or "").lower()
    if not text:
        return None
    if "asasi" in text or "matrikulasi" in text or "foundation" in text:
        return "foundation"
    if "sarjana muda" in text or "ijazah" in text or "bacelor" in text:
        return "degree"
    if "diploma" in text:
        return "diploma"
    if "sijil" in text:
        return "certificate"
    return None


def study_mode(value: str | None) -> str | None:
    """'Konvensional' -> conventional; work-based and distance learning are recognised by their usual words."""
    text = (clean_text(value) or "").lower()
    if not text:
        return None
    if "konvensional" in text or "sepenuh masa" in text:
        return "conventional"
    if "kerja" in text or "wbl" in text or "work" in text:
        return "work_based"
    if "jarak jauh" in text or "odl" in text or "pjj" in text or "distance" in text:
        return "distance"
    return None


@dataclass
class FoundCategory:
    """One candidate category a programme is listed under, with that category's general requirements (Syarat Am)."""

    jenprog: str
    category: str
    general_requirements: str | None = None

    @property
    def route(self) -> str | None:
        return CATEGORY_ROUTES.get((self.jenprog, self.category))

    def to_dict(self) -> dict:
        return {
            "jenprog": self.jenprog,
            "category": self.category,
            "route": self.route,
            "generalRequirements": self.general_requirements,
        }


@dataclass
class FoundProgramme:
    """One programme read from ePanduan, cleaned, with every category it was listed under."""

    code: str
    name: str
    institution_name: str | None = None
    year: int | None = None
    merit: float | None = None
    level: str | None = None
    level_text: str | None = None
    study_mode: str | None = None
    duration_semesters: int | None = None
    nec_code: str | None = None
    nec_name: str | None = None
    has_interview: bool | None = None
    joint_degree: bool | None = None
    is_stem: bool = False
    is_tvet: bool = False
    bumiputera_only: bool = False
    feeder: bool = False
    # Labels shown next to the name on ePanduan: "BARU" (a new programme) and markers such as "#".
    is_new: bool = False
    name_marks: list[str] = field(default_factory=list)
    note: str | None = None
    campuses: list[str] = field(default_factory=list)
    careers: str | None = None
    fees: str | None = None
    categories: list[FoundCategory] = field(default_factory=list)
    source_url: str | None = None

    @property
    def routes(self) -> list[str]:
        """The EduLaunch entry routes of its categories, once each, in the order found."""
        return list(dict.fromkeys(c.route for c in self.categories if c.route))

    @property
    def institution_code(self) -> str:
        """The first two letters of the programme code name the institution (UC6522001 -> UC, UTeM)."""
        return self.code[:2]

    def merge(self, other: FoundProgramme) -> None:
        """The same programme found under another category: keep one record, add the category, fill gaps."""
        known = {(c.jenprog, c.category) for c in self.categories}
        self.categories.extend(c for c in other.categories if (c.jenprog, c.category) not in known)
        # Merit is shown only in some categories (not STAM or diploma ones); keep the one that has it.
        if self.merit is None:
            self.merit = other.merit
        self.careers = self.careers or other.careers
        self.fees = self.fees or other.fees

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "name": self.name,
            "institutionName": self.institution_name,
            "year": self.year,
            "merit": self.merit,
            "level": self.level,
            "levelText": self.level_text,
            "studyMode": self.study_mode,
            "durationSemesters": self.duration_semesters,
            "necCode": self.nec_code,
            "necName": self.nec_name,
            "hasInterview": self.has_interview,
            "jointDegree": self.joint_degree,
            "isStem": self.is_stem,
            "isTvet": self.is_tvet,
            "bumiputeraOnly": self.bumiputera_only,
            "feeder": self.feeder,
            "isNew": self.is_new,
            "nameMarks": self.name_marks,
            "note": self.note,
            "campuses": self.campuses,
            "careers": self.careers,
            "fees": self.fees,
            "routes": self.routes,
            "categories": [c.to_dict() for c in self.categories],
            "sourceUrl": self.source_url,
        }
