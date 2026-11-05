"""Phase 1 MOCK requirement templates (SPEC §18 mock_ai_outputs.extraction).

Generic requirement types per category (tax certificate, HMS, turnover, references, certificates, capacity, …). The
Norwegian sentence of each template is written into the watermarked placeholder PDF and later cited by the mock
extraction, so citation check and highlighting run for real on mock content.
NOTHING HERE DESCRIBES A REAL TENDER. Every object derived from these templates carries mock: true.

`check` names the mock classification rule (kvia/mock/classification.py) and its parameters.
"""
from __future__ import annotations

M = 1_000_000

# PDF section per category (page numbers are assigned by the PDF generator)
SECTION_OF = {"qualification": "kval", "financial": "kval", "formal": "kval", "reference": "kval",
              "certification": "dok", "hms": "dok", "capacity": "spec", "technical": "spec"}


def nok(x: float) -> str:
    return f"{x / M:g}".replace(".", ",")


def T(key, category, nb, en_sum, nb_sum, *, mandatory=True, proof=True, proof_type=None, check=None, lot=None):
    return {"key": key, "category": category, "sentence_nb": nb, "text_summary_en": en_sum, "text_summary_nb": nb_sum,
            "mandatory": mandatory, "proof_demanded": proof, "proof_type": proof_type, "check": check or {},
            "lot_id": lot}


def tax():
    return T("tax", "formal",
             "Leverandøren skal levere skatteattest for skatt og merverdiavgift som ikke er eldre enn seks måneder "
             "regnet fra tilbudsfristen.",
             "Tax and VAT certificate, not older than six months at the tender deadline",
             "Skatteattest for skatt og mva., ikke eldre enn seks måneder ved tilbudsfristen",
             proof_type="Skatteattest", check={"rule": "tax"})


def hms():
    return T("hms", "hms",
             "Leverandøren skal ha et system for helse, miljø og sikkerhet (HMS) og legge ved signert HMS-egenerklæring.",
             "HMS system with a signed HMS self-declaration",
             "HMS-system med signert HMS-egenerklæring",
             proof_type="Signert HMS-egenerklæring", check={"rule": "hms"})


def turnover(x):
    return T("turnover", "financial",
             f"Leverandøren skal ha hatt en årlig omsetning på minimum NOK {nok(x)} millioner i hvert av de tre siste "
             f"regnskapsårene.",
             f"Annual turnover of at least NOK {x / M:g} million in each of the last three financial years",
             f"Årlig omsetning på minst NOK {nok(x)} mill. i hvert av de tre siste regnskapsårene",
             proof_type="Årsregnskap", check={"rule": "turnover", "min_nok": x})


def credit():
    return T("credit", "financial",
             "Leverandøren skal ha tilfredsstillende økonomisk og finansiell kapasitet, dokumentert med "
             "kredittvurdering fra et anerkjent kredittvurderingsbyrå.",
             "Satisfactory financial capacity documented by a credit rating from a recognised agency",
             "Tilfredsstillende økonomisk kapasitet dokumentert med kredittvurdering",
             proof_type="Kredittvurdering", check={"rule": "credit"})


def insurance(x, key="insurance", page_hint=None, nb_extra=""):
    t = T(key, "financial",
          f"Leverandøren skal ha ansvarsforsikring med dekning på minimum NOK {nok(x)} millioner per skadetilfelle"
          f"{nb_extra}.",
          f"Liability insurance covering at least NOK {x / M:g} million per claim",
          f"Ansvarsforsikring med dekning på minst NOK {nok(x)} mill. per skadetilfelle",
          proof_type="Forsikringsbevis", check={"rule": "insurance", "min_nok": x})
    if page_hint:
        t["section"] = page_hint
    return t


def references(n, prefixes, min_value, what_nb, what_en, lot=None):
    return T("references" + (f"_{lot}" if lot else ""), "reference",
             f"Leverandøren skal ha erfaring fra minimum {n} sammenlignbare oppdrag innen {what_nb} de siste fem årene, "
             f"hvert med verdi på minst NOK {nok(min_value)} millioner, dokumentert med referanseliste.",
             f"At least {n} comparable assignments in {what_en} in the last five years, each worth at least "
             f"NOK {min_value / M:g} million (reference list)",
             f"Minst {n} sammenlignbare oppdrag innen {what_nb} siste fem år, hvert på minst NOK {nok(min_value)} mill. "
             f"(referanseliste)",
             proof_type="Referanseliste med kontaktpersoner",
             check={"rule": "references", "n": n, "prefixes": prefixes, "min_value": min_value}, lot=lot)


