from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from kvia import citations, retrieval

SENT = "Leverandøren skal ha gyldig skatteattest."


def make_fixture_pdf(path: Path):
    c = canvas.Canvas(str(path), pagesize=A4)
    c.drawString(72, 750, "Innledning uten krav.")
    c.showPage()
    c.drawString(72, 750, "Kvalifikasjonskrav")
    c.drawString(72, 720, SENT)
    c.showPage()
    c.save()


def test_citation_check_and_highlight(tmp_path):
    pdf = tmp_path / "fx.pdf"
    make_fixture_pdf(pdf)
    ok = citations.check_and_highlight(pdf, 2, SENT)
    assert ok["citation_ok"] and ok["highlighted"]
    x0, y0, x1, y1 = ok["highlight"]["rects"][0]
    assert 70 < x0 < 75 and y0 < 725 < y1, "rect in PDF coordinates (origin bottom-left)"
    wrong_page = citations.check_and_highlight(pdf, 1, SENT)
    assert not wrong_page["citation_ok"]
    assert not citations.check_and_highlight(tmp_path / "missing.pdf", 1, SENT)["citation_ok"]


def test_bm25_ranks_requirement_page_first(tmp_path):
    pdf = tmp_path / "fx.pdf"
    make_fixture_pdf(pdf)
    chunks = retrieval.page_chunks(pdf)
    bm = retrieval.BM25([retrieval.tokenize(c["text"]) for c in chunks])
    q = retrieval.tokenize("skatteattest kvalifikasjonskrav")
    assert bm.score(q, 1) > bm.score(q, 0)
