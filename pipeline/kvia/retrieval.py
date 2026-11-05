"""Step 1a — Retrieval (code: page chunks + BM25). SPEC §7 retrieval.

Each tender document is split into page chunks (document name + page number kept). BM25 is run per requirement
category with Norwegian and English query terms; the top-k pages plus every page whose heading matches a requirements
section are passed to extraction. Retrieved page IDs are logged so a requirement found outside them is a retrieval
miss (T8).
"""
from __future__ import annotations

import math
import re
from collections import Counter
from pathlib import Path

import pdfplumber

TOKEN = re.compile(r"[0-9a-zæøåA-ZÆØÅ]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in TOKEN.findall(text)]


def page_chunks(pdf_path: Path) -> list[dict]:
    chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            first = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
            chunks.append({"page_id": f"{pdf_path.name}#p{i}", "document": pdf_path.name, "page": i,
                           "text": text, "heading": first, "has_text_layer": bool(text.strip())})
    return chunks


class BM25:
    def __init__(self, docs: list[list[str]], k1: float = 1.5, b: float = 0.75):
        self.docs, self.k1, self.b = docs, k1, b
        self.N = len(docs)
        self.avgdl = (sum(len(d) for d in docs) / self.N) if self.N else 0.0
        self.tf = [Counter(d) for d in docs]
        df = Counter()
        for d in docs:
            df.update(set(d))
        self.idf = {t: math.log(1 + (self.N - n + 0.5) / (n + 0.5)) for t, n in df.items()}

    def score(self, query: list[str], i: int) -> float:
        s, dl = 0.0, len(self.docs[i])
        for q in query:
            f = self.tf[i].get(q, 0)
            if not f:
                continue
            s += self.idf.get(q, 0) * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * dl / (self.avgdl or 1)))
        return s


def retrieve(chunks: list[dict], cfg: dict) -> dict:
    rc = cfg["retrieval"]
    bm = BM25([tokenize(c["text"]) for c in chunks], rc["bm25_k1"], rc["bm25_b"])
    per_category = {}
    agg: dict[int, float] = {}
    for cat, terms in rc["queries"].items():
        q = tokenize(" ".join(terms))
        scored = sorted(((bm.score(q, i), i) for i in range(len(chunks))), reverse=True)
        per_category[cat] = [{"page_id": chunks[i]["page_id"], "score": round(s, 3)} for s, i in scored if s > 0][:10]
        for s, i in scored:
            agg[i] = max(agg.get(i, 0.0), s)
    top = [i for i, s in sorted(agg.items(), key=lambda x: -x[1]) if s > 0][: rc["top_k"]]
    heading_hits = [i for i, c in enumerate(chunks)
                    if any(p in c["text"].lower() for p in rc["heading_patterns"])]
    selected = sorted(set(top) | set(heading_hits))
    return {
        "pages_total": len(chunks),
        "retrieved_page_ids": [chunks[i]["page_id"] for i in selected],
        "by_heading_match": [chunks[i]["page_id"] for i in heading_hits],
        "per_category_top": per_category,
        "unreadable_pages": [c["page_id"] for c in chunks if not c["has_text_layer"]],
    }