def language():
    return T("language", "formal",
             "Leverandørens nøkkelpersonell skal beherske norsk muntlig og skriftlig.",
             "Key personnel must speak and write Norwegian",
             "Nøkkelpersonell skal beherske norsk muntlig og skriftlig",
             proof=False, check={"rule": "language"})


def approval_execution():
    return T("approval_execution", "certification",
             "Leverandøren skal ha sentral godkjenning for ansvarsrett for utførelse i tiltaksklasse 2.",
             "Central approval (DiBK) for execution, tiltaksklasse 2",
             "Sentral godkjenning for utførelse i tiltaksklasse 2",
             proof_type="Sentral godkjenning", check={"rule": "approval", "scope": "execution"})


def approval_design(lot=None):
    return T("approval_design" + (f"_{lot}" if lot else ""), "certification",
             "Leverandøren skal ha sentral godkjenning for ansvarsrett for prosjektering i tiltaksklasse 2.",
             "Central approval (DiBK) for design (prosjektering), tiltaksklasse 2",
             "Sentral godkjenning for prosjektering i tiltaksklasse 2",
             proof_type="Sentral godkjenning", check={"rule": "approval", "scope": "design"}, lot=lot)


def cv(roles_nb, roles_en):
    return T("cv", "capacity",
             f"Tilbyder skal oppgi {roles_nb} og legge ved CV for disse.",
             f"Named {roles_en} with CVs",
             f"Navngitt {roles_nb} med CV",
             proof_type="CV-er", check={"rule": "cv"})


def pm_experience():
    return T("pm_experience", "capacity",
             "Prosjektleder skal ha minimum fem års erfaring fra tilsvarende ombyggingsprosjekter.",
             "Project manager with at least five years' experience from similar conversion projects",
             "Prosjektleder med minst fem års erfaring fra tilsvarende ombygginger",
             proof_type="CV for prosjektleder", check={"rule": "pm_experience"})


def staff_trade():
    return T("staff_trade", "capacity",
             "Leverandøren skal disponere minimum seks håndverkere med fagbrev i tømrerfaget gjennom hele "
             "byggeperioden.",
             "At least six craftspeople with a carpentry trade certificate throughout construction",
             "Minst seks håndverkere med fagbrev i tømrerfaget gjennom hele byggeperioden",
             proof=False, check={"rule": "staff_trade", "min": 6})


def startbank():
    return T("startbank", "qualification",
             "Leverandøren skal være registrert og kvalifisert i StartBANK ved tilbudsfristen.",
             "Registered and qualified in StartBANK at the tender deadline",
             "Registrert og kvalifisert i StartBANK ved tilbudsfristen",
             proof_type="StartBANK-registrering", check={"rule": "startbank"})


def apprentice(mandatory=True):
    nb = ("Leverandøren skal være godkjent lærebedrift." if mandatory else
          "Det er ønskelig at leverandøren er godkjent lærebedrift.")
    return T("apprentice", "qualification", nb,
             "Approved apprentice company" + ("" if mandatory else " (desirable, not mandatory)"),
             "Godkjent lærebedrift" + ("" if mandatory else " (ønskelig, ikke obligatorisk)"),
             mandatory=mandatory, proof_type="Godkjenning som lærebedrift", check={"rule": "apprentice"})


def iso14001():
    return T("iso14001", "certification",
             "Leverandøren skal ha et miljøstyringssystem sertifisert etter ISO 14001 eller tilsvarende.",
             "Environmental management system certified to ISO 14001 or equivalent",
             "Miljøstyringssystem sertifisert etter ISO 14001 eller tilsvarende",
             proof_type="ISO 14001-sertifikat", check={"rule": "iso14001"})


def iso9001():
    return T("iso9001", "certification",
             "Leverandøren skal ha et kvalitetsstyringssystem sertifisert etter ISO 9001 eller tilsvarende.",
             "Quality management system certified to ISO 9001 or equivalent",
             "Kvalitetsstyringssystem sertifisert etter ISO 9001 eller tilsvarende",
             proof_type="ISO 9001-sertifikat", check={"rule": "iso9001"})


def fleet():
    return T("fleet", "capacity",
             "Leverandøren skal disponere tilstrekkelig antall slamsugere og nødvendig utstyr til å gjennomføre "
             "tømming av anslagsvis 2100 til 2300 enheter per år.",
             "Sufficient vacuum trucks and equipment for an estimated 2,100–2,300 units per year",
             "Tilstrekkelig antall slamsugere og utstyr for anslagsvis 2100–2300 enheter per år",
             proof_type="Oversikt over kjøretøy og utstyr", check={"rule": "no_field", "topic": "fleet/equipment capacity"})


