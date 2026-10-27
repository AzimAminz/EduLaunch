from pathlib import Path

import pytest

from content_service.domain.epanduan import (
    FoundProgramme,
    clean_text,
    parse_duration_semesters,
    parse_merit,
    parse_nec,
    study_level,
    study_mode,
    title_case,
)
from content_service.infrastructure.epanduan_parser import PageLayoutChanged, parse_listing

FIXTURES = Path(__file__).parent / "fixtures"


def test_cleans_values_the_way_epanduan_writes_them():
    assert clean_text("  Tidak Berkenaan ") is None
    assert clean_text("-") is None
    assert clean_text("Kampus Induk – Melaka") == "Kampus Induk - Melaka"
    assert parse_merit(" 88.91% ") == 88.91
    assert parse_merit("Tiada") is None
    assert parse_merit("150%") is None
    assert parse_duration_semesters("08 Semester") == 8
    assert parse_duration_semesters("01 Tahun") == 2
    assert parse_duration_semesters("1 Tahun 6 Bulan") == 3
    assert parse_duration_semesters("40 Semester") is None
    assert parse_nec("0712 Kuasa Elektrik Dan Tenaga") == ("0712", "Kuasa Elektrik dan Tenaga")


def test_names_are_title_cased_with_small_words_and_acronyms_kept():
    assert title_case("IJAZAH SARJANA MUDA KEJURUTERAAN ELEKTRIK DENGAN KEPUJIAN") == (
        "Ijazah Sarjana Muda Kejuruteraan Elektrik dengan Kepujian"
    )
    assert title_case("SARJANA MUDA PENDIDIKAN (TESL) DENGAN KEPUJIAN") == "Sarjana Muda Pendidikan (TESL) dengan Kepujian"
    assert title_case("ASASI SAINS / FOUNDATION IN SCIENCE") == "Asasi Sains / Foundation in Science"


def test_levels_and_modes_map_to_edulaunch_values():
    assert study_level("Asasi/ Matrikulasi/ Foundation") == "foundation"
    assert study_level("Sarjana Muda") == "degree"
    assert study_level("Diploma Lanjutan") == "diploma"
    assert study_level("Sijil-Kredit Graduan Min 30") == "certificate"
    assert study_mode("Konvensional") == "conventional"
    assert study_mode("Pembelajaran Berasaskan Kerja") == "work_based"
    assert study_mode("Lain-lain") is None


def test_reads_a_degree_list_page_by_its_labels():
    html = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text()
    page = parse_listing(html, "stpm", "https://online.mohe.gov.my/epanduan/ProgramPengajian/kategoriCalon/S")
    assert page.total == 33
    first = page.programmes[0]
    assert first.code == "UC6522001"
    assert first.institution_code == "UC"
    assert first.name == "Ijazah Sarjana Muda Kejuruteraan Elektrik dengan Kepujian"
    assert first.institution_name == "Universiti Teknikal Malaysia Melaka"
    assert (first.year, first.merit, first.level, first.duration_semesters) == (2026, 88.91, "degree", 8)
    assert (first.nec_code, first.study_mode, first.has_interview, first.is_stem) == ("0712", "conventional", False, True)
    assert first.campuses == ["Kampus Induk, Melaka"]
    assert first.note is None
    assert first.routes == ["stpm"]


def test_reads_badges_on_a_foundation_page():
    page = parse_listing((FIXTURES / "epanduan_spm_A_page1.html").read_text(), "spm")
    asasi = page.programmes[0]
    assert page.total == 369
    assert asasi.code == "UY0000010"
    assert (asasi.level, asasi.duration_semesters, asasi.bumiputera_only, asasi.feeder) == ("foundation", 2, True, True)
    assert asasi.campuses == ["Gambang, Pahang"]


def test_labels_inside_the_name_are_kept_apart_from_it():
    html = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text().replace(
        "IJAZAH SARJANA MUDA KEJURUTERAAN ELEKTRIK DENGAN KEPUJIAN",
        'IJAZAH SARJANA MUDA KEJURUTERAAN ELEKTRIK DENGAN KEPUJIAN <span class="badge">BARU</span> <span class="badge">#</span>',
    )
    first = parse_listing(html).programmes[0]
    assert first.name == "Ijazah Sarjana Muda Kejuruteraan Elektrik dengan Kepujian"
    assert (first.is_new, first.name_marks) == (True, ["BARU", "#"])


def test_a_changed_layout_stops_the_run():
    with pytest.raises(PageLayoutChanged, match="result count"):
        parse_listing("<html><body><p>Penyelenggaraan sistem</p></body></html>")
    html = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text().replace("KOD PROGRAM", "KOD")
    with pytest.raises(PageLayoutChanged, match="programme code"):
        parse_listing(html)


def test_the_same_programme_under_two_categories_keeps_both_routes():
    a = FoundProgramme(code="UC6522001", name="X", routes=["stpm"])
    a.merge(FoundProgramme(code="UC6522001", name="X", routes=["matrikulasi"]))
    a.merge(FoundProgramme(code="UC6522001", name="X", routes=["stpm"]))
    assert a.routes == ["stpm", "matrikulasi"]
