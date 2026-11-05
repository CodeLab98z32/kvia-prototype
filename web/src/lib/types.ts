export type Level = "high" | "medium" | "low";
export type Indication = "go" | "borderline" | "no-go";
export type MatchStatus = "met" | "partly_met" | "not_met" | "lacks_data";
export type Readiness = "documented" | "self_declared_proof_needed" | "expired" | "no_proof_on_file" | "not_demanded";

export interface NoticeRecord {
  doffin_id: string;
  mock: boolean;
  source: string;
  version_hash: string;
  original: Record<string, string>;
  derived: {
    cpv_additional_list: string[];
    place_of_performance_nuts_list: string[];
    buyer_name_list: string[];
    buyer_nuts_list: string[];
    cpv_all: string[];
    tender_deadline: string | null;
    estimated_value_nok: number | null;
    estimated_value_status: string;
    legislation_normalised: string | null;
    framework: boolean;
    dps: boolean;
    lot_count_int: number | null;
    place_anywhere: boolean;
    cpv_division: string | null;
  };
}
export interface Store { columns: string[]; export_rows: number; records: NoticeRecord[]; export_file: string }
export interface Activeness { active: boolean; category: string; reason_code: string; reason_en: string; reason_nb: string }
export interface GateReason { code: string; label_en: string; label_nb: string; source: string; detail_en: string; detail_nb: string }
export interface GateRecord {
  notice_id: string; gate_status: "released" | "flagged"; final_status: "released_automatically" | "released_by_adviser" | "flagged_pending";
  reasons: GateReason[]; documents_status: string; adviser_decision?: AdviserDecision | null; corrections_applied?: number;
}
export interface AdviserDecision {
  notice_id: string; decision: string; decided_on?: string; adviser: string; flag_reviewed: string;
  comment_en: string; comment_nb: string; corrections: { op: string; req_id: string; reason_en?: string; reason_nb?: string }[];
  mock?: boolean;
}
export interface Source { document: string; page_start: number; page_end: number; cited_text: string }
export interface Highlight { page: number; rects: number[][]; page_width: number; page_height: number }
export interface Requirement {
  req_id: string; lot_id: string | null; category: string; text_summary_en: string; text_summary_nb: string;
  mandatory: boolean; proof_demanded: boolean; proof_type: string | null; source: Source | null;
  extraction_confidence: Level; highlight?: Highlight | null; highlighted?: boolean; adviser_corrected?: boolean; mock?: boolean;
}
export interface SubScore { value: number | null; reason_en: string; reason_nb: string; data_points: string[] }
export interface LotResult { lot_id: string; fit_score: number | null; route: string; relevant: boolean; subject_relevance: SubScore; lots: SubScore }
export interface ScreenResult {
  notice_id: string; fit_score: number | null; confidence: Level; rank: number;
  confidence_reasons: { code: string; en: string; nb: string }[]; route: "forwarded" | "below_threshold";
  lot_results: LotResult[]; weighted_contributions: Record<string, number | null>; weights_used: Record<string, number>;
  sub_scores: Record<string, SubScore>; contradictions: { code: string; description_en: string; description_nb: string }[];
  data_quality_notes_en: string[]; data_quality_notes_nb: string[]; mock: boolean;
}
export interface Screening { firm_id: string; threshold: number; weights: Record<string, number>; ranked: ScreenResult[] }
export interface LockerSnapshot {
  id: string; label_en: string; label_nb: string; value: string; proof_status_original: string; proof_status: string;
  last_updated: string; expiry_original: string; expiry_date: string | null; parts?: { part: string; proof_status: string; expiry_date: string | null }[];
}
export interface ReportRow extends Requirement {
  template_key: string; cited: boolean; locker_field: string; locker_snapshot: LockerSnapshot[];
  match_status: MatchStatus; match_confidence: Level; reason_en: string; reason_nb: string;
  confidence_reason_en: string; confidence_reason_nb: string; readiness: Readiness; expiring_soon: boolean;
  valid_until: string | null; rule: string | null;
}
export interface ReportLot {
  lot_id: string | null; relevant: boolean; fit_score: number | null; indication: Indication;
  indication_reasons: { code: string; req_id?: string; readiness?: string }[]; ignored_uncited: string[];
  rows: ReportRow[]; missing_documents: string[];
}
export interface Report {
  notice_id: string; firm_id: string; route: string; state: "forwarded" | "manually_added" | "precomputed_not_shown";
  manual_addition: ManualAddition | null; fit_score: number | null; confidence: Level; lots: ReportLot[]; deadline: string; mock: boolean;
}
export interface ManualAddition { firm_id: string; notice_id: string; via: string; added_on: string; note_en: string; note_nb: string; mock?: boolean }
export interface Reports { firm_id: string; reports: Record<string, Report> }
export interface ProfileField {
  id: string; label_en: string; label_nb: string; table_a1_category: string; table_a1_category_nb: string;
  table_a1_data_point: string; value: string; proof_status_original: string; proof_status: string;
  last_updated: string; expiry_original: string; expiry_date: string | null; expiry_kind?: string;
  parts?: { part: string; proof_status: string; expiry_date: string | null }[]; structured: Record<string, unknown>;
  documented_n?: number; documented_m?: number;
}
export interface Profile {
  profile_id: string; synthetic: boolean; source: string; data_model: string;
  firm: { name: string; initials: string; sector_en: string; sector_nb: string; name_note_en: string; name_note_nb: string };
  search_profile: ProfileField[]; capability_locker: ProfileField[]; account_and_baseline: ProfileField[];
}
export interface HealthFlag { field: string; part: string | null; kind: "expired" | "expiring" | "declared_missing"; label_en: string; label_nb: string; date: string | null; days_left?: number }
export interface FirmFlag {
  flag_id: string; firm_id: string; notice_id: string; req_key: string; raised_on: string; text_en: string; text_nb: string;
  status: string; adviser_answer_en: string | null; adviser_answer_nb: string | null; mock: boolean;
}
export interface RunInfo {
  run_id: string; mock: boolean; phase: number; created_utc: string; reference_datetime: string; snapshot_date: string;
  model: { specified_in_docs: string; used: string }; prompt_versions: Record<string, string>;
  weights: Record<string, number>; threshold: number; readiness: Record<string, number>; health_check: Record<string, number>;
  steps_run: string[]; input_checksums: Record<string, string>; profiles: string[]; firm_flags: FirmFlag[];
  manual_additions_recorded: ManualAddition[]; assumptions: string[]; notice: string; label?: string;
}
export interface Manifest { run_id: string; files: { path: string; sha256: string; bytes: number }[]; manifest_sha256: string }
export interface TestCase { id: string; type: string; scenario: string; expected: string; status: string; observed_en: string; observed_nb: string; evidence: Record<string, string | null>[] }
export interface Coverage {
  modes: { group: string; mode: string; examples: { notice_id?: string; firm_id?: string; req_id?: string; lot_id?: string; note?: string }[] }[];
  filter_examples: Record<string, string[]>; filters_without_result: string[]; released_notices: string[];
}
export interface IndexFile {
  run_id: string; profiles: { id: string; name: string; initials: string; sector_en: string; sector_nb: string }[];
  docs: Record<string, { source: "placeholder" | "original"; files: string[] }>;
}
