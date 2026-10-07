"use client";

import * as React from "react";
import { toast } from "sonner";
import {
 BotIcon,
 ListFilterIcon,
 PencilIcon,
 PlusIcon,
 ShieldAlertIcon,
 Trash2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetFooter,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type {
 InterceptAction,
 InterceptRule,
 JudgeConfig,
 JudgeDayUsage,
 JudgeUsage,
 LLMProfile,
 Tool,
} from "@/lib/types";

// fmtTokens token 수(1.2k / 3.4M),에승인량통계。
function fmtTokens(n: number): string {
 if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
 if (n >= 1000) return (n / 1000).toFixed(1) + "k";
 return String(n);
}

// JudgeStat 는통계수글자(태그 + 수값)。
function JudgeStat({ label, value }: { label: string; value: string }) {
 return (
 <div className="rounded-lg border bg-muted/20 px-3 py-2">
 <div className="text-[10px] text-muted-foreground">{label}</div>
 <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
 </div>
 );
}

// JudgeSparkbars div N 매소비(입력+출력),의존성。
function JudgeSparkbars({ daily }: { daily: JudgeDayUsage[] }) {
 const max = Math.max(1, ...daily.map((d) => d.input_tokens + d.output_tokens));
 return (
 <div className="flex h-16 items-end gap-0.5">
 {daily.map((d) => {
 const total = d.input_tokens + d.output_tokens;
 const h = Math.max(2, Math.round((total / max) * 100));
 return (
 <div
 key={d.date}
 title={`${d.date} · ${d.calls} 차 · ${fmtTokens(total)} tokens`}
 className="min-w-[2px] flex-1 rounded-sm bg-violet-500/60 hover:bg-violet-500"
 style={{ height: `${h}%` }}
 />
 );
 })}
 </div>
 );
}

// ---- tool scope ----

// SDK tools are intentionally not seeded into the DB (they apply to every agent
// and have no per-agent binding). We hardcode them here so they still appear in
// the scope dialog.
function sdkTool(key: string, description: string): Tool {
 return { key, system: true, description, schema: {}, agents: [], enabled: true, kind: "builtin" };
}

const SDK_EXEC: Tool[] = [
 sdkTool("Bash", "에서 셸 중실행명령"),
 sdkTool("WebFetch", " HTTP/HTTPS 요청（프록시지원）"),
 sdkTool("web_search", "웹 검색"),
 sdkTool("셸_open", "켜짐 PTY 상호작용세션"),
 sdkTool("셸_send", "로상호작용세션전송입력"),
 sdkTool("셸_read", "읽기상호작용세션출력"),
 sdkTool("셸_close", "꺼짐상호작용세션"),
 sdkTool("셸_list", "열전체상호작용세션"),
];

const SDK_WRITE: Tool[] = [
 sdkTool("Write", "파일"),
 sdkTool("Edit", "편집파일（정밀）"),
 sdkTool("MultiEdit", "량편집파일"),
];

const SDK_KEYS = new Set([...SDK_EXEC, ...SDK_WRITE].map((t) => t.key));

function groupTools(dbTools: Tool[]) {
 const sys: Tool[] = [], custom: Tool[] = [];
 for (const t of dbTools) {
 if (SDK_KEYS.has(t.key)) continue; // already covered by hardcoded groups
 if (t.system) sys.push(t);
 else custom.push(t);
 }
 return [
 { label: "실행유형", tools: SDK_EXEC },
 { label: "/편집유형", tools: SDK_WRITE },
 { label: "시스템도구", tools: sys },
 { label: "사용자 지정도구", tools: custom },
 ].filter((g) => g.tools.length > 0);
}

// ---- form state ----

type RuleForm = {
 name: string;
 enabled: boolean;
 priority: number;
 match_target: "tool_name" | "tool_input";
 match_type: "string" | "regex";
 pattern: string;
 action: InterceptAction;
 message: string;
 timeout_enabled: boolean;
 timeout_seconds: number;
 timeout_action: "deny" | "allow";
};

const defaultForm = (): RuleForm => ({
 name: "",
 enabled: true,
 priority: 0,
 match_target: "tool_name",
 match_type: "string",
 pattern: "",
 action: "deny",
 message: "",
 timeout_enabled: true,
 timeout_seconds: 60,
 timeout_action: "deny",
});

// ---- small components ----

function ActionBadge({ action }: { action: InterceptAction }) {
 if (action === "allow") return <Badge variant="secondary">허용</Badge>;
 if (action === "deny") return <Badge variant="destructive">금지</Badge>;
 return <Badge variant="outline" className="border-amber-400 text-amber-600"></Badge>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
 return (
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
 {label}
 </Label>
 {children}
 </div>
 );
}

// ---- LLM fallback judge card ----

const FOLLOW_ACTIVE = "0"; // profile_id 0 = 따름활성/기본구성

const defaultJudge = (): JudgeConfig => ({
 enabled: false,
 profile_id: 0,
 prompt: "",
 timeout_seconds: 15,
 fail_action: "allow",
 ask_timeout_seconds: 300,
 ask_timeout_action: "deny",
});

function JudgeCard() {
 const [cfg, setCfg] = React.useState<JudgeConfig>(defaultJudge());
 const [profiles, setProfiles] = React.useState<LLMProfile[]>([]);
 const [loading, setLoading] = React.useState(true);
 const [saving, setSaving] = React.useState(false);
 const [usage, setUsage] = React.useState<JudgeUsage | null>(null);

 // 승인량통계:실패안 구성페이지,에서켜짐。
 const loadUsage = React.useCallback(async () => {
 try {
 setUsage(await api.interceptJudgeUsage(30));
 } catch {
 // 무시:통계안 안 영향구성편집
 }
 }, []);

 const load = React.useCallback(async () => {
 setLoading(true);
 try {
 const [j, ps] = await Promise.all([api.interceptGetJudgeConfig(), api.llmProfiles()]);
 setCfg(j);
 setProfiles(ps);
 } catch (e) {
 toast.error("불러오기모델폴백구성실패: " + (e as Error).message);
 } finally {
 setLoading(false);
 }
 }, []);

 React.useEffect(() => {
 load();
 }, [load]);

 // 켜짐후(차불러오기토글를 true )승인량통계。
 React.useEffect(() => {
 if (cfg.enabled) loadUsage();
 }, [cfg.enabled, loadUsage]);

 function patch(p: Partial<JudgeConfig>) {
 setCfg((c) => ({ ...c, ...p }));
 }

 async function save() {
 setSaving(true);
 try {
 await api.interceptSetJudgeConfig(cfg);
 toast.success("모델폴백구성저장");
 await load(); // :안내비우기내장템플릿
 } catch (e) {
 toast.error("저장실패: " + (e as Error).message);
 } finally {
 setSaving(false);
 }
 }

 async function restorePrompt() {
 // 비우기안내저장 → 서비스하차반환내장템플릿전체,까지입력。
 setSaving(true);
 try {
 await api.interceptSetJudgeConfig({ ...cfg, prompt: "" });
 const j = await api.interceptGetJudgeConfig();
 setCfg(j);
 toast.success("복원내장기본템플릿");
 } catch (e) {
 toast.error("복원실패: " + (e as Error).message);
 } finally {
 setSaving(false);
 }
 }

 return (
 <div className="space-y-4">
 {/* 활성화토글 —— 독립높건 */}
 <div
 className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
 cfg.enabled ? "border-violet-400/50 bg-violet-50/40 dark:bg-violet-950/20" : "bg-muted/40"
 }`}
 >
 <div className="flex items-center gap-2.5">
 <BotIcon className={`h-5 w-5 shrink-0 ${cfg.enabled ? "text-violet-600" : "text-muted-foreground"}`} />
 <div>
 <p className="text-sm font-semibold leading-tight">모델폴백승인</p>
 <p className="text-xs text-muted-foreground mt-0.5">
 에서<span className="font-medium text-foreground">차단범위</span>내、<span className="font-medium text-foreground">없음임의차단규칙매칭</span>명령，에 의해모델（행 / / 차단）
 </p>
 </div>
 </div>
 <div className="flex shrink-0 items-center gap-2">
 <span className="text-xs text-muted-foreground">{cfg.enabled ? "활성화" : "미활성화"}</span>
 <Switch checked={cfg.enabled} disabled={loading} onCheckedChange={(v) => patch({ enabled: v })} />
 </div>
 </div>

 {/* 승인 Token 사용량통계(전역,독립에모델구성) */}
 {cfg.enabled && usage && (
 <Card>
 <CardContent className="p-4">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <p className="text-sm font-medium">승인 Token 소비</p>
 <p className="text-xs text-muted-foreground">
 모델폴백승인량,단량(worker=judge),안 ·모델구성통계에서
 </p>
 </div>
 <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={loadUsage}>
 새로고침
 </Button>
 </div>
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
 <JudgeStat label="승인호출" value={usage.calls.toLocaleString()} />
 <JudgeStat label="입력 Token" value={fmtTokens(usage.input_tokens)} />
 <JudgeStat label="출력 Token" value={fmtTokens(usage.output_tokens)} />
 <JudgeStat label="캐시 읽기" value={fmtTokens(usage.cache_read_tokens)} />
 <JudgeStat label="" value={fmtTokens(usage.cache_write_tokens)} />
 </div>
 {usage.daily.length > 0 && (
 <div className="mt-4">
 <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
 30 매소비(입력 + 출력)
 </p>
 <JudgeSparkbars daily={usage.daily} />
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {cfg.enabled && (
 <div className="grid gap-4 lg:grid-cols-5">
 {/* 좌:안내편집기(직접펼치기,주) */}
 <Card className="lg:col-span-3">
 <CardContent className="flex h-full flex-col gap-2 p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium">승인안내</p>
 <p className="text-xs text-muted-foreground">모델이 ALLOW / ASK / DENY，직접편집</p>
 </div>
 <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={restorePrompt} disabled={saving}>
 기본값 복원템플릿
 </Button>
 </div>
 <Textarea
 className="min-h-[22rem] flex-1 resize-none font-mono text-xs leading-relaxed"
 value={cfg.prompt}
 onChange={(e) => patch({ prompt: e.target.value })}
 placeholder="비우기내장 사용템플릿"
 spellCheck={false}
 />
 <p className="text-right text-[11px] text-muted-foreground">{cfg.prompt.length} 글자</p>
 </CardContent>
 </Card>

 {/* 우:매개변수(설정) */}
 <Card className="lg:col-span-2">
 <CardContent className="space-y-5 p-4">
 <div className="space-y-4">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">모델·정책</p>
 <Field label="승인모델">
 <Select value={String(cfg.profile_id || 0)} onValueChange={(v) => patch({ profile_id: Number(v) })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value={FOLLOW_ACTIVE}>따름활성구성</SelectItem>
 {profiles.map((p) => (
 <SelectItem key={p.id} value={p.id}>
 {p.name}（{p.model}）
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </Field>
 <Field label="모델 판정타임아웃（초）">
 <Input
 type="number"
 min={1}
 value={cfg.timeout_seconds}
 onChange={(e) => {
 const n = parseInt(e.target.value, 10);
 if (n > 0) patch({ timeout_seconds: n });
 }}
 />
 </Field>
 <Field label="모델실패（오류 / 타임아웃 / 불가파싱）">
 <Select value={cfg.fail_action} onValueChange={(v) => patch({ fail_action: v as JudgeConfig["fail_action"] })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="allow">행</SelectItem>
 <SelectItem value="ask">수동 승인으로 전환</SelectItem>
 <SelectItem value="deny">차단</SelectItem>
 </SelectContent>
 </Select>
 </Field>
 </div>

 <Separator />

 <div className="space-y-4">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">승인（모델를「」）</p>
 <Field label="승인 외타임아웃（초）">
 <Input
 type="number"
 min={5}
 value={cfg.ask_timeout_seconds}
 onChange={(e) => {
 const n = parseInt(e.target.value, 10);
 if (n > 0) patch({ ask_timeout_seconds: n });
 }}
 />
 </Field>
 <Field label="타임아웃후기본">
 <Select value={cfg.ask_timeout_action} onValueChange={(v) => patch({ ask_timeout_action: v as JudgeConfig["ask_timeout_action"] })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="deny">차단</SelectItem>
 <SelectItem value="allow">행</SelectItem>
 </SelectContent>
 </Select>
 </Field>
 </div>
 </CardContent>
 </Card>
 </div>
 )}

 <div className="flex justify-end">
 <Button size="sm" onClick={save} disabled={saving || loading}>
 {saving ? "저장 중…" : "구성 저장"}
 </Button>
 </div>
 </div>
 );
}

// ---- page ----

export default function InterceptPage() {
 const [rules, setRules] = React.useState<InterceptRule[]>([]);
 const [loading, setLoading] = React.useState(true);
 const [open, setOpen] = React.useState(false);
 const [editing, setEditing] = React.useState<InterceptRule | null>(null);
 const [form, setForm] = React.useState<RuleForm>(defaultForm());
 const [saving, setSaving] = React.useState(false);
 const [regexErr, setRegexErr] = React.useState("");
 const [regexWarn, setRegexWarn] = React.useState(false); // true = JS 불가파싱가능는 Go 

 // ---- tool scope dialog ----
 const [scopeOpen, setScopeOpen] = React.useState(false);
 const [allTools, setAllTools] = React.useState<Tool[]>([]);
 const [enabledTools, setEnabledTools] = React.useState<Set<string>>(new Set());
 const [scopeLoading, setScopeLoading] = React.useState(false);
 const [scopeSaving, setScopeSaving] = React.useState(false);
 const [scopeTools, setScopeTools] = React.useState<string[]>([]); //페이지정보건:현재진입차단도구

 // ---- data ----

 const loadScope = React.useCallback(async () => {
 try {
 const cfg = await api.interceptGetToolConfig();
 setScopeTools(cfg.enabled_tools);
 } catch {
 // 정보건비키,실패
 }
 }, []);

 const load = React.useCallback(async () => {
 try {
 const r = await api.interceptRules();
 setRules(r);
 } catch {
 toast.error("불러오기차단규칙실패");
 } finally {
 setLoading(false);
 }
 }, []);

 React.useEffect(() => { load(); loadScope(); }, [load, loadScope]);

 React.useEffect(() => {
 if (form.match_type !== "regex" || !form.pattern) { setRegexErr(""); setRegexWarn(false); return; }
 try {
 new RegExp(form.pattern);
 setRegexErr("");
 setRegexWarn(false);
 } catch {
 // JS RegExp 안 지원 Go RE2 확장（예: (?i) 내 flag）。
 // 여기는미리보기검증실패，안 Go 없음；에서비스최종검증。
 setRegexErr("");
 setRegexWarn(true);
 }
 }, [form.pattern, form.match_type]);

 // ---- rule handlers ----

 function set(patch: Partial<RuleForm>) { setForm(f => ({ ...f, ...patch })); }

 function openNew() {
 setEditing(null);
 setForm(defaultForm());
 setRegexErr("");
 setOpen(true);
 }

 function openEdit(rule: InterceptRule) {
 setEditing(rule);
 setForm({
 name: rule.name, enabled: rule.enabled, priority: rule.priority,
 match_target: rule.match_target, match_type: rule.match_type,
 pattern: rule.pattern, action: rule.action, message: rule.message,
 timeout_enabled: rule.timeout_enabled, timeout_seconds: rule.timeout_seconds,
 timeout_action: rule.timeout_action,
 });
 setRegexErr("");
 setOpen(true);
 }

 async function handleSave() {
 if (!form.name.trim()) { toast.error("이름불가를"); return; }
 if (!form.pattern.trim()) { toast.error("모드불가를"); return; }
 if (regexErr) { toast.error("없음"); return; }
 setSaving(true);
 try {
 if (editing) {
 await api.updateInterceptRule(editing.id, form);
 toast.success("규칙업데이트");
 } else {
 await api.createInterceptRule(form);
 toast.success("규칙생성됨");
 }
 setOpen(false);
 load();
 } catch (e) {
 toast.error((e as Error).message);
 } finally {
 setSaving(false);
 }
 }

 async function handleDelete(id: number) {
 try {
 await api.deleteInterceptRule(id);
 toast.success("규칙삭제");
 load();
 } catch (e) {
 toast.error((e as Error).message);
 }
 }

 async function handleToggle(rule: InterceptRule) {
 try {
 await api.toggleInterceptRule(rule.id, !rule.enabled);
 load();
 } catch (e) {
 toast.error((e as Error).message);
 }
 }

 // ---- scope handlers ----

 async function openScope() {
 setScopeOpen(true);
 setScopeLoading(true);
 try {
 const [tools, cfg] = await Promise.all([api.tools(), api.interceptGetToolConfig()]);
 setAllTools(tools);
 setEnabledTools(new Set(cfg.enabled_tools));
 } catch (e) {
 toast.error("불러오기 실패: " + (e as Error).message);
 } finally {
 setScopeLoading(false);
 }
 }

 function toggleTool(key: string, val: boolean) {
 setEnabledTools(prev => {
 const next = new Set(prev);
 if (val) next.add(key); else next.delete(key);
 return next;
 });
 }

 async function saveScope() {
 setScopeSaving(true);
 try {
 await api.interceptSetToolConfig([...enabledTools]);
 toast.success("차단범위저장");
 setScopeTools([...enabledTools]);
 setScopeOpen(false);
 } catch (e) {
 toast.error("저장실패: " + (e as Error).message);
 } finally {
 setScopeSaving(false);
 }
 }

 const toolGroups = React.useMemo(() => groupTools(allTools), [allTools]);

 // ---- render ----

 return (
 <div className="flex flex-1 flex-col gap-5 p-6">

 {/* ---- header ---- */}
 <div className="flex items-center gap-2.5">
 <ShieldAlertIcon className="h-5 w-5 shrink-0" />
 <div>
 <h1 className="text-lg font-semibold leading-tight">명령차단</h1>
 <p className="text-sm text-muted-foreground mt-0.5">
 도구실행전차단규칙일치；미매칭명령에 의해모델폴백
 </p>
 </div>
 </div>

 {/* ---- 차단범위정보건（규칙일치·모델폴백：안 에서범위내도구안 ）---- */}
 <div
 className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 ${
 scopeTools.length === 0
 ? "border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
 : "bg-muted/40"
 }`}
 >
 <div className="flex min-w-0 items-center gap-2 text-sm">
 <ListFilterIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
 <span className="shrink-0 font-medium">차단범위</span>
 {scopeTools.length === 0 ? (
 <span className="text-amber-700 dark:text-amber-500">
 미활성화임의도구 — 차단규칙·모델폴백않음적용
 </span>
 ) : (
 <>
 <Badge variant="secondary" className="shrink-0">{scopeTools.length} 개도구</Badge>
 <span className="truncate text-muted-foreground" title={scopeTools.join("、")}>
 {scopeTools.join("、")}
 </span>
 </>
 )}
 </div>
 <Button
 variant={scopeTools.length === 0 ? "default" : "outline"}
 size="sm"
 className="shrink-0"
 onClick={openScope}
 >
 <ListFilterIcon className="h-4 w-4" />
 조정범위
 </Button>
 </div>

 <Tabs defaultValue="rules" className="flex-1">
 <TabsList>
 <TabsTrigger value="rules">차단규칙</TabsTrigger>
 <TabsTrigger value="judge">모델구성</TabsTrigger>
 </TabsList>

 {/* ---- tab: 차단규칙 ---- */}
 <TabsContent value="rules" className="mt-4 flex flex-col gap-4">
 <div className="flex items-center justify-between gap-3">
 <p className="text-xs text-muted-foreground">
 우선순위（수글자대）건일치，건매칭규칙적용
 </p>
 <Button onClick={openNew} size="sm" className="shrink-0">
 <PlusIcon className="h-4 w-4" />
 새로 생성규칙
 </Button>
 </div>

 <Card>
 <CardContent className="p-0">
 {loading ? (
 <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>
 ) : rules.length === 0 ? (
 <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
 <ShieldAlertIcon className="h-8 w-8 text-muted-foreground/40" />
 <p className="text-sm text-muted-foreground">없음규칙</p>
 <Button size="sm" variant="outline" onClick={openNew}>
 <PlusIcon className="h-4 w-4" />
 새로 생성첫건규칙
 </Button>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow className="hover:bg-transparent">
 <TableHead className="w-[72px]">우선순위</TableHead>
 <TableHead>이름</TableHead>
 <TableHead className="w-[90px]">목표</TableHead>
 <TableHead className="w-[80px]">유형</TableHead>
 <TableHead>모드</TableHead>
 <TableHead className="w-[72px]">정책</TableHead>
 <TableHead className="w-[64px] text-center">활성화</TableHead>
 <TableHead className="w-[80px]" />
 </TableRow>
 </TableHeader>
 <TableBody>
 {rules.map((rule) => (
 <TableRow key={rule.id} className={!rule.enabled ? "opacity-40" : ""}>
 <TableCell>
 <span className="font-mono text-xs tabular-nums">{rule.priority}</span>
 </TableCell>
 <TableCell className="font-medium text-sm">{rule.name}</TableCell>
 <TableCell>
 <span className="text-xs text-muted-foreground">
 {rule.match_target === "tool_name" ? "도구이름" : "입력내"}
 </span>
 </TableCell>
 <TableCell>
 <span className="text-xs text-muted-foreground">
 {rule.match_type === "regex" ? "" : "글자문자열"}
 </span>
 </TableCell>
 <TableCell className="max-w-[220px]">
 <code className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
 {rule.pattern}
 </code>
 </TableCell>
 <TableCell>
 <ActionBadge action={rule.action} />
 </TableCell>
 <TableCell className="text-center">
 <Switch
 checked={rule.enabled}
 onCheckedChange={() => handleToggle(rule)}
 />
 </TableCell>
 <TableCell>
 <div className="flex items-center justify-end gap-0.5">
 <Button
 size="icon" variant="ghost" className="h-7 w-7"
 onClick={() => openEdit(rule)}
 >
 <PencilIcon className="h-3.5 w-3.5" />
 </Button>
 <Button
 size="icon" variant="ghost"
 className="h-7 w-7 text-destructive hover:text-destructive"
 onClick={() => handleDelete(rule.id)}
 >
 <Trash2Icon className="h-3.5 w-3.5" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* ---- tab: 모델구성 ---- */}
 <TabsContent value="judge" className="mt-4">
 <JudgeCard />
 </TabsContent>
 </Tabs>

 {/* ---- editor sheet ---- */}
 <Sheet open={open} onOpenChange={setOpen}>
 <SheetContent side="right" className="flex flex-col gap-0 p-0 sm:max-w-md">
 <SheetHeader className="border-b px-6 py-4">
 <SheetTitle>{editing ? "편집규칙" : "새로 생성규칙"}</SheetTitle>
 <SheetDescription className="text-xs">
 우선순위대일치；건매칭규칙적용，후
 </SheetDescription>
 </SheetHeader>

 <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
 <Field label="이름">
 <Input
 placeholder="에규칙개이름글자"
 value={form.name}
 onChange={(e) => set({ name: e.target.value })}
 />
 </Field>

 <Field label="우선순위（수글자대일치）">
 <Input
 type="number"
 value={form.priority}
 onChange={(e) => set({ priority: parseInt(e.target.value) || 0 })}
 />
 </Field>

 <Separator />

 <Field label="일치목표">
 <Select
 value={form.match_target}
 onValueChange={(v) => set({ match_target: v as RuleForm["match_target"] })}
 >
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="tool_name">도구이름（tool_name）</SelectItem>
 <SelectItem value="tool_input">입력내（tool_input JSON）</SelectItem>
 </SelectContent>
 </Select>
 </Field>

 <Field label="일치유형">
 <Select
 value={form.match_type}
 onValueChange={(v) => set({ match_type: v as RuleForm["match_type"] })}
 >
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="string">글자문자열포함</SelectItem>
 <SelectItem value="regex"></SelectItem>
 </SelectContent>
 </Select>
 </Field>

 <Field label="모드">
 <Input
 placeholder={form.match_type === "regex" ? "^Bash$" : "rm -rf"}
 value={form.pattern}
 onChange={(e) => set({ pattern: e.target.value })}
 className={regexErr ? "border-destructive focus-visible:ring-destructive" : ""}
 />
 {regexErr && (
 <p className="text-xs text-destructive mt-1">{regexErr}</p>
 )}
 {regexWarn && (
 <p className="text-xs text-amber-600 mt-1">포함 Go RE2 확장（예: <code className="font-mono">(?i)</code>），기불가미리보기，제출후에 의해서비스검증</p>
 )}
 </Field>

 <Separator />

 <Field label="차단정책">
 <Select
 value={form.action}
 onValueChange={(v) => set({ action: v as InterceptAction })}
 >
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="allow">허용 — 직접행，후규칙</SelectItem>
 <SelectItem value="deny">금지 — ，반환거부메시지에모델</SelectItem>
 <SelectItem value="ask">로 — 외승인 대기</SelectItem>
 </SelectContent>
 </Select>
 </Field>

 {form.action !== "allow" && (
 <Field label={form.action === "deny" ? "거부메시지（반환에모델）" : "승인설명（선택）"}>
 <Textarea
 placeholder={form.action === "deny" ? "작업전체정책" : ""}
 value={form.message}
 onChange={(e) => set({ message: e.target.value })}
 rows={2}
 className="resize-none"
 />
 </Field>
 )}

 {form.action === "ask" && (
 <>
 <Separator />
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium">활성화승인타임아웃</p>
 <p className="text-xs text-muted-foreground">타임아웃후자동，더 이상 외</p>
 </div>
 <Switch
 checked={form.timeout_enabled}
 onCheckedChange={(v) => set({ timeout_enabled: v })}
 />
 </div>
 {form.timeout_enabled && (
 <div className="flex items-end gap-3">
 <Field label="타임아웃시각（초）">
 <Input
 type="number"
 min={5}
 className="w-28"
 value={form.timeout_seconds}
 onChange={(e) => {
 const n = parseInt(e.target.value, 10);
 if (n > 0) set({ timeout_seconds: n });
 }}
 />
 </Field>
 <Field label="타임아웃">
 <Select
 value={form.timeout_action}
 onValueChange={(v) => set({ timeout_action: v as "deny" | "allow" })}
 >
 <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="deny">자동거부</SelectItem>
 <SelectItem value="allow">자동허용</SelectItem>
 </SelectContent>
 </Select>
 </Field>
 </div>
 )}
 </>
 )}

 <Separator />

 <div className="flex items-center gap-3">
 <Switch
 id="rule-enabled"
 checked={form.enabled}
 onCheckedChange={(v) => set({ enabled: v })}
 />
 <Label htmlFor="rule-enabled" className="cursor-pointer">활성화이규칙</Label>
 </div>
 </div>

 <SheetFooter className="border-t px-6 py-4 flex-row justify-end gap-2">
 <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
 <Button onClick={handleSave} disabled={saving || !!regexErr}>
 {saving ? "저장 중…" : "저장"}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>

 {/* ---- scope dialog ---- */}
 <Dialog open={scopeOpen} onOpenChange={setScopeOpen}>
 <DialogContent className="sm:max-w-lg flex flex-col overflow-hidden p-0 gap-0" style={{ maxHeight: "min(80vh, 560px)" }}>
 <DialogHeader className="shrink-0 border-b px-6 py-4">
 <DialogTitle className="flex items-center gap-2">
 <ListFilterIcon className="h-4 w-4" />
 차단범위
 </DialogTitle>
 <DialogDescription className="text-xs">
 활성화차단도구진입규칙일치；그도구직접행
 </DialogDescription>
 </DialogHeader>

 <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-5">
 {scopeLoading ? (
 <p className="text-sm text-muted-foreground py-4">불러오는 중…</p>
 ) : (
 toolGroups.map((group, gi) => (
 <div key={group.label}>
 {gi > 0 && <Separator className="mb-5" />}
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
 {group.label}
 </p>
 <div className="space-y-0.5">
 {group.tools.map((t) => (
 <div key={t.key} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
 <Switch
 id={`scope-${t.key}`}
 checked={enabledTools.has(t.key)}
 onCheckedChange={(v) => toggleTool(t.key, v)}
 />
 <label htmlFor={`scope-${t.key}`} className="flex-1 min-w-0 cursor-pointer">
 <div className="flex items-center gap-1.5">
 <span className="font-mono text-sm">{t.key}</span>
 {(t.kind && t.kind !== "builtin") && (
 <Badge variant="outline" className="px-1 py-0 text-[10px]">{t.kind}</Badge>
 )}
 </div>
 {t.description && (
 <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>
 )}
 </label>
 </div>
 ))}
 </div>
 </div>
 ))
 )}
 </div>

 <div className="shrink-0 border-t px-6 py-3 flex justify-end gap-2">
 <Button variant="outline" size="sm" onClick={() => setScopeOpen(false)}>취소</Button>
 <Button size="sm" onClick={saveScope} disabled={scopeSaving || scopeLoading}>
 {scopeSaving ? "저장 중…" : "저장"}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
