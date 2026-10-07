// ARTEX domain model — types used across the UI.
// Derived from the functional spec (section 7: 키데이터).

export type TaskStatus = "created" | "queued" | "running" | "paused" | "done" | "failed" | "timeout";
export type EngineMode = "exploring" | "paused" | "stalled" | "idle";

export interface Task {
 id: string;
 name?: string; // 선택작업이름;/기본값=이름 없음,표시까지설명
 category_id?: number;
 category_name?: string;
 pinned?: boolean;
 pinned_at?: string | null;
 description: string;
 goal: string;
 status: TaskStatus;
 created_at: string;
 created_unix?: number; // created_at as unix seconds (run-duration calc)
 completed_at?: string; // RFC3339 finish time (done/failed); "" if unfinished
 completed_unix?: number; // completed_at as unix seconds (0/undef if unfinished)
 last_activity_unix?: number; // unix seconds of the last activity (0/undef if none)
 paused?: boolean;
 queued?: boolean;
 active?: boolean;
 in_flight?: number;
 findings?: { critical: number; high: number; medium: number; low: number }; // 등록취약점수(치명도)
 last_activity?: string;
 stalled?: boolean;
 goals_total?: number;
 goals_met?: number;
 engine_mode?: EngineMode;
 tokens?: TokenTotal; // whole-task token consumption
 llm_profile_id?: number; // LLM profile used; absent = default profile
 llm_profile_ids?: number[]; // ordered task-level failover chain
 active_llm_profile_id?: number; // profile used by the next LLM call
 llm_failover_state?: "default" | "ready" | "chain_exhausted" | string;
 llm_failover_reason?: string;
 source_task_ids?: string[]; // directly related tasks inherited as read-only context
 archive_blocked_by_task_id?: string; // live direct dependent that must be archived first
 company_ids?: number[]; // associated company scopes; current company assets join the task at creation
 coverage_enabled?: boolean; // 자산 커버리지 기능토글(생성,기본)；false=안 /안 표시커버리지
}

export interface TaskCategory {
 id: number;
 name: string;
 task_count: number;
 created_at: string;
 updated_at: string;
}

export interface TaskTemplate {
 id: number;
 name: string;
 description: string;
 goal: string;
 category_id?: number | null; // 분류；null/기본값=없음
 intercept_rules?: AssetInterceptRuleInput[]; // 작업급차단/허용규칙
 created_at: string;
 updated_at: string;
}

export interface DeleteTaskOptions {
 delete_assets: boolean;
 delete_traffic: boolean;
 delete_files: boolean;
 delete_findings: boolean;
 delete_llm_records: boolean;
}

export interface DeleteTaskResult {
 deleted: string;
 assets_deleted: number;
 assets_detached: number;
 traffic_deleted: number;
 files_deleted: boolean;
 findings_deleted: number;
 llm_records_deleted: number;
 cleanup_warning?: string;
}

export type TaskArchiveState =
 | "archive_queued"
 | "archiving"
 | "archive_failed"
 | "ready"
 | "restore_queued"
 | "restoring"
 | "restore_failed"
 | "delete_queued"
 | "deleting"
 | "delete_failed";

export interface TaskArchiveTokenStats {
 calls?: number;
 input_tokens?: number;
 output_tokens?: number;
 cache_read_tokens?: number;
 cache_write_tokens?: number;
}

export interface TaskArchive {
 id: number;
 task_id: number;
 state: TaskArchiveState;
 phase: string;
 progress: number;
 error?: string;
 warnings?: string[];
 format_version: number;
 sha256?: string;
 original_size: number;
 compressed_size: number;
 task_name: string;
 task_description: string;
 task_goal: string;
 original_status: TaskStatus;
 category_id?: number;
 category_name?: string;
 source_task_ids: number[];
 remaining_timeout_seconds: number;
 data_counts: Record<string, number>;
 aggregate_stats: {
 tokens?: TaskArchiveTokenStats;
 skills?: Record<string, number>;
 tools?: Record<string, number>;
 findings?: Record<string, number>;
 };
 archived_at?: string;
 requested_at: string;
 created_at: string;
 updated_at: string;
}

export interface TaskArchivePage {
 items: TaskArchive[];
 total: number;
 page: number;
 size: number;
}

export interface ArchiveBatchItem {
 id: string;
 archive_id?: number;
 ok: boolean;
 queued: boolean;
 error?: string;
}

// ---- Asset graph (global, shared across tasks) ----
export type AssetType =
 | "company"
 | "domain"
 | "ip"
 | "port"
 | "service"
 | "site"
 | "endpoint"
 | "parameter"
 | "tech"
 | "credential"
 | "data";

export type NodeState = "observed" | "confirmed" | "tombstoned";

export interface AssetNode {
 id: string;
 type: AssetType;
 name: string;
 key: string; // nkey
 value?: string;
 company_id?: string; // 소유회사자산 id；=미소유
 state: NodeState;
 confidence: number; // 0..1
 attrs?: Record<string, unknown>;
 first_seen: string;
 last_seen: string;
}

export type AssetRel =
 | "owns"
 | "resolves"
 | "exposes"
 | "runs"
 | "serves"
 | "has_endpoint"
 | "has_param"
 | "fingerprinted"
 | "authenticates_as"
 | "reachable"
 | "has_subdomain";

export interface Edge {
 src: string;
 dst: string;
 rel: AssetRel | ExploreRel;
}

// Task asset view — server-side enriched, paginated.
export interface TaskAssetRef {
 id: string;
 name?: string;
 key: string;
 attrs?: Record<string, unknown>;
}

export interface TaskAssetItem extends AssetNode {
 techs?: TaskAssetRef[];
 auth?: TaskAssetRef[];
 params?: TaskAssetRef[];
}

export interface TaskAssetView {
 counts: Record<string, number>;
 total: number;
 items: TaskAssetItem[];
}

// ---- New unified asset model (new backend) ----
export type NewAssetType = "root_domain" | "ip" | "subdomain" | "app" | "service" | "endpoint";