def ysk():
    return T("ysk", "certification",
             "Alle sjåfører skal ha gyldig yrkessjåførkompetanse (YSK) gjennom hele kontraktsperioden.",
             "All drivers hold valid professional driver competence (YSK)",
             "Alle sjåfører har gyldig yrkessjåførkompetanse (YSK)",
             proof_type="YSK-bevis", check={"rule": "ysk"})


def license_finance():
    return T("license", "certification",
             "Leverandøren skal ha konsesjon fra Finanstilsynet til å drive skadeforsikringsvirksomhet i Norge.",
             "Licence from the Financial Supervisory Authority to provide non-life insurance in Norway",
             "Konsesjon fra Finanstilsynet for skadeforsikring i Norge",
             proof_type="Konsesjon", check={"rule": "no_field", "topic": "insurance licence"})


def iso13485():
    return T("iso13485", "certification",
             "Produsenten skal være sertifisert etter ISO 13485 for medisinsk utstyr.",
             "Manufacturer certified to ISO 13485 (medical devices)",
             "Produsent sertifisert etter ISO 13485 (medisinsk utstyr)",
             proof_type="ISO 13485-sertifikat", check={"rule": "no_field", "topic": "medical device certification"})


def equity(pct):
    return T("equity", "financial",
             f"Leverandøren skal ha en egenkapitalandel på minimum {pct} prosent i siste avlagte årsregnskap.",
             f"Equity ratio of at least {pct} % in the latest annual accounts",
             f"Egenkapitalandel på minst {pct} % i siste årsregnskap",
             proof_type="Årsregnskap", check={"rule": "equity", "min_pct": pct})


def technical(nb, en_sum, nb_sum):
    return T("technical", "technical", nb, en_sum, nb_sum, proof=False,
             check={"rule": "no_field", "topic": "product/technical specification"})


# Lots (AI-derived from the notice description; in Phase 1 written by code) ------------------------------------
LOTS = {
    "2026-116579": [
        {"lot_id": "A", "title_nb": "Rådgivning, planlegging og prosjektering innen mobilitets-, transport- og "
                                    "reguleringsplanlegging",
         "title_en": "Advice, planning and design in mobility, transport and zoning planning", "source": "notice description"},
        {"lot_id": "B", "title_nb": "Rådgivning, planlegging og prosjektering innen vei, vann og avløp",
         "title_en": "Advice, planning and design in road, water and sewer", "source": "notice description"},
    ],
    "2026-116566": [
        {"lot_id": "1", "title_nb": "Lederstillinger", "title_en": "Management positions", "source": "notice description"},
        {"lot_id": "2", "title_nb": "Administrative, merkantile og øvrige støttefunksjoner",
         "title_en": "Administrative, clerical and other support functions", "source": "notice description"},
        {"lot_id": "3", "title_nb": "Tekniske og faglige stillinger", "title_en": "Technical and professional positions",
         "source": "notice description"},
    ],
    "2026-115833": [
        {"lot_id": str(i), "title_nb": f"Geografisk delkontrakt {i} (detaljer i konkurransegrunnlaget)",
         "title_en": f"Geographic lot {i} (details in the tender documents)", "source": "notice description"}
        for i in (1, 2, 3)],
}

