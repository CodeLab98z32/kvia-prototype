"""Citation check and passage highlighting (code). SPEC §7 highlight, §10.3 citation_check.

citation_check: every cited_text must occur on its cited page of the stored document (whitespace-normalised). A failed
check makes the requirement uncited and lowers extraction confidence.
highlight: locate cited_text on its page with pdfplumber and store {page, rects:[[x0,y0,x1,y1],...]} in PDF
coordinates (origin bottom-left, PDF points), one rect per text line. If the text cannot be located the requirement
keeps its page reference and is marked "passage not highlighted".
"""
from __future__ import annotations

import re
from pathlib import Path

import pdfplumber


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _pattern(cited: str) -> str:
    """Literal match of the cited words, allowing any whitespace (incl. line breaks) between them."""
    return r"\s+".join(re.escape(tok) for tok in norm(cited).split(" "))


def check_and_highlight(pdf_path: Path, page_no: int, cited: str) -> dict:
    res = {"citation_ok": False, "highlight": None, "highlighted": False, "error": None}
    if not pdf_path.exists():
        res["error"] = "document not found"
        return res
    with pdfplumber.open(pdf_path) as pdf:
        if not 1 <= page_no <= len(pdf.pages):
            res["error"] = f"page {page_no} out of range"
            return res
        page = pdf.pages[page_no - 1]
        text = page.extract_text() or ""
        if norm(cited) not in norm(text):
            res["error"] = "cited text not found on cited page"
            return res
        res["citation_ok"] = True
        matches = page.search(_pattern(cited), regex=True, case=True, return_chars=True)
        if not matches:
            res["error"] = "passage could not be located for highlighting"
            return res
        chars = matches[0]["chars"]
        lines: dict[float, list] = {}
        for ch in chars:
            key = round(ch["top"], 0)
            lines.setdefault(key, []).append(ch)
        H = float(page.height)
        rects = []
        for _, cs in sorted(lines.items()):
            x0 = min(c["x0"] for c in cs)
            x1 = max(c["x1"] for c in cs)
            top = min(c["top"] for c in cs)
            bottom = max(c["bottom"] for c in cs)
            rects.append([round(x0, 2), round(H - bottom, 2), round(x1, 2), round(H - top, 2)])
        res["highlight"] = {"page": page_no, "rects": rects, "page_width": float(page.width), "page_height": H}
        res["highlighted"] = True
        return res