export interface Asset {
 id: number;
 type: NewAssetType;
 company_id?: number;
 task_ids: number[];
 domain?: string;
 root_domain?: string;
 ip?: string;
 c_segment?: string;
 port?: number;
 icp?: string;
 bound_domains?: string[];
 open_ports?: { port: number; service?: string }[];
 record_type?: string;
 record_value?: string[] | string;
 bundle_id?: string;
 app_name?: string;
 category?: string;
 app_description?: string;
 app_icp?: string;
 url?: string;
 service_type?: string;
 service_name?: string;
 favicon_mmh3?: string;
 status_code?: number;
 content_length?: number;
 page_title?: string;
 technologies?: string[];
 auth?: Record<string, unknown>[];
 method?: string;
 params?: Record<string, unknown>[];
 extra?: Record<string, unknown>;
 last_seen: string;
 task_source?: string;
 task_source_summary?: string;
 task_source_node_id?: number;
}

export interface IntentAsset {
 intent_id: number | string;
 asset_id: number;
 type: NewAssetType;
 label: string;
 source: string;
 source_summary: string;
 source_node_id?: number;
 source_task_id: number;
 inherited: boolean;
}

export interface TaskAssetMutation {
 requested: number;
 attached: number;
 existing: number;
}

export interface TaskAssetScopeMutation {
 requested: number;
 assets_linked: number;
 assets_existing: number;
 scopes_added: number;
 scopes_existing: number;
}

// ---- Asset coverage graph (per task) ----
// 로「자산 커버리지」개노드。key 유일：자산="a:<id>"、회사="c:<id>"、
// 없음자산행루트 도메인="r:<domain>"。in_scope=false 는에컨텍스트노드。
export interface CoverageGraphNode {
 key: string;
 kind: "company" | "root_domain" | "subdomain" | "ip" | "service" | "app" | "endpoint";
 label: string;
 tested: boolean;
 in_scope: boolean;
 asset_id?: number;
 company_id?: number;
 domain?: string;
 root_domain?: string;
 ip?: string;
 url?: string;
 port?: number;
 service_type?: string;
 app_name?: string;
 page_title?: string;
 status_code?: number;
}

export interface CoverageGraphEdge {
 src: string;
 dst: string;
}

export interface CoverageGraphData {
 nodes: CoverageGraphNode[];
 edges: CoverageGraphEdge[];
}

// 자산에서이작업탐색연관까지의도/사실/발견（커버노드드로어）。
export interface CoverageAssetRef {
 id: number;
 kind: string;
 state: string;
 summary: string;
 source_task_id?: string;
 inherited?: boolean;
}
export interface CoverageAssetRefs {
 intents: CoverageAssetRef[];
 facts: CoverageAssetRef[];
 findings: CoverageAssetRef[];
}

// ---- Workspace file manager (workDir) ----
export interface WorkspaceEntry {
 name: string;
 path: string; // workspace-relative, forward slashes
 dir: boolean;
 size: number;
 mtime: number; // unix millis
}
export interface WorkspaceListing {
 path: string;
 entries: WorkspaceEntry[];
}
export interface WorkspaceFile {
 path: string;
 size: number;
 binary: boolean;
 too_large?: boolean;
 content?: string;
}

// 작업테스트 범위건（커버리지 + 권한경계）。
export interface TaskScopeRow {
 id: number;
 task_id: number;
 kind: "company" | "root_domain" | "subdomain" | "ip" | "cidr" | "icp" | "keyword";
 company_id?: number;
 company_name?: string; // 후 JOIN companies 파싱， kind=company 값
 domain?: string;
 net?: string;
 value?: string;
 source: "auto" | "agent" | "manual";
 reason?: string;
}

export type CompanyScopeKind = "domain" | "ip" | "cidr" | "icp" | "keyword";

// 추가기업제출구조자산 범위규칙。
export interface CompanyScopeRule {
 kind: CompanyScopeKind;
 value: string;
}

// 자산 범위。errors 는이차제출안 행；warnings 는·이차제출없음、
// 소유안 데이터（예: ip 필드주이름자산）。
export interface CompanyScopeMutation {
 added: number;
 skipped: number;
 invalid: number;
 errors?: string[];
 warnings?: string[];
}

// 회사자산 범위규칙건（소유유일값출처）。
export interface ScopeRow {
 id: number;
 company_id: number;
 kind: CompanyScopeKind;
 domain?: string; // kind=domain 값
 net?: string; // kind=ip|cidr 값
 value?: string; // kind=icp|keyword 가능에 의해후직접반환
 raw: string; // 입력，에표시
 reason?: string;
}

// 기업：type=company 자산 노드 + + 자산수 + 자산 범위규칙。
export interface Company {
 id: number;
 name: string;
 logo?: string; // 원격 URL；전이름글자
 asset_count: number;
 scope?: ScopeRow[];
}

// ---- Exploration graph (per task) ----
export type ExploreKind = "task" | "begin" | "goal" | "intent" | "fact" | "finding" | "hint" | "digest";
export type GoalState = "open" | "met" | "abandoned";
export type IntentState = "open" | "running" | "paused" | "done" | "blocked" | "exhausted" | "stopped";
export type FindingState = "confirmed" | "dismissed";
export type HintState = "active" | "consumed";
export type ExploreRel = "spawns" | "derived_from" | "yields" | "proves" | "covers";

export interface TaskNode {
 id: string;
 type: ExploreKind;
 payload?: string;
 priority: number; // 0..10
 state: string; // GoalState | IntentState | FindingState | HintState
 origin: string;
 ts: string;
 source_task_id?: string;
 inherited?: boolean;
 delete_reason?: string; // 의도삭제(state='deleted')삭제사유
}

// 브로드캐스트페이지:생성페이지노드 + 페이지· + 노드(refs, id ),
// 매건브로드캐스트「부터、산출무엇」,안 하。
export interface ExplorationNodePage {
 items: TaskNode[];
 total: number;
 page: number;
 size: number;
 edges: Edge[];
 refs: Record<string, TaskNode>;
 // 노드 id → 해당노드자산(브로드캐스트펼치기표시,이페이지노드·그)。
 assets: Record<string, FindingAsset[]>;
}

