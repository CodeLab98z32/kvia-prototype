"""Phase 1 placeholder tender documents (SPEC §18 placeholders / placeholder_pdfs).

For every active notice that has (mock) documents: data/mock/tender_docs/{id}/PLACEHOLDER.json plus one generated,
multi-page PDF with a real text layer, watermarked "PLACEHOLDER — MOCK, not the tender document", containing the
mock requirement sentences. The diagonal watermark is an image (not text) so it never mixes into the text layer used
by retrieval, citation check and highlighting. Replaced by the original PDFs in Phase 2.
"""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Frame, Paragraph

from ..util import write_json

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
pdfmetrics.registerFont(TTFont("DejaVu", FONT))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", FONT_BOLD))

WATERMARK = "PLACEHOLDER — MOCK, not the tender document"
SECTIONS = [
    ("cover", None),
    ("om", "1 Om anskaffelsen (plassholder)"),
    ("kval", "2 Kvalifikasjonskrav"),
    ("dok", "3 Dokumentasjonskrav og sertifikater"),
    ("spec", "4 Kravspesifikasjon"),
    ("vilkar", "5 Kontraktsvilkår (plassholder)"),
]
FILLER = ("Denne siden er generert for prototypen og er ikke en del av konkurransedokumentene. Teksten er en "
          "plassholder som gjør det mulig å teste dokumentvisning, sidehenvisninger og markering av sitater. Den "
          "erstattes av de originale dokumentene fra oppdragsgiver i fase 2.")

_wm_cache: dict = {}


def _watermark_png() -> ImageReader:
    if "img" not in _wm_cache:
        W, H = 1400, 1400
        img = Image.new("RGBA", (W, H), (255, 255, 255, 0))
        d = ImageDraw.Draw(img)
        f = ImageFont.truetype(FONT_BOLD, 58)
        for k, line in enumerate(["PLACEHOLDER — MOCK", "not the tender document"]):
            tw = d.textlength(line, font=f)
            d.text(((W - tw) / 2, H / 2 - 70 + k * 90), line, font=f, fill=(200, 40, 40, 60))
        img = img.rotate(40, resample=Image.BICUBIC)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        _wm_cache["img"] = ImageReader(buf)
    return _wm_cache["img"]


def build_pdf(path: Path, notice: dict, reqs: list[dict], lots: list[dict]) -> dict:
    """Write the placeholder PDF and return {req_key: page_number}."""
    from reportlab.pdfgen import canvas

    path.parent.mkdir(parents=True, exist_ok=True)
    W, H = A4
    c = canvas.Canvas(str(path), pagesize=A4, invariant=1)
    c.setTitle(f"PLACEHOLDER {notice['doffin_id']} — MOCK")
    c.setAuthor("Kvia prototype (generated)")
    h1 = ParagraphStyle("h1", fontName="DejaVu-Bold", fontSize=15, leading=20, spaceAfter=10)
    body = ParagraphStyle("b", fontName="DejaVu", fontSize=10.5, leading=15, spaceAfter=9)
    req_style = ParagraphStyle("r", parent=body, leftIndent=26, firstLineIndent=-26)
    pages = {}

    def chrome(page_no: int):
        c.drawImage(_watermark_png(), (W - 560) / 2, (H - 560) / 2, 560, 560, mask="auto")
        c.setFillColorRGB(0.75, 0.1, 0.1)
        c.setFont("DejaVu-Bold", 8.5)
        c.drawString(40, H - 30, f"{WATERMARK} · {notice['doffin_id']}")
        c.setFillColorRGB(0.4, 0.4, 0.4)
        c.setFont("DejaVu", 8)
        c.drawRightString(W - 40, 28, f"Side {page_no} av {len(SECTIONS)}")
        c.setFillColorRGB(0, 0, 0)

    for page_no, (key, heading) in enumerate(SECTIONS, start=1):
        chrome(page_no)
        story = []
        if key == "cover":
            story += [Paragraph("PLASSHOLDER — Konkurransegrunnlag (MOCK)", h1),
                      Paragraph(f"Kunngjøring: {notice['doffin_id']}", body),
                      Paragraph(f"Tittel i kunngjøringen: {notice['title']}", body),
                      Paragraph(f"Oppdragsgiver i kunngjøringen: {notice['buyer_name'].split(' | ')[0]}", body),
                      Paragraph("Dette dokumentet er IKKE konkurransegrunnlaget. Det er generert av prototypen i fase 1, "
                                "og kravene i det er oppfunnet maler (mock). De beskriver ikke den virkelige "
                                "konkurransen. De originale dokumentene erstatter denne filen i fase 2.", body),
                      Paragraph("This document is NOT the tender document. It was generated for the Phase 1 mock build; "
                                "its requirements are invented templates and describe no real tender.", body)]
        else:
            story.append(Paragraph(heading, h1))
            if key == "om":
                story.append(Paragraph(FILLER, body))
                if lots:
                    story.append(Paragraph("Anskaffelsen er delt i følgende delkontrakter (fra kunngjøringen):", body))
                    for lot in lots:
                        story.append(Paragraph(f"Delkontrakt {lot['lot_id']}: {lot['title_nb']}", req_style))
            sec_reqs = [r for r in reqs if r["section"] == key]
            n = int(heading.split(" ")[0]) if heading and heading[0].isdigit() else 0
            for i, r in enumerate(sec_reqs, start=1):
                lot_txt = f"[Delkontrakt {r['lot_id']}] " if r.get("lot_id") else ""
                story.append(Paragraph(f"{n}.{i}&nbsp;&nbsp;{lot_txt}{r['sentence_nb']}", req_style))
                pages[r["key"]] = page_no
            if key != "om":
                story.append(Paragraph(FILLER if not sec_reqs else
                                       "Kravene over er oppfunnet for prototypen (mock).", body))
        frame = Frame(48, 60, W - 96, H - 110, showBoundary=0)
        frame.addFromList(story, c)
        c.showPage()
    c.save()
    return pages


def write_placeholder_json(folder: Path, doc_name: str) -> None:
    write_json(folder / "PLACEHOLDER.json", {
        "status": "placeholder",
        "expected_documents": ["konkurransegrunnlag", "kravspesifikasjon", "annexes"],
        "generated_pdf": doc_name,
        "phase_1_rule": "counts as 'available (mock)', not as missing (SPEC §18)",
        "mock": True,
    })
