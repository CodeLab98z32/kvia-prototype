"""Convert docs/Synthetic company profiles.docx (Tables B1-B3) to data/profiles/P1.json, P2.json, P3.json.

Data model: Table A1 (docs/Company profile data.docx). Every data point carries value, proof status, last updated
and expiry, copied VERBATIM from the .docx. The script adds:
  * a stable field id and the Table A1 category/data point it belongs to,
  * a normalised proof status from the closed list in SPEC §5.3 (compound statuses are split into `parts`),
  * machine-readable `structured` values (codes, NOK amounts, ISO dates) used by the deterministic code.
The script fails if a row in the .docx is not mapped, or if a mapped row is missing, so nothing is lost or invented.

Usage:  python3 pipeline/tools/build_profiles.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import docx
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "Synthetic company profiles.docx"
OUT = ROOT / "data" / "profiles"

PROOF_ENUM = {"Documented", "Self-declared", "Not applicable", "Declared missing"}

# Table A1 categories (section -> category label) ------------------------------------------------------------
SECTIONS = {
    "Search criteria": ("search_profile", "search_criteria"),
    "Identity and size": ("capability_locker", "identity_and_size"),
    "Capacity": ("capability_locker", "capacity"),
    "Tax and compliance": ("capability_locker", "tax_and_compliance"),
    "Certificates and approvals": ("capability_locker", "certificates_and_approvals"),
    "Financial standing": ("capability_locker", "financial_standing"),
    "References": ("capability_locker", "references"),
    "Account": ("account_and_baseline", "account"),
    "Baseline": ("account_and_baseline", "baseline"),
}

# Row label -> (field id, Table A1 data point) -----------------------------------------------------------------
LABELS = {
    "Main CPV": ("main_cpv", "Main and secondary CPV codes"),
    "Secondary CPV": ("secondary_cpv", "Main and secondary CPV codes"),
    "Region (NUTS)": ("region_nuts", "Region (NUTS codes)"),
    "Contract subject": ("contract_subject", "Contract subject (works, supplies, services)"),
    "Contract form": ("contract_form", "Contract form"),
    "Contract-size band": ("size_band", "Contract-size band (min-max NOK)"),
    "Framework agreements and DPS": ("framework_dps", "Willingness to bid on framework agreements and DPS"),
    "Lot preferences": ("lot_preferences", "Lot preferences for multi-lot notices"),
    "Organisation number": ("org_nr", "Organization number"),
    "Employee count": ("employee_count", "Employee count"),
    "Founding year": ("founding_year", "Founding year"),
    "Staff by role and qualification": ("staff", "Staff by role and qualification"),
    "Key personnel CVs": ("key_personnel_cvs", "Key personnel CVs"),
    "Working languages": ("working_languages", "Working languages (Norwegian/English)"),
    "Insurance type and coverage": ("insurance", "Insurance type and coverage"),
    "Tax and VAT certificate": ("tax_vat_certificate", "Tax and VAT certificate with issue date"),
    "HMS self-declaration": ("hms_declaration", "HMS self-declaration"),
    "StartBANK / Achilles": ("startbank_achilles", "StartBANK/Achilles registration where relevant"),
    "Approved apprentice company": ("approved_apprentice", "Approved apprentice company"),
    "Sector approval": ("sector_approval", "Sector approvals (issuer, scope, expiry)"),
    "Quality management certificate": ("quality_certificate", "Sector approvals (issuer, scope, expiry)"),
    "Environmental management certificate": ("environmental_certificate", "Sector approvals (issuer, scope, expiry)"),
    "Professional driver competence (YSK)": ("driver_competence_ysk", "Sector approvals (issuer, scope, expiry)"),
    "Turnover 2021–2025": ("turnover", "Turnover for the last five years"),
    "Profit before tax": ("profit", "Profit"),
    "Profit before tax 2021–2025": ("profit", "Profit"),
    "Equity ratio": ("equity_ratio", "Equity ratio"),
    "Credit rating": ("credit_rating", "Credit rating"),
    "Reference 1": ("reference_1", "References (client, public/private, year, value, CPV, description)"),
    "Reference 2": ("reference_2", "References (client, public/private, year, value, CPV, description)"),
    "Reference 3": ("reference_3", "References (client, public/private, year, value, CPV, description)"),
    "Reference 4": ("reference_4", "References (client, public/private, year, value, CPV, description)"),
    "Bid coordinator": ("bid_coordinator", "Named bid coordinator and contact details"),
    "Bidding history": ("bidding_history", "Bidding history (number of past bids and wins)"),
    "Current way of finding tenders": ("finding_tenders", "Current way of finding tenders"),
    "Time spent on past bid attempts": ("time_spent", "Time spent on past bid attempts"),
    "Starting experience with AI tools": ("ai_experience", "Starting experience with AI tools"),
}

# Display names: the profiles have no firm name. The table titles are used ("Synthetic Company n").
FIRMS = {
    "P1": {"table": "B1", "name": "Synthetic Company 1", "initials": "SC1",
           "sector_en": "Carpentry and renovation · Telemark / Vestfold",
           "sector_nb": "Tømrer og rehabilitering · Telemark / Vestfold"},
    "P2": {"table": "B2", "name": "Synthetic Company 2", "initials": "SC2",
           "sector_en": "Water, sewer and road engineering consultancy · Rogaland",
           "sector_nb": "Rådgivende ingeniør for vann, avløp og vei · Rogaland"},
    "P3": {"table": "B3", "name": "Synthetic Company 3", "initials": "SC3",
           "sector_en": "Septic, sewer and sludge services · Agder / Telemark",
           "sector_nb": "Slamtømming, avløp og slam · Agder / Telemark"},
}

M = 1_000_000


def ref(client_type, year, value, cpv, region):
    return {"client_type": client_type, "year": year, "value_nok": value, "cpv": cpv, "region": region}


# Structured values and normalised proof status per profile and field. `proof` may be a string from PROOF_ENUM
# or a list of parts. `expiry_date` is the ISO date the code evaluates (None = no expiry).
STRUCT = {
    "P1": {
        "main_cpv": {"structured": {"codes": ["45453000"]}},
        "secondary_cpv": {"structured": {"codes": ["45000000", "45210000", "45262700", "45421000"]}},
        "region_nuts": {"structured": {"codes": ["NO094", "NO093"]}},
        "contract_subject": {"structured": {"subjects": ["Works"]}},
        "contract_form": {"structured": {"execution": True, "design_and_build": True, "design_and_build_max_nok": 8 * M,
                                         "design_and_build_note": "with an external designer",
                                         "general_contract": False, "subcontractor": True}},
        "size_band": {"structured": {"min_nok": 0.3 * M, "max_nok": 8 * M, "basis": "per contract"}},
        "framework_dps": {"structured": {"framework": True, "dps": False}},
        "lot_preferences": {"structured": {"max_lots": 2, "preferred_max_lot_value_nok": 4 * M, "disciplines": None}},
        "employee_count": {"structured": {"count": 14}},
        "founding_year": {"structured": {"year": 2009}},
        "key_personnel_cvs": {"proof": "Documented", "documented_n": 2, "documented_m": 3,
                              "structured": {"held": ["managing director", "project manager"],
                                             "missing": ["external designer"]}},
        "working_languages": {"structured": {"languages": ["nb", "en", "pl"], "all_staff_norwegian": True}},
        "insurance": {"expiry_date": "2026-12-31", "structured": {"type": "general liability", "coverage_nok": 10 * M}},
        "tax_vat_certificate": {"structured": {"issue_date": "2026-03-10", "validity_rule": "six_months_from_issue"},
                                "expiry_date": "2026-09-10"},
        "hms_declaration": {"structured": {"signed": "2026-01-15"}, "expiry_date": "2027-01-15", "expiry_kind": "review_due"},
        "startbank_achilles": {"proof": [
            {"part": "StartBANK", "proof_status": "Documented", "expiry_date": "2027-05-31", "registered": True},
            {"part": "Achilles", "proof_status": "Not applicable", "expiry_date": None, "registered": False}]},
        "approved_apprentice": {"structured": {"approved": True, "issuer": "county authority, Telemark", "scope": "carpentry trade"}},
        "sector_approval": {"expiry_date": "2027-02-28",
                            "structured": {"issuer": "DiBK", "scope": ["execution", "carpentry", "building envelope"],
                                           "tiltaksklasse": 2, "design_approval": False}},
        "turnover": {"structured": {"by_year_nok": {"2021": 17.9 * M, "2022": 20.4 * M, "2023": 22.8 * M,
                                                     "2024": 21.6 * M, "2025": 24.1 * M}}},
        "profit": {"proof": [
            {"part": "2025", "proof_status": "Documented", "expiry_date": None},
            {"part": "2021–2024", "proof_status": "Declared missing", "expiry_date": None}],
            "structured": {"by_year_nok": {"2025": 1.3 * M}}},
        "equity_ratio": {"structured": {"percent": 24, "year": 2025}},
        "credit_rating": {"structured": {"rating": "A"}},
        "reference_1": {"structured": ref("public", 2025, 3.4 * M, "45453000", "Telemark")},
        "reference_2": {"structured": ref("private", 2024, 5.2 * M, "45262700", "Vestfold")},
        "reference_3": {"structured": ref("public", 2023, 1.1 * M, "45421000", "Telemark")},
        "reference_4": {"structured": ref("private", 2022, 2.6 * M, "45210000", "Telemark")},
    },
    "P2": {
        "main_cpv": {"structured": {"codes": ["71322000"]}},
        "secondary_cpv": {"structured": {"codes": ["71300000", "71311000", "71311300", "71320000"]}},
        "region_nuts": {"structured": {"codes": ["NO0A1"]}},
        "contract_subject": {"structured": {"subjects": ["Services"]}},
        "contract_form": {"structured": {"execution": None, "design_and_build": None, "general_contract": None,
                                         "subcontractor": True,
                                         "note": "not applicable to a consultancy except sub-consultant"}},
        "size_band": {"structured": {"min_nok": 0.2 * M, "max_nok": 5 * M,
                                     "basis": "per contract or expected call-off volume"}},
        "framework_dps": {"structured": {"framework": True, "parallel_framework": True, "dps": True}},
        "lot_preferences": {"structured": {"max_lots": 2, "disciplines": ["water", "sewer", "road"]}},
        "employee_count": {"structured": {"count": 9}},
        "founding_year": {"structured": {"year": 2017}},
        "key_personnel_cvs": {"structured": {"held": ["managing director", "four lead engineers"], "missing": []}},
        "working_languages": {"structured": {"languages": ["nb", "en"], "all_staff_norwegian": True}},
        "insurance": {"expiry_date": "2027-03-31", "structured": {"type": "professional liability", "coverage_nok": 20 * M}},
        "tax_vat_certificate": {"structured": {"issue_date": "2026-10-12", "validity_rule": "six_months_from_issue"},
                                "expiry_date": "2027-04-12"},
        "hms_declaration": {"structured": {"signed": None}},
        "startbank_achilles": {"proof": [
            {"part": "StartBANK", "proof_status": "Documented", "expiry_date": "2026-09-30", "registered": True},
            {"part": "Achilles", "proof_status": "Not applicable", "expiry_date": None, "registered": False}]},
        "approved_apprentice": {"structured": {"approved": False}},
        "sector_approval": {"expiry_date": "2028-04-30",
                            "structured": {"issuer": "DiBK", "scope": ["design of water and sewer", "design of roads"],
                                           "tiltaksklasse": 2, "design_approval": True}},
        "quality_certificate": {"structured": {"standard": "ISO 9001", "held": False}},
        "turnover": {"structured": {"by_year_nok": {"2021": 8.2 * M, "2022": 9.6 * M, "2023": 11.3 * M,
                                                     "2024": 12.7 * M, "2025": 13.4 * M}}},
        "profit": {"structured": {"by_year_nok": {"2021": 0.9 * M, "2022": 1.2 * M, "2023": 1.5 * M,
                                                   "2024": 1.7 * M, "2025": 1.9 * M}}},
        "equity_ratio": {"structured": {"percent": 41, "year": 2025}},
        "credit_rating": {"structured": {"rating": None}},
        "reference_1": {"structured": ref("public", 2025, 1.8 * M, "71322000", "Rogaland")},
        "reference_2": {"structured": ref("private", 2024, 0.9 * M, "71320000", "Rogaland")},
        "reference_3": {"structured": ref("private (public end client)", 2023, 1.4 * M, "71322000", "Vestland")},
        "reference_4": {"structured": ref("public", 2022, 0.6 * M, "71311300", "Rogaland")},
    },
    "P3": {
        "main_cpv": {"structured": {"codes": ["90460000"]}},
        "secondary_cpv": {"structured": {"codes": ["90470000", "90513600", "90513700", "90640000"]}},
        "region_nuts": {"structured": {"codes": ["NO092", "NO094"]}},
        "contract_subject": {"structured": {"subjects": ["Services"]}},
        "contract_form": {"structured": {"execution": None, "design_and_build": None, "general_contract": None,
                                         "subcontractor": True,
                                         "note": "not applicable to a services firm except subcontractor"}},
        "size_band": {"structured": {"min_nok": 1 * M, "max_nok": 25 * M, "basis": "total contract value incl. options"}},
        "framework_dps": {"proof": [
            {"part": "Framework", "proof_status": "Self-declared", "expiry_date": None},
            {"part": "DPS", "proof_status": "Declared missing", "expiry_date": None}],
            "structured": {"framework": True, "dps": None}},
        "lot_preferences": {"structured": {"max_lots": None, "regions": ["Agder"], "whole_contract": True}},
        "employee_count": {"structured": {"count": 22}},
        "founding_year": {"structured": {"year": 1998}},
        "key_personnel_cvs": {"structured": {"held": [], "missing": ["all"]}},
        "working_languages": {"structured": {"languages": ["nb", "en", "lt"], "all_staff_norwegian": True}},
        "insurance": {"expiry_date": "2027-01-31",
                      "structured": {"type": "general liability incl. sudden pollution damage", "coverage_nok": 10 * M}},
        "tax_vat_certificate": {"structured": {"issue_date": "2026-08-20", "validity_rule": "six_months_from_issue"},
                                "expiry_date": "2027-02-20"},
        "hms_declaration": {"structured": {"signed": "2026-02-03"}, "expiry_date": "2027-02-03", "expiry_kind": "review_due"},
        "startbank_achilles": {"proof": [
            {"part": "StartBANK", "proof_status": "Not applicable", "expiry_date": None, "registered": False},
            {"part": "Achilles", "proof_status": "Not applicable", "expiry_date": None, "registered": False}]},
        "approved_apprentice": {"structured": {"approved": True, "issuer": "county authority, Agder",
                                               "scope": "heavy-vehicle mechanics"}},
        "environmental_certificate": {"expiry_date": "2026-11-30",
                                      "structured": {"standard": "ISO 14001", "held": True,
                                                     "scope": "septic, sewer and sludge services"}},
        "driver_competence_ysk": {"expiry_date": "2026-12-15", "expiry_kind": "earliest",
                                  "structured": {"certified": 16, "of": 16}},
        "turnover": {"structured": {"by_year_nok": {"2021": 31.5 * M, "2022": 33.0 * M, "2023": 36.2 * M,
                                                     "2024": 38.9 * M, "2025": 37.4 * M}}},
        "profit": {"structured": {"by_year_nok": {"2021": 1.6 * M, "2022": 1.9 * M, "2023": 2.4 * M,
                                                   "2024": 2.6 * M, "2025": 2.2 * M}}},
        "equity_ratio": {"structured": {"percent": 32, "year": 2025}},
        "credit_rating": {"structured": {"rating": "AA"}},
        "reference_1": {"structured": ref("public", 2026, 9.8 * M, "90460000", "Telemark") | {"years": "2022–2026"}},
        "reference_2": {"structured": ref("private", 2024, 1.5 * M, "90513600", "Agder")},
        "reference_3": {"structured": ref("private", 2025, 0.7 * M, "90470000", "Agder")},
    },
}

NB_LABELS = {
    "main_cpv": "Hoved-CPV", "secondary_cpv": "Sekundære CPV-koder", "region_nuts": "Region (NUTS)",
    "contract_subject": "Kontraktstype", "contract_form": "Kontraktsform", "size_band": "Kontraktsstørrelse",
    "framework_dps": "Rammeavtaler og DPS", "lot_preferences": "Delkontrakter", "org_nr": "Organisasjonsnummer",
    "employee_count": "Antall ansatte", "founding_year": "Stiftelsesår", "staff": "Ansatte etter rolle og kvalifikasjon",
    "key_personnel_cvs": "CV-er for nøkkelpersonell", "working_languages": "Arbeidsspråk",
    "insurance": "Forsikring og dekning", "tax_vat_certificate": "Skatteattest (skatt og mva.)",
    "hms_declaration": "HMS-egenerklæring", "startbank_achilles": "StartBANK / Achilles",
    "approved_apprentice": "Godkjent lærebedrift", "sector_approval": "Sentral godkjenning",
    "quality_certificate": "Kvalitetssertifikat", "environmental_certificate": "Miljøsertifikat",
    "driver_competence_ysk": "Yrkessjåførkompetanse (YSK)", "turnover": "Omsetning 2021–2025",
    "profit": "Resultat før skatt", "equity_ratio": "Egenkapitalandel", "credit_rating": "Kredittvurdering",
    "reference_1": "Referanse 1", "reference_2": "Referanse 2", "reference_3": "Referanse 3", "reference_4": "Referanse 4",
    "bid_coordinator": "Tilbudsansvarlig", "bidding_history": "Tilbudshistorikk",
    "finding_tenders": "Slik finner firmaet konkurranser i dag", "time_spent": "Tidsbruk på tidligere tilbud",
    "ai_experience": "Erfaring med KI-verktøy",
}

NB_CATEGORIES = {
    "search_criteria": "Søkekriterier", "identity_and_size": "Identitet og størrelse", "capacity": "Kapasitet",
    "tax_and_compliance": "Skatt og etterlevelse", "certificates_and_approvals": "Sertifikater og godkjenninger",
    "financial_standing": "Økonomi", "references": "Referanser", "account": "Konto", "baseline": "Utgangspunkt",
}


def normalise_proof(text: str) -> str:
    t = text.strip()
    if t in PROOF_ENUM:
        return t
    if t.startswith("Documented (") and " of " in t:
        return "Documented (n of m)"
    if t.startswith("Documented"):
        return "Documented"
    raise ValueError(f"Unmapped proof status: {t!r} — add explicit parts in STRUCT")


def read_tables():
    d = docx.Document(SRC)
    tables = []
    for child in d.element.body.iterchildren():
        if child.tag == qn("w:tbl"):
            tbl = docx.table.Table(child, d)
            rows = []
            for r in tbl.rows:
                cells, prev = [], None
                for c in r.cells:
                    if c._tc is prev:
                        continue
                    prev = c._tc
                    cells.append(c.text.strip())
                rows.append(cells)
            tables.append(rows)
    return tables


def build(pid: str, rows: list[list[str]]) -> dict:
    meta = FIRMS[pid]
    struct = STRUCT[pid]
    profile = {
        "profile_id": pid,
        "synthetic": True,
        "source": f"docs/Synthetic company profiles.docx, Table {meta['table']}",
        "data_model": "Table A1, docs/Company profile data.docx",
        "firm": {"name": meta["name"], "initials": meta["initials"], "sector_en": meta["sector_en"],
                 "sector_nb": meta["sector_nb"],
                 "name_note_en": "The profile tables give no firm name; the table title is used as display name.",
                 "name_note_nb": "Profiltabellene oppgir ikke firmanavn; tabelltittelen brukes som visningsnavn."},
        "search_profile": [], "capability_locker": [], "account_and_baseline": [],
    }
    section = None
    seen = set()
    for cells in rows:
        if len(cells) == 1 or (len(cells) > 1 and all(c == cells[0] for c in cells)):
            head = cells[0]
            if head in SECTIONS:
                section = SECTIONS[head]
            continue
        if cells[0] == "Data point":
            continue
        label, value, proof, updated, expiry = cells[:5]
        if label not in LABELS:
            raise SystemExit(f"{pid}: unmapped row label {label!r}")
        fid, a1 = LABELS[label]
        s = struct.get(fid, {})
        entry = {
            "id": fid,
            "label_en": label,
            "label_nb": NB_LABELS[fid],
            "table_a1_category": section[1],
            "table_a1_category_nb": NB_CATEGORIES[section[1]],
            "table_a1_data_point": a1,
            "value": value,
            "proof_status_original": proof,
            "last_updated": updated,
            "expiry_original": expiry,
        }
        p = s.get("proof")
        if isinstance(p, list):
            entry["proof_status"] = "Mixed"
            entry["parts"] = p
        else:
            entry["proof_status"] = normalise_proof(p or proof) if not (p and p in PROOF_ENUM) else p
            if "documented_n" in s or entry["proof_status"] == "Documented (n of m)":
                entry["proof_status"] = "Documented (n of m)"
                entry["documented_n"] = s.get("documented_n")
                entry["documented_m"] = s.get("documented_m")
        entry["expiry_date"] = s.get("expiry_date")
        if "expiry_kind" in s:
            entry["expiry_kind"] = s["expiry_kind"]
        entry["structured"] = s.get("structured", {})
        profile[section[0]].append(entry)
        seen.add(fid)
    missing = set(struct) - seen
    if missing:
        raise SystemExit(f"{pid}: structured data for unknown rows {missing}")
    return profile


def main() -> int:
    tables = read_tables()
    OUT.mkdir(parents=True, exist_ok=True)
    for i, pid in enumerate(["P1", "P2", "P3"]):
        prof = build(pid, tables[i])
        (OUT / f"{pid}.json").write_text(json.dumps(prof, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        n = sum(len(prof[k]) for k in ("search_profile", "capability_locker", "account_and_baseline"))
        print(f"{pid}: {n} data points -> {OUT / (pid + '.json')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