export interface ExplorationNodeQuery {
 page?: number;
 size?: number;
 kinds?: ExploreKind[];
 states?: string[];
 q?: string;
 order?: "asc" | "desc";
}

// 목표관리카드목표(후 payload text/vulnclass)。
export interface TaskGoal {
 id: string;
 text: string;
 vulnclass?: string;
 state: string; // GoalState
 origin?: string;
 ts: string;
}

// 제약관리카드작업 제약(allow=허용 / deny=금지)。
export type ConstraintKind = "allow" | "deny";
export interface TaskConstraint {
 id: string;
 kind: ConstraintKind;
 text: string;
 origin?: string;
 ts?: string;
}

// ---- Findings ----
export type Severity = "critical" | "high" | "medium" | "low";

// 취약점상태:대기 / 처리 중 / 확인됨 / / 수정됨 / 오탐 / 무시 / 중복 / 위험 수용。
export type FindingStatus =
 | "pending"
 | "in_progress"
 | "confirmed"
 | "resolved"
 | "fixed"
 | "false_positive"
 | "ignored"
 | "duplicate"
 | "risk_accepted";

// FindingAsset 는개취약점연결자산(에서후 label)。
export interface FindingAsset {
 id: string;
 type: string;
 label: string;
}

export interface Finding {
 traffic_count?: number;
 evidence_version?: number;
 report_evidence_version?: number;
 report_stale?: boolean;
 id: string;
 finding_id?: string; // 독립 findings 행 id,상태업데이트(작업내구노드가능)
 vulnclass: string;
 name?: string; // 취약점이름;를표시까지 vulnclass
 severity: Severity;
 status: FindingStatus;
 summary: string;
 evidence: string;
 report?: string; // 상세보고서(Markdown);상세API반환,목록를
 intent_id?: string;
 param_id?: string;
 task_id?: string;
 task_description?: string;
 source_task_id?: string;
 inherited?: boolean;
 assets?: FindingAsset[];
 ts: string;
}

// FindingsPage 는발견목록서비스페이지응답。
export interface FindingsPage {
 items: Finding[];
 total: number;
 page: number;
 page_size: number;
}

export interface FindingGroup {
 task_id: string | number | null;
 task_name?: string; // 선택작업이름;/기본값=이름 없음
 task_description: string;
 task_status: string;
 count: number;
 critical: number;
 high: number;
 medium: number;
 low: number;
 last_found_at: string;
}

export interface FindingGroupsPage {
 items: FindingGroup[];
 total: number;
 finding_total: number;
 page: number;
 page_size: number;
}

export interface FindingDeepenResponse {
 task_id: string;
 intent_id: string;
 state: IntentState;
 queued: boolean;
}

// FindingStats 는발견전체(통계 + 취약점유형하),서비스,안 페이지영향。
export interface FindingStats {
 total: number;
 pending: number;
 critical: number;
 high: number;
 medium: number;
 low: number;
 vulnclasses: string[];
 tasks: FindingTaskOption[];
}

// FindingTaskOption 는발견페이지「작업」필터하건:취약점작업(설명를표시작업이 삭제되었습니다,
// 전표시 id)·그취약점건수。
export interface FindingTaskOption {
 id: string | number;
 name?: string; // 선택작업이름;/기본값=이름 없음
 description: string;
 count: number;
}

// FindingQuery 는발견목록페이지/필터/매개변수。
export interface FindingQuery {
 page: number;
 pageSize: number;
 severity?: "all" | Severity;
 status?: "all" | FindingStatus;
 vulnclass?: string;
 task?: string; // 작업 id;"all"/ = 안 작업필터
 query?: string;
 sort?: "severity" | "time";
 // 자산노드 key;선택됨개노드 = 선택됨。 = 안 자산필터。
 assetScope?: string;
}

// ---- Findings by asset (자산뷰) ----
export type FindingAssetKind = "company" | "root_domain" | "subdomain" | "ip" | "service" | "app" | "endpoint" | "none";

// FindingAssetNode 는자산개노드。key 예: a:<id>(자산)、c:<id>(기업)、
// r:<domain>(없음자산행루트 도메인)、__none__(미연관 자산)。
export interface FindingAssetNode {
 key: string;
 parent?: string;
 kind: FindingAssetKind;
 label: string;
 asset_id?: number;
 company_id?: number;
 self: number; // 직접에서해당자산상발견수
 total: number; // 、발견
 critical: number;
 high: number;
 medium: number;
 low: number;
 last_found_at: string;
}

export interface FindingAssetTree {
 nodes: FindingAssetNode[];
 finding_total: number;
 truncated: boolean;
 dropped_kinds?: string[];
}

// FINDING_UNASSIGNED_ASSET 백엔드와 db.FindingUnassignedAsset 대상。
export const FINDING_UNASSIGNED_ASSET = "__none__";

// ---- Activity / sessions ----
export type ActivityKind =
 | "tool_use"
 | "tool_result"
 | "text"
 | "thinking"
 | "result"
 | "user"
 | "intent" // LLM-generated exploration objective leading a worker session (UI-synthesized)
 | "round" // planner round boundary marker (engine-emitted)
 | "usage" // live cumulative token usage (per model turn); not rendered
 | "llm_switch" // automatic/manual task-level LLM switch
 | "llm_failover" // task-level provider switch / chain exhaustion audit event
 | "intercept_request"; // user-approval request from the intercept layer

// ChatAttachment 는한 번업로드파일:path 대상해당세션/작업작업 디렉터리( agent CWD)。
export interface ChatAttachment {
 name: string;
 path: string;
 size: number;
 abs?: string; // 절대 경로(scope=staging 업로드반환;작업전설명)
}

