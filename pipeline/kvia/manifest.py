"""Manifest of a frozen run: every output file with its SHA-256 (SPEC §10.3 freeze)."""
from __future__ import annotations

from pathlib import Path

from .util import sha256_bytes, sha256_file, write_json


def write(out: Path, run_id: str) -> dict:
    files = sorted(p for p in out.rglob("*") if p.is_file() and p.name != "manifest.json")
    entries = [{"path": str(p.relative_to(out)), "sha256": sha256_file(p), "bytes": p.stat().st_size} for p in files]
    body = "\n".join(f"{e['sha256']}  {e['path']}" for e in entries).encode("utf-8")
    man = {"run_id": run_id, "files": entries, "manifest_sha256": sha256_bytes(body)}
    write_json(out / "manifest.json", man)
    return man


def verify(out: Path) -> list[str]:
    from .util import read_json
    man = read_json(out / "manifest.json")
    bad = []
    for e in man["files"]:
        p = out / e["path"]
        if not p.exists() or sha256_file(p) != e["sha256"]:
            bad.append(e["path"])
    return bad