# Requirement sets per notice -----------------------------------------------------------------------------------
SETS = {
    # P1 anchor
    "2026-116619": [tax(), hms(), turnover(10 * M), insurance(5 * M), approval_execution(), approval_design(),
                    cv("ansvarlig prosjektleder, anleggsleder og ansvarlig prosjekterende",
                       "project manager, site manager and responsible designer"),
                    pm_experience(), staff_trade(),
                    references(2, ["4545", "4526", "4521", "4542", "4500"], 1 * M, "ombygging og rehabilitering",
                               "conversion and refurbishment"),
                    startbank(), language()],
    # P2 anchor (2 lots)
    "2026-116579": [tax(), hms(), credit(), turnover(8 * M), insurance(10 * M), startbank(),
                    cv("oppdragsansvarlig og fagansvarlige rådgivere", "lead consultant and discipline leads"),
                    apprentice(mandatory=False),
                    references(3, ["7141", "7131"], 1 * M, "mobilitets-, transport- og reguleringsplanlegging",
                               "mobility, transport and zoning planning", lot="A"),
                    references(3, ["7132", "7131"], 1 * M, "prosjektering av vei, vann og avløp",
                               "design of road, water and sewer", lot="B"),
                    approval_design(lot="B"), language()],
    # P3 anchor
    "2026-116568": [tax(), hms(), turnover(15 * M), insurance(10 * M), iso14001(), fleet(), ysk(),
                    cv("driftsleder og kontaktperson for avtalen", "operations manager and contract contact"),
                    references(2, ["9046", "9051", "9047"], 1 * M, "tømming av slamavskillere og slamtransport",
                               "septic tank emptying and sludge transport"),
                    language()],
    # flagged: conflicting values -> released by adviser with correction
    "2026-116600": [tax(), hms(), turnover(10 * M), insurance(5 * M), apprentice(), language(),
                    insurance(10 * M, key="insurance_annex", page_hint="vilkar",
                          nb_extra=" i hele avtaleperioden, jf. kontraktsvilkårene")],
    # flagged: low self-rating + uncited requirement -> pending
    "2026-116577": [tax(), hms(), turnover(10 * M), credit(), language(),
                    cv("faglig leder og stedlig leder", "professional lead and on-site manager")],
    "2026-116544": [tax(), hms(), turnover(3 * M), insurance(5 * M),
                    references(2, ["3911", "3915", "3914", "4500"], 0.5 * M, "levering og montering av møbler",
                               "supply and installation of furniture"),
                    technical("Møblene skal leveres i henhold til fargeskjema og møbelplan i oppdragsbeskrivelsen.",
                              "Furniture according to the colour scheme and furniture plan",
                              "Møbler i henhold til fargeskjema og møbelplan"),
                    language()],
    "2026-116566": [tax(), hms(), credit(), turnover(10 * M),
                    references(3, ["7960", "7961"], 0.3 * M, "rekrutteringsbistand", "recruitment services"),
                    cv("rekrutteringsrådgivere", "recruitment consultants"), language()],
    "2026-115833": [tax(), hms(), turnover(20 * M),
                    references(2, ["2211"], 1 * M, "levering av trykte læremidler", "supply of printed teaching aids"),
                    language()],
    "2026-116318": [tax(), hms(), turnover(5 * M), iso9001(),
                    references(2, ["3234", "3232"], 1 * M, "levering av tolkeløsninger", "interpreting systems"),
                    language()],
    "2026-116334": [tax(), credit(), license_finance(), equity(20),
                    references(2, ["6651"], 2 * M, "skadeforsikring for offentlige virksomheter",
                               "non-life insurance for public bodies")],
    "2026-116580": [tax(), iso13485(), turnover(5 * M),
                    references(2, ["3310", "3316"], 0.5 * M, "levering av medisinsk utstyr", "supply of medical equipment")],
    "2026-116581": [tax(), hms(), turnover(3 * M),
                    references(3, ["8059", "8056", "8051"], 0.2 * M, "kurs og kompetansetjenester",
                               "courses and competence services"),
                    cv("kursholdere", "course instructors"), language()],
    # MOCK notices
    "MOCK-0003": [tax(), hms(), references(2, ["7132"], 0.5 * M, "prosjektering av vannledninger",
                                         "design of water mains")],
    "MOCK-0004": [tax(), turnover(1 * M)],
}

# Mock extraction anomalies used to demonstrate the release gate (SPEC §18 release_gate modes)
ANOMALIES = {
    "2026-116577": {"model_self_rating": "low", "uncited": ["cv"],
                    "note_en": "MOCK: model self-rating low; one requirement returned without a citation.",
                    "note_nb": "MOCK: lav egenvurdering fra modellen; ett krav uten kildehenvisning."},
    "2026-116600": {"conflict": {"keys": ["insurance", "insurance_annex"],
                                 "description_en": "MOCK: insurance coverage stated as NOK 5 million in the tender "
                                                   "document and NOK 10 million in the contract terms.",
                                 "description_nb": "MOCK: forsikringsdekning oppgitt som NOK 5 millioner i "
                                                   "konkurransegrunnlaget og NOK 10 millioner i kontraktsvilkårene."}},
}


def requirement_set(notice_id: str) -> list[dict]:
    reqs = SETS.get(notice_id, [])
    out = []
    for i, t in enumerate(reqs, start=1):
        r = dict(t)
        r["req_id"] = f"R{i:02d}"
        r.setdefault("section", SECTION_OF[r["category"]])
        out.append(r)
    return out