export interface Activity {
 seq: number;
 intent_id?: string;
 worker: string; // session owner: planner | mainagent | work#1 ...
 ts: string;
 kind: ActivityKind;
 tool?: string;
 tool_use_id?: string;
 is_error?: boolean;
 summary: string;
 detail?: string;
 metadata?: {
 llm_transition?: LLMTransition;
 };
 source_task_id?: string;
 inherited?: boolean;
 main_seg?: number; // main-agent conversation segment (present only on worker="mainagent" rows)
 // token usage (present only on kind='result')
 input_tokens?: number;
 output_tokens?: number;
 cache_read_tokens?: number;
 cache_write_tokens?: number;
}

export interface LLMAuditProfile {
 id: number;
 name: string;
 format: string;
 model: string;
}

export interface LLMTransition {
 mode: "automatic" | "manual" | "exhausted";
 reason: string;
 previous?: LLMAuditProfile;
 next?: LLMAuditProfile;
}

export interface TaskLLMResolution {
 profile_id?: number;
 name: string;
 format: string;
 model: string;
 source: "task_chain" | "agent_binding" | "global_profile" | "environment" | "global";
 available: boolean;
 reason?: string;
}

export interface TaskLLMResolutions {
 mainagent: TaskLLMResolution;
 planner: TaskLLMResolution;
 worker: TaskLLMResolution;
}

// ---- Agent triggers (P3 도，사용자 지정 agent) ----
export interface AgentTrigger {
 id: number;
 agent_key: string;
 enabled: boolean;
 interval_sec: number; // 주기:매 N 초(0=안 주기)
 on_finding: boolean; // 임의작업finding 발견 트리거
 on_goal_met: boolean; // 임의작업달성목표트리거
 on_task_timeout: boolean; // 임의작업 타임아웃트리거
 on_tool_call: boolean; // 선택됨도구호출(실행완료)트리거
 on_task_create: boolean; // 임의작업생성트리거
 interval_message: string; // 트리거건독립사용자 메시지
 finding_message: string;
 goal_message: string;
 task_timeout_message: string;
 tool_call_message: string;
 task_create_message: string;
 tool_names: string[]; // on_tool_call 선택됨도구 key(소개)
 last_fire?: string;
}

// ---- Conversations (chat page) ----
export interface ActiveFindingRetest {
 id: number;
 finding_id: string;
 conversation_id: number;
 status: "pending" | "running";
}

export interface FindingRetest {
 id: number;
 finding_id: number;
 conversation_id: number | null;
 status: "pending" | "running" | "completed" | "failed" | "stopped";
 verdict: "" | "reproduced" | "fixed" | "inconclusive";
 notes: string;
 summary: string;
 evidence: string;
 error: string;
 created_at: string;
 started_at: string | null;
 finished_at: string | null;
}

export interface Conversation {
 id: number;
 running?: boolean; // live server state, returned with the conversation list
 agent_key: string;
 title: string;
 llm_profile_id?: number;
 pinned?: boolean;
 pinned_at?: string | null;
 created_at: string;
 updated_at: string;
}

// ---- Backend logs (/logs page) ----
export interface LogLine {
 seq: number;
 db_id?: number; // server_logs.id; present for DB-persisted lines
 ts: string;
 level: "info" | "warn" | "error";
 tag: string;
 text: string;
}

export type SessionRole = "mainagent" | "planner" | "worker" | "system";
export type SessionStatus = "running" | "paused" | "done" | "blocked" | "exhausted" | "pending" | "stopped" | "deleted";

// Daily token aggregate bucket (GET /api/tokens/daily).
export interface DailyTokenBucket {
 date: string; // "YYYY-MM-DD"
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
}

// Per-worker token usage (GET /api/exploration/tokens).
export interface TokenUsage {
 worker: string;
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
}

export interface SessionTokenUsage {
 session: string;
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
}

export interface BatchControlItem {
 id: string;
 ok: boolean;
 status?: string;
 queued?: boolean;
 error?: string;
}

// 량분류작업。실패가능는작업삭제，분류이는。
export interface BatchCategoryItem {
 id: string;
 ok: boolean;
 error?: string;
}

// Whole-task (all agents) token aggregate.
export interface TokenTotal {
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
}

// Global per-profile token spend from the llm_usage ledger (GET /api/tokens/usage).
export interface ProfileUsage {
 profile_name: string;
 calls: number;
 tasks: number;
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
}

// One (profile, UTC day) token bucket for the dashboard's daily chart (new source).
export interface ProfileDayUsage {
 profile_name: string;
 date: string; // YYYY-MM-DD
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
}

// Response of GET /api/tokens/usage — the dashboard's "new" (llm_usage) token view.
export interface UsageStats {
 by_profile: ProfileUsage[];
 daily: ProfileDayUsage[];
}

// Per-model token usage for one task (GET /api/llm/records/by-model), from the
// always-on llm_usage metering ledger. calls = number of LLM calls on this model.
export interface ModelTokenStat {
 model: string;
 calls: number;
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
}

export interface Session {
 id: string;
 role: SessionRole;
 title: string;
 status: SessionStatus;
 live: boolean;
 last_activity: string;
 intent_id?: string;
 source_task_id?: string;
 inherited?: boolean;
 seg?: number; // main-agent session: which conversation segment (0 = original)
}

// ---- Security ----
export interface AuditEntry {
 ts: string;
 tool: string;
 action: "allow" | "block";
 reason?: string;
 command?: string;
}

export interface Audit {
 entries?: AuditEntry[];
 attributions?: Record<string, number>;
}

// ---- Traffic ----
export interface TrafficExchange {
 id: string;
 ts: string;
 host: string;
 method: string;
 url: string;
 status: number;
 content_type: string;
 resp_len: number;
}

export interface TrafficResp {
 enabled: boolean;
 proxy?: string;
 count?: number; // global total (unfiltered)
 total?: number; // rows matching the current filter (for pagination)
 page?: number;
 size?: number;
 exchanges?: TrafficExchange[];
}

// Full raw request/response of one exchange (lazy-loaded on row select).
export interface TrafficDetail {
 req: string;
 resp: string;
}

// One distinct recorded host with its exchange count (target picker).
export interface TrafficHost {
 host: string;
 count: number;
}

