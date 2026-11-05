"""Pydantic schemas for every AI output (SPEC §7, §10.3 constrained_llm_output).

The same schemas apply to the Phase 1 mock outputs and the Phase 2 real outputs. An output that fails validation is
rejected and logged; for extraction a failed pass-2 validation is a release-gate flag trigger (SPEC §9).
"""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Category = Literal["qualification", "technical", "financial", "certification", "hms", "reference", "capacity", "formal"]
Level = Literal["high", "medium", "low"]
MatchStatus = Literal["met", "partly_met", "not_met", "lacks_data"]
SUBSCORE_KEYS = ("subject_relevance", "region", "contract_subject", "size", "contract_form", "framework_dps", "lots")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Source(Strict):
    document: str
    page_start: int = Field(ge=1)
    page_end: int = Field(ge=1)
    cited_text: str = Field(min_length=8)


class Requirement(Strict):
    req_id: str
    lot_id: Optional[str] = None
    category: Category
    text_summary_en: str
    text_summary_nb: str
    mandatory: bool
    proof_demanded: bool
    proof_type: Optional[str] = None
    source: Optional[Source] = None          # None = uncited -> never influences the indication; flags the notice
    extraction_confidence: Level
    mock: bool = False


class Lot(Strict):
    lot_id: str
    title_nb: str
    title_en: str
    source: str                              # e.g. "notice description"


class Conflict(Strict):
    description_en: str
    description_nb: str
    documents: list[str] = []


class ExtractionOutput(Strict):
    notice_id: str
    notice_version_hash: str
    prompt_version: str
    model: str
    lots: list[Lot]
    requirements: list[Requirement]
    model_self_rating: Level
    conflicts: list[Conflict] = []
    mock: bool = False


class SubScore(Strict):
    value: Optional[int] = Field(default=None, ge=0, le=100)   # None = data point missing on either side
    reason_en: str
    reason_nb: str
    data_points: list[str] = []


class Contradiction(Strict):
    code: str
    description_en: str
    description_nb: str


class LotScreening(Strict):
    lot_id: str
    subject_relevance: SubScore
    lots: SubScore
    relevant: bool


class ScreeningOutput(Strict):
    firm_id: str
    notice_id: str
    notice_version_hash: str
    prompt_version: str
    model: str
    sub_scores: dict[str, SubScore]
    lot_scores: list[LotScreening] = []
    contradictions: list[Contradiction] = []
    data_quality_notes_en: list[str] = []
    data_quality_notes_nb: list[str] = []
    mock: bool = False


class ComparisonItem(Strict):
    req_id: str
    locker_field: str                        # Table A1 field id, or "none"
    match_status: MatchStatus
    match_confidence: Level
    reason_en: str
    reason_nb: str
    confidence_reason_en: str
    confidence_reason_nb: str


class ComparisonOutput(Strict):
    firm_id: str
    notice_id: str
    lot_id: Optional[str]
    prompt_version: str
    model: str
    items: list[ComparisonItem]
    mock: bool = False


def validate(model: type[BaseModel], obj: dict) -> tuple[bool, dict | None, list[str]]:
    """Return (ok, validated_dict, errors)."""
    try:
        v = model.model_validate(obj)
        return True, v.model_dump(), []
    except Exception as e:  # pydantic.ValidationError
        errs = [f"{'.'.join(str(x) for x in er['loc'])}: {er['msg']}" for er in getattr(e, "errors", lambda: [])()]
        return False, None, errs or [str(e)]
