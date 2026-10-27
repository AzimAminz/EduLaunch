from pathlib import Path

import pytest

from content_service.domain.epanduan import (
    FoundCategory,
    FoundProgramme,
    clean_text,
    parse_duration_semesters,
    parse_merit,
    parse_nec,
    study_level,
    study_mode,
    title_case,
)
from content_service.infrastructure.epanduan_parser import (
    PageIncomplete,
    PageLayoutChanged,
    parse_listing,
    requirement_text,
)

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
    page = parse_listing(html, "stpm", "S", "https://online.mohe.gov.my/epanduan/ProgramPengajian/kategoriCalon/S")
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
    assert first.fees.startswith("Yuran Pengajian adalah ditetapkan oleh pihak UA/IPTA")
    general = first.categories[0].general_requirements
    assert general.splitlines()[:3] == [
        "SPM",
        "Memiliki Sijil Pelajaran Malaysia (SPM) dengan mendapat sekurang-kurangnya:-",
        "• Gred C bagi matapelajaran BAHASA MELAYU / BAHASA MELAYU (KERTAS JULAI).",
    ]
    assert "• Purata Nilai Gred Kumulatif (PNGK) 2.00." in general.splitlines()


def test_reads_badges_on_a_foundation_page():
    page = parse_listing((FIXTURES / "epanduan_spm_A_page1.html").read_text(), "spm", "A")
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


def test_a_diploma_holder_category_has_its_own_general_requirements():
    page = parse_listing((FIXTURES / "epanduan_stpm_G1_page1.html").read_text(), "stpm", "G1")
    degree = page.programmes[0]
    assert degree.routes == ["diploma"]
    assert degree.categories[0].general_requirements.startswith("DIPLOMA UNIVERSITI AWAM / POLITEKNIK / KOLEJ KOMUNITI")


def test_special_requirements_keep_their_structure():
    text = requirement_text((FIXTURES / "epanduan_syarat_khas_S_UC6522001.html").read_text())
    assert text.splitlines()[:5] == [
        "• Mendapat sekurang-kurangnya PNGK 2.00 pada peringkat STPM.",
        "• Mendapat sekurang-kurangnya Gred C dalam TIGA (3) mata pelajaran di peringkat STPM:",
        "  - Mathematics M / Mathematics T",
        "  - Physics",
        "  - Chemistry",
    ]
    assert "ATAU" in text.splitlines()
    assert requirement_text("<div>   </div>") is None


def test_a_page_cut_short_is_reported_so_it_can_be_read_again():
    html = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text()
    with pytest.raises(PageIncomplete, match="2 of 10"):
        parse_listing(html, page=1)  # the fixture keeps 2 of the 10 programmes page 1 should show
    cut = html[: html.index("Peringkat Pengajian")]
    with pytest.raises(PageIncomplete, match="without its details"):
        parse_listing(cut)


def test_a_changed_layout_stops_the_run():
    with pytest.raises(PageLayoutChanged, match="result count"):
        parse_listing("<html><body><p>Penyelenggaraan sistem</p></body></html>")
    html = (FIXTURES / "epanduan_stpm_S_UC_page1.html").read_text().replace("KOD PROGRAM", "KOD")
    with pytest.raises(PageLayoutChanged, match="programme code"):
        parse_listing(html)


def test_the_same_programme_under_several_categories_keeps_each_one_and_the_merit():
    a = FoundProgramme(code="UC6522001", name="X", merit=None, categories=[FoundCategory("stpm", "G1", "Diploma …")])
    a.merge(FoundProgramme(code="UC6522001", name="X", merit=88.91, categories=[FoundCategory("stpm", "S", "STPM …")]))
    a.merge(FoundProgramme(code="UC6522001", name="X", categories=[FoundCategory("stpm", "A", "STPM …")]))
    a.merge(FoundProgramme(code="UC6522001", name="X", categories=[FoundCategory("stpm", "S", "again")]))
    assert [c.category for c in a.categories] == ["G1", "S", "A"]
    assert a.routes == ["diploma", "stpm"]
    assert a.merit == 88.91
    assert a.to_dict()["categories"][1] == {"jenprog": "stpm", "category": "S", "route": "stpm", "generalRequirements": "STPM …"}