// ---- App settings (runtime toggles) ----
export interface Settings {
 traffic_capture: boolean;
 agent_traffic_binding: boolean; // Agent 자동트래픽 연결증거，기본꺼짐；안 영향연결
 llm_record: boolean; // LLM 토글（기본）；꺼짐안 기록임의 LLM 호출
 // Web search. brave_key_set / tavily_key_set reflect whether a key is stored
 // (the values are never returned). On PUT, send the corresponding field to set/clear.
 web_search_enabled: boolean;
 web_search_backend: string; // "ddgs" | "brave-free" | "tavily" | "deepseek"
 brave_key_set: boolean;
 tavily_key_set: boolean;
 // write-only: only sent on PUT to store/clear the key.
 brave_search_api_key?: string;
 tavily_search_api_key?: string;
 // 독립프록시(http/https/socks5)，에검색엔드포인트；·기록트래픽 MITM 프록시없음。=직접 연결。
 web_search_proxy?: string;
 // 전역프록시(http/https/socks5， user:pass)，전체목표트래픽。켜짐트래픽 캡처를
 // MITM 상；꺼짐직접입력 agent bash/WebFetch。=직접 연결。
 global_proxy?: string;
 python_interpreter?: string; // 사용자 지정이도구 python 기경로(=행)
 workers?: number; // 동시 agent 수(기본3)；대상이후시작작업적용
 // 작업동시상:「실행 중」작업수상。꺼짐=제한 없음;켜짐후새 작업,자동시작。
 task_concurrency_enabled?: boolean; // 기본 false
 task_concurrency_limit?: number; // 켜짐후기본 5
 // LLM 폴링(장애 조치)。기본；켜짐후「미지정모델」 agent 에서현재구성안
 // （잔액안 /key 만료/속도 제한/서비스예외）시 자동 전환까지하개구성。
 llm_pool_enabled?: boolean; // 기본 false
 // 연결지정구성 agent/작업실패여부폴백까지폴링。기본 false = 연결。
 llm_pool_bind_fallback?: boolean;
 // 작업 제약인젝션범위(기본):작업 allow/deny 제약대상 agent 시스템안내。
 constraints_inject_planner?: boolean;
 constraints_inject_worker?: boolean;
 // 기능:noa 모델유도컨텍스트압축(기본)。켜짐후유형 agent(planner/
 // worker/주 agent/대화)에 의해 noa 컨텍스트 압축,내장 compaction;매 run 한 번,대상
 // 이후시작 run 적용。
 noa_compaction?: boolean;
 // ---- 취약점 IM 푸시（채널이는독립， /api/notify/*，여기건전역구성）----
 notify_enabled?: boolean; // 푸시전체 토글，기본；에키
 notify_public_base_url?: string; // 취약점상세외주소；=메시지안 
 notify_digest_interval_min?: number; // 요약모드（분），기본 30
}

// ---- 취약점 IM 푸시 ----

// NotificationFilter 는채널건，필드전체선택，기본값안 。
// 후대상전체필드안 검증：구성「매칭」（다안 ）。
export interface NotificationFilter {
 min_severity?: string; // "" | low | medium | high | critical
 task_ids?: number[]; // =제한 없음；비·취약점작업
 asset_ids?: number[]; // =제한 없음；비·취약점자산
 vulnclass_include?: string[]; // =전체；비취약점유형매칭키워드（대소안 ）
 vulnclass_exclude?: string[]; // 매칭키워드제외（제외우선에포함）
 on_status_change?: boolean; // 여부취약점상태
}

// NotificationChannel 는개채널。config 필드 kind ，
// 자격 증명필드에서읽기바꿈 "__masked__" 코드값——그대로표시「안 」。
export interface NotificationChannel {
 id: number;
 name: string;
 kind: string;
 enabled: boolean;
 mode: "realtime" | "digest";
 config: Record<string, unknown>;
 filter: NotificationFilter;
 rate_per_min: number;
 created_at: string;
 updated_at: string;
 // secret_keys 에 의해후채널유형에，전이비밀번호·「비우기안 」안내，
 // 안 코드임의채널。
 secret_keys: string[];
}

// NotificationKind 는 /api/notify/meta 반환채널유형데이터。
export interface NotificationKind {
 kind: string;
 default_rate_per_min: number;
 secret_keys: string[];
}

export interface NotificationMeta {
 kinds: NotificationKind[];
 enabled: boolean;
 public_base_url: string;
 digest_interval_min: string;
 defaults: { digest_interval_min: number };
 stats: {
 channels: number;
 channels_on: number;
 pending: number;
 failed: number;
 sent_today: number;
 backlog_age_ms: number;
 };
}

// NotificationDelivery 는건전달기록，에전달이력·실패。
export interface NotificationDelivery {
 id: number;
 finding_id: string;
 event_kind: string; // finding_created | finding_status_changed
 channel_id: number;
 channel_name: string;
 channel_kind: string;
 state: "pending" | "sending" | "sent" | "failed" | "skipped";
 attempts: number;
 last_error: string;
 batch_id?: number;
 created_at: string;
 sent_at?: string;
 next_attempt_at: string;
 title: string;
 severity: string;
}

// ---- LLM config ----
export interface LLMProfile {
 id: string;
 name: string;
 format: "openai" | "anthropic" | "openai-responses";
 base_url?: string;
 proxy?: string;
 model: string;
 api_key_hint?: string;
 rate_per_second: number;
 rate_per_minute: number;
 context_window_k?: number;
 // 추론토글(thinking.type): ""=전송 안 함(기본) | "disabled"=꺼짐 | "enabled"=켜짐
 thinking_type?: string;
 // 추론도: ""=전송 안 함(기본) | "low"/"medium"/"high"/"xhigh"/"max"
 reasoning_effort?: string;
 is_default: boolean;
 // 폴링순위：대선택됨。활성구성를，·이값없음。
 priority?: number;
 // true = 안 를장애 조치목표（ agent/작업연결）。
 pool_exclude?: boolean;
 // true（기본）= 스트리밍(SSE) | false = ·비스트리밍(stream:false，한 번반환)。
 streaming?: boolean;
 // 단차응답출력상(token)。0 = 전송 안 함해당필드，에 의해서비스기본값。
 // · context_window_k ：후는모델량，에서이에압축값。
 max_tokens?: number;
 // 상개요청필드이름， format="openai" 의미：
 // ""=max_tokens(기본) | "max_completion_tokens"(OpenAI 추론모델만 인식)
 max_tokens_field?: string;
 // 사용자 지정세션이름：비매차요청해당 HTTP ，값=현재세션/의도 session id。
 // ""=전송 안 함。에 session-id 안내/에 의해。
 session_header_key?: string;
 // 이구성대상재시도커버（/응답/ provider 전체창）。비우기/전체 0 = 따름전역정책。
 retry?: LLMRetryOverride;
}

// ---- LLM 재시도정책 ----
// 재시도개。는「0 = 미구성」：
// attempts 0=기본횟수 | -1=꺼짐해당재시도 | >0=재시도횟수
// interval_ms 0=기본수백오프 | >0=개고정초간격
export interface LLMRetryRule {
 attempts: number;
 interval_ms: number;
}

// 단개 LLM 구성커버（는「엔드포인트」재시도）。
export interface LLMRetryOverride {
 connect: LLMRetryRule; // 재시도：연결리셋/타임아웃/429/5xx，시작전
 empty: LLMRetryRule; // 응답재시도：완료없음임의내（ openai 형식）
 stream: LLMRetryRule; // provider 전체창재시도：미출력전
}

// 전역정책 = 상기본값 + 전역：
// breaker 폴링차단（attempts=연속차실패차단，interval_ms=고정쿨다운）
// intent 의도재실행（worker model_error 후건의도재실행）
export interface LLMRetryPolicy extends LLMRetryOverride {
 breaker: LLMRetryRule;
 intent: LLMRetryRule;
}

// ---- LLM 폴링（장애 조치）----
// 개구성에서폴링중·상태。state:
// ok 정상
// degraded 연속실패미차단값
// tripped 차단됨，쿨다운내（cooldown_secs 를남은초수）
export interface LLMPoolMember {
 profile_id: string;
 name: string;
 model: string;
 format: string;
 priority: number;
 active: boolean; // 여부를현재활성구성（를）
 excluded: boolean; // pool_exclude：폴링 제외
 state: "ok" | "degraded" | "tripped";
 fails: number;
 trips: number;
 cooldown_secs: number;
 last_error?: string;
 last_at?: string;
}

export interface LLMPoolStatus {
 enabled: boolean;
 bind_fallback: boolean;
 chain: LLMPoolMember[];
}

// ---- Agents ----
export interface Agent {
 id: string;
 key: string; // 내장를 goals/planner/mainagent/worker；사용자 지정를 key
 name: string;
 description?: string;
 role: string;
 builtin: boolean;
 enabled: boolean;
 llm_profile_id?: number | null; // 연결 LLM 구성；null/absent = 따름작업/세션/전역
 max_turns?: number; // 0 = 없음제한
 run_seconds?: number; // worker 단차행상(초)；0 = 없음제한
 web_search?: boolean; // 여부활성화웹 검색(시스템전역토글)
 interactive_셸?: boolean; // 여부활성화상호작용 셸( PTY 세션도구)
 // P3 트리거후정책(사용자 지정 agent 의미)
 trigger_run_mode?: "serial" | "parallel"; // 행 / 매차트리거각각동시개세션
 trigger_merge_mode?: "by_task" | "all" | "none"; // serial：작업 / 전체 / 병합 안 함
 trigger_max_parallel?: number; // parallel：매 agent 동시상；0=제한 없음
 // 연결수량(목록API반환)：표시 MCP / 표시 Skill / 연결도구
 mcp_count?: number;
 skill_count?: number;
 tool_count?: number;
}

export interface PromptVar {
 name: string;
 description: string;
 example: string;
 source: "exploration" | "runtime" | "distilled";
}

export interface PromptVersion {
 version: number;
 ts: string;
 note: string;
 template_text: string;
}

export interface AgentDetail {
 agent: Agent;
 prompt: string;
 variables: PromptVar[];
 versions: PromptVersion[];
 visibility: { mcp: number[]; skill: string[] };
 // 연결 LLM 구성(「기본모델」하)；현재연결 agent.llm_profile_id
 llm_profiles?: { id: number; name: string; model: string; is_default: boolean }[];
 wrapup_prompt?: string; // 저장마무리 프롬프트(=내장 사용기본)
 wrapup_default?: string; // 내장기본마무리 프롬프트(/기본값 복원)
 wrapup_max_turns?: number; // 저장수(0=내장 사용기본)
 wrapup_max_turns_default?: number; // 내장기본수( "0=기본N" 안내)
 // 작업급타임아웃( worker/planner，task_timeout_wrapup_supported=true 표시해당)
 task_timeout_wrapup_supported?: boolean;
 task_timeout_wrapup_prompt?: string;
 task_timeout_wrapup_default?: string;
 task_timeout_wrapup_max_turns?: number;
 task_timeout_wrapup_max_turns_default?: number;
}

// ---- MCP ----
export interface MCPServer {
 id: number;
 name: string;
 transport: "stdio" | "http" | "sse";
 command?: string;
 args: string[];
 env: Record<string, string>;
 url?: string;
 enabled: boolean;
 insecure?: boolean; // http: skip TLS cert verification (self-signed servers)
 tools?: string[]; // mcp_tools_cache (names only, for the count)
}

export interface MCPTool {
 name: string;
 description: string;
}

// ---- Skills ----
// Fields align with the agentskills.io open specification.
// description covers both "what the skill does" and "when to use it".
export interface SkillItem {
 name: string; // unique key = directory name
 description?: string; // required per spec; covers what + when to use
 license?: string; // optional: SPDX identifier or free text
 compatibility?: string; // optional: environment requirements
 mcps?: string[]; // MCP server names this skill unlocks on load
 files: string[]; // files in the skill directory
 // 호출 통계（skill_usage 이）。부터미호출 skill：calls=0、last_used 기본값。
 calls: number;
 tasks: number; // 불러오기작업수（chat 세션안 ）
 usage_agents: string[]; // 불러오기 agent key
 last_used?: string;
}

// SkillCall 는한 번 Skill() 호출（단개 skill 최근호출목록）。
export interface SkillCall {
 ts: string;
 agent_key: string;
 task_id: number; // 0 = 비작업（대화세션）
 session_id: string;
 args_len: number;
}

// MissingSkill 는이름존재하지 않음 skill —— "없음"。
export interface MissingSkill {
 skill: string;
 calls: number;
 agents: string[];
 last_used?: string;
}

// ---- Tools (내장도구디렉터리) ----
// key + handler live in Go; only these fields are page-editable. system tools lock
// the key and the parameter *structure* (name/type/required) — the per-param
// description/default and the agent binding are what move.
export interface Tool {
 key: string;
 system: boolean;
 description: string;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 schema: Record<string, any>; // full JSON-Schema (object with properties)
 agents: string[]; // bound agent keys
 enabled: boolean;
 kind?: "builtin" | "셸" | "command" | "script" | "http"; // 사용자 지정도구유형
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 exec?: Record<string, any>; // 사용자 지정도구실행(kind!=builtin)
 deferred?: boolean; // schema (SearchExtraTools/ExecuteExtraTool)
 calls?: number; // persistent runtime invocation count (older APIs may omit it)
}

// ---- Stats ----
export interface Stats {
 assets: number;
 engine_mode: EngineMode;
 llm_configured: boolean;
 roe_enabled: boolean;
 findings_confirmed: number;
 active_task?: Partial<Task>;
}

// ---- Intercept Rules ----
export type InterceptAction = "allow" | "deny" | "ask";
export type InterceptMatchTarget = "tool_name" | "tool_input";
export type InterceptMatchType = "string" | "regex";

export interface InterceptRule {
 id: number;
 name: string;
 enabled: boolean;
 priority: number;
 match_target: InterceptMatchTarget;
 match_type: InterceptMatchType;
 pattern: string;
 action: InterceptAction;
 message: string;
 timeout_enabled: boolean;
 timeout_seconds: number;
 timeout_action: "deny" | "allow";
 created_at: string;
 updated_at: string;
}

// ---- Asset Intercept Rules（자산차단：전역이름단） ----
export type AssetInterceptKind =
 | "exact_domain"
 | "exact_ip"
 | "exact_url"
 | "fuzzy_domain"
 | "fuzzy_ip"
 | "fuzzy_url"
 | "cidr";

// action 에작업급규칙：block=차단(금지테스트) allow=허용(이름단)。
export type AssetInterceptAction = "block" | "allow";

// 작업급 자산차단/허용규칙건（생성작업、작업상세편집）。
export interface AssetInterceptRuleInput {
 action: AssetInterceptAction;
 kind: AssetInterceptKind;
 pattern: string;
 note: string;
 enabled: boolean;
}

export interface AssetInterceptRule {
 id: number;
 enabled: boolean;
 action?: AssetInterceptAction; // 전역규칙안 이필드（를차단）；작업급규칙 block/allow
 kind: AssetInterceptKind;
 pattern: string;
 note: string;
 builtin: boolean;
 created_at: string;
 updated_at: string;
}

export interface InterceptPending {
 decision_source?: "rule" | "model" | "unknown" | "";
 id: number;
 rule_id?: number;
 conversation_id?: number;
 task_id?: string;
 agent_name: string;
 tool_name: string;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 tool_input: Record<string, any>;
 status: "pending" | "allowed" | "denied" | "timeout";
 reason: string; // 규칙 message 또는모델 판정에 의해(모델 판정 [모델] 전)
 decided_at?: string;
 created_at: string;
}

// JudgeConfig: 모델폴백승인(없음임의차단규칙매칭에 의해모델)전역구성。
export interface JudgeConfig {
 enabled: boolean;
 profile_id: number; // 0 = 따름활성/기본구성
 prompt: string; // 안내;GET 미설정후내장템플릿전체
 timeout_seconds: number; // 모델호출타임아웃
 fail_action: "allow" | "ask" | "deny"; // 모델오류/타임아웃/안 파싱
 ask_timeout_seconds: number; // 모델 ask 후승인 외타임아웃
 ask_timeout_action: "allow" | "deny"; // 승인타임아웃후기본
}

// JudgeUsage: 모델폴백승인(judge ) token 량 + N 매열。
export interface JudgeDayUsage {
 date: string; // YYYY-MM-DD (UTC)
 calls: number;
 input_tokens: number;
 output_tokens: number;
}
export interface JudgeUsage {
 calls: number;
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
 daily: JudgeDayUsage[];
}

export interface InterceptApprovalFilter {
 status?: InterceptPending["status"];
 decision_source?: "rule" | "model" | "unknown";
}

// InterceptApprovalRow enriches InterceptPending with conversation/task and rule context.
export interface InterceptApprovalRow extends InterceptPending {
 conv_title: string; // "" if no linked conversation
 conv_agent_key: string; // "" if no linked conversation
 rule_name: string; // "" if rule was deleted
}

// ── 자산동기화 (ScopeSentry 데이터 소스) ──────────────────────────────────────────────
export interface SSProject {
 id: string; // MongoDB ObjectID — used as filter.project
 name: string;
 logo?: string;
 AssetCount?: number;
 tag?: string;
}

export interface SSTask {
 id: string;
 name: string; // used as filter.task
 status?: number;
 progress?: number;
 creatTime?: string;
 endTime?: string;
}

// ConvTokenSummary — one conversation's token total (+ profile/date) for merging
// chat usage into the dashboard token stats. GET /api/tokens/conversations.
export interface ConvTokenSummary {
 llm_profile_id: number | null;
 created_at: string;
 input_tokens: number;
 output_tokens: number;
 cache_read_tokens: number;
 cache_write_tokens: number;
}

// ---- Command recording (Bash execution history) ----
export interface CommandRecord {
 id: number;
 exploration_id: number;
 worker: string;
 tool: string;
 command: string; // raw tool input (JSON)
 output: string;
 is_error: boolean;
 created_at: string;
}

// 단개도구호출 통계（/commands/stats）；errors 를그중실패횟수。
export interface ToolStat {
 tool: string;
 total: number;
 errors: number;
}

// ---- LLM recording ----
export interface LLMRecordItem {
 id: number;
 ts: string;
 model: string;
 profile_name: string;
 session_id: string;
 task_id: string;
 worker: string;
 latency_ms: number;
 input_tokens: number;
 output_tokens: number;
 cache_read: number;
 cache_write: number;
 status: string;
 error?: string;
}

export interface LLMRecordDetail extends LLMRecordItem {
 request_body: string;
 response_body: string;
 // provider 실제 HTTP 원문：요청를 buildBody() 전체 body（도구
 // schema），응답를 SSE 。상 request_body/response_body 는뷰，
 // 도구 schema · tool_use 。구기록를。
 raw_request?: string;
 raw_response?: string;
}

// One distinct task with its LLM-record count (task picker on the records page).
export interface LLMTask {
 task_id: string;
 count: number;
}

// The exact JSON sent to the review model, retained for all model verdicts.
export interface InterceptReviewInput {
 version: number;
 background?: {
 // worker_summary is retained only for immutable v2/v3 snapshots.
 source: "user_message" | "worker_summary";
 text: string;
 truncated?: boolean;
 };
 // Version 1 snapshots are immutable and remain readable in historical audits.
 task?: {
 task_id: number;
 description: string;
 goal: string;
 constraints: { id: number; kind: string; text: string; origin: string; created_at: number }[];
 truncated?: boolean;
 };
 working_directory?: string;
 worker_intent?: string;
 turn_input?: string;
 background_truncated?: boolean;
 // Legacy v1/v2 snapshots only; v3 never sends execution history.
 history?: {
 tool_use_id: string;
 tool: string;
 arguments_preview: string;
 result: string;
 status: "succeeded" | "failed";
 truncated?: boolean;
 }[];
 history_truncated?: boolean;
 correlation?: "exact" | "ambiguous" | "unavailable";
 tool_name: string;
 arguments: Record<string, unknown>;
}

// Immutable review snapshot plus separately recorded execution outcome.
export interface InterceptAudit {
 model_input?: InterceptReviewInput;
 model_input_digest?: string;
 run_id?: string;
 tool_use_id?: string;
 correlation: "exact" | "ambiguous" | "unavailable";
 input_digest: string;
 user_message: string;
 user_truncated?: boolean;
 context:
 | { kind: string; tool?: string; tool_use_id?: string; text: string; is_error?: boolean; truncated?: boolean }[]
 | null;
 context_truncated?: boolean;
 captured_at: string;
 model_fallback?: boolean;
 initial_action: "allow" | "ask" | "deny";
 initial_reason: string;
 effective_action?: "allow" | "deny";
 decision_reason?: string;
 rule_name?: string;
 config_digest?: string;
 profile_id?: number;
 execution_status: "not_started" | "not_executed" | "awaiting_result" | "succeeded" | "failed" | "unknown";
 output?: string;
 output_truncated?: boolean;
 execution_ended_at?: string;
}
export interface InterceptDetail extends InterceptApprovalRow {
 audit: InterceptAudit | null;
}

export type TrafficEvidenceRole = "baseline" | "proof" | "verification" | "supporting";
export interface TrafficEvidenceRef {
 traffic_id: string;
 role?: TrafficEvidenceRole;
 note?: string;
}
export interface TrafficEvidenceSnapshot {
 id: string;
 source_traffic_id: string;
 captured_at: number;
 url: string;
 method: string;
 status: number;
 content_type: string;
 req_head?: string;
 resp_head?: string;
 req_hash: string;
 resp_hash: string;
 req_len: number;
 resp_len: number;
}
export interface FindingTrafficBinding {
 id: string;
 finding_id: string;
 snapshot_id: string;
 role: TrafficEvidenceRole;
 note: string;
 position: number;
 created_at: string;
 snapshot: TrafficEvidenceSnapshot;
}
export interface FindingTraffic {
 finding_id: string;
 version: number;
 report_version: number;
 bindings: FindingTrafficBinding[];
}
export interface EvidenceBodyPreview {
 content: string;
 offset: number;
 total: number;
 next_offset: number;
 truncated: boolean;
 binary: boolean;
}
export interface FindingTrafficDetail {
 binding: FindingTrafficBinding;
 request: EvidenceBodyPreview;
 response: EvidenceBodyPreview;
}

/** GET /api/update/check —— 현재이· GitHub 신。 */
export interface UpdateCheck {
 /** 현재행이；를 "dev" 또는 git describe 후。 */
 current: string;
 /** 행。docker 하에기，기이。 */
 mode: "docker" | "binary";
 os: string;
 arch: string;
 repo: string;
 /** 여부존재상이（artex.old）。 */
 has_backup: boolean;
 /** 이차시작업데이트（실패 / 외），없음발생를。 */
 boot_notice?: string;
 rolled_back?: boolean;
 /** 쿼리 GitHub 실패에사유，이하필드않음。 */
 error?: string;
 latest?: string;
 notes?: string;
 html_url?: string;
 published_at?: string;
 /** 현재대상이름，및해당 Release 여부。 */
 asset?: string;
 asset_available?: boolean;
 size?: number;
 has_update?: boolean;
 /** 쌍이여부；를 false，이키업데이트。 */
 comparable?: boolean;
 /** comparable 를 false 설명。 */
 reason?: string;
}

/** /api/update/stream 푸시건업데이트도。 */
export interface UpdateProgress {
 phase: "idle" | "downloading" | "verifying" | "extracting" | "staged" | "failed";
 /** 다운로드의미（0-100）；그를 -1。 */
 percent: number;
 message: string;
 version?: string;
 error?: string;
}

// Original execution selected from an approval, never submitted to the reviewer.
export interface InterceptExecution {
 conversation_id: number | null;
 task_id: string | null;
 session: string;
 seq: number;
 items: Activity[];
}
