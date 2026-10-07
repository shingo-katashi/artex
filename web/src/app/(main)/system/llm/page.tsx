"use client";

import * as React from "react";

import {
 Loader2Icon,
 PlugZapIcon,
 PlusIcon,
 RefreshCwIcon,
 RotateCcwIcon,
 SaveIcon,
 StarIcon,
 Trash2Icon,
 ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { LLMPoolMember, LLMPoolStatus, LLMProfile, LLMRetryOverride } from "@/lib/types";
import { cn } from "@/lib/utils";

import { ProfileRetryFields, RetryPolicyPanel, ZERO_OVERRIDE } from "./_components/retry";

// 추론토글(thinking.type)·추론도(reasoning_effort)는개【서로 독립】필드，
// 각각단설정——API없음 thinking 필드、만도매개변수추론 활성화，분리 필요。
// DB글자문자열 = 해당필드【전송 안 함】；Radix Select 안 허용 value， UI "none"
// 표시전송 안 함，· "" 상호 변환（NONE / fromStore / toStore）。
const NONE = "none";
const fromStore = (v?: string) => (v ? v : NONE);
const toStore = (v: string) => (v === NONE ? "" : v);
const THINKING_TYPES: { value: string; label: string }[] = [
 { value: NONE, label: "전송 안 함(기본)" },
 { value: "disabled", label: "비활성화" },
 { value: "enabled", label: "활성화" },
];
// 출력상개요청필드이름（ openai 형식의미）。NONE ↔ "" 동일센티널 변환。
const MAX_TOKENS_FIELDS: { value: string; label: string }[] = [
 { value: NONE, label: "max_tokens（기본）" },
 { value: "max_completion_tokens", label: "max_completion_tokens" },
];
// 외종형식각각 고정필드이름，건대상그것없음의미，설명문구직접명확히。
const MAX_TOKENS_FIELD_HINTS: Record<string, string> = {
 openai:
 "상개키。max_tokens 는기본，대다수만 인식；OpenAI 공식추론모델（o 열 / GPT-5）만 인식 max_completion_tokens，까지 max_tokens 직접 unsupported_parameter。",
 anthropic: " openai 형식선택。Anthropic 필드이름고정를 max_tokens。",
 "openai-responses": " openai 형식선택。Responses API 필드이름고정를 max_output_tokens。",
};
const EFFORT_LEVELS: { value: string; label: string }[] = [
 { value: NONE, label: "전송 안 함(기본)" },
 { value: "low", label: "low" },
 { value: "medium", label: "medium" },
 { value: "high", label: "high" },
 { value: "xhigh", label: "xhigh" },
 { value: "max", label: "max" },
];

function cooldownText(secs: number) {
 if (secs <= 0) return "";
 if (secs < 60) return `${secs}s`;
 return `${Math.ceil(secs / 60)}min`;
}

// 개구성에서카드상표시「여부정상」。없음 Key 구성이안 요청，차단해당먼저；
// 그상태출처폴링차단기록（폴링않음생성신기록，이「정상」= 없음장애）。
type Health = { label: string; cls: string; hint?: string };
function healthOf(p: LLMProfile, m?: LLMPoolMember): Health {
 if (!p.api_key_hint) {
 return {
 label: "미구성 Key",
 cls: "border-muted-foreground/40 text-muted-foreground",
 hint: "API Key 미입력, 호출 불가",
 };
 }
 if (m?.state === "tripped") {
 return {
 label: m.cooldown_secs > 0 ? `차단됨 · ${cooldownText(m.cooldown_secs)}` : "차단됨",
 cls: "border-destructive/50 text-destructive",
 hint: m.last_error,
 };
 }
 if (m?.state === "degraded") {
 return {
 label: `이상 · 실패 ${m.fails} 차`,
 cls: "border-amber-500/50 text-amber-600 dark:text-amber-400",
 hint: m.last_error,
 };
 }
 return { label: "정상", cls: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" };
}

// ─────────────────────────────────────────────────────────────────────────────
// 폴링구성드로어
// ─────────────────────────────────────────────────────────────────────────────

function PoolSheet({
 open,
 onOpenChange,
 pool,
 onReload,
}: {
 open: boolean;
 onOpenChange: (o: boolean) => void;
 pool: LLMPoolStatus | null;
 onReload: () => Promise<void>;
}) {
 const [busy, setBusy] = React.useState(false);

 // 쿨다운 카운트다운는후계산남은초수——드로어구성안 정상주기적 fetch，갱신。
 React.useEffect(() => {
 if (!open || !pool?.enabled || !pool.chain.some((m) => m.state !== "ok")) return;
 const t = setInterval(() => void onReload(), 10_000);
 return () => clearInterval(t);
 }, [open, pool, onReload]);

 async function toggle(patch: { llm_pool_enabled?: boolean; llm_pool_bind_fallback?: boolean }) {
 if (busy) return;
 setBusy(true);
 try {
 await api.setSettings(patch);
 await onReload();
 if (patch.llm_pool_enabled !== undefined) {
 toast.success(patch.llm_pool_enabled ? "활성화됨 LLM 폴링" : "비활성화됨 LLM 폴링");
 } else {
 toast.success("폴백 설정 업데이트됨");
 }
 } catch (e) {
 toast.error(`설정 실패: ${(e as Error).message}`);
 } finally {
 setBusy(false);
 }
 }

 async function recover(id?: string) {
 try {
 await api.resetLLMPool(id);
 await onReload();
 toast.success(id ? "해당 구성 복원됨" : "전체 구성 복원됨");
 } catch (e) {
 toast.error(`복원 실패: ${(e as Error).message}`);
 }
 }

 const enabled = pool?.enabled ?? false;
 const chain = pool?.chain ?? [];
 // ·폴링멤버（제외표시「폴링 제외」），후실제시도。
 const inChain = chain.filter((m) => m.active || !m.excluded);
 const tripped = chain.filter((m) => m.state === "tripped");

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent side="right" className="flex flex-col gap-0 p-0 data-[side=right]:sm:max-w-lg">
 <SheetHeader className="px-4">
 <SheetTitle className="flex items-center gap-2">
 <ZapIcon className="size-4" /> LLM 폴링 · 장애 조치
 </SheetTitle>
 <SheetDescription>
 켜짐후，<b>미지정모델</b> Agent 에서현재구성안 （잔액안 / Key 만료 / 속도 제한 /
 서비스예외）시 자동 전환까지하개구성。
 </SheetDescription>
 </SheetHeader>

 <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
 <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
 <div className="grid gap-0.5">
 <Label className="text-sm">폴링 사용</Label>
 <p className="text-muted-foreground text-xs">기본꺼짐。꺼짐항상활성구성，실패실패。</p>
 </div>
 <Switch
 checked={enabled}
 disabled={busy}
 onCheckedChange={(v) => void toggle({ llm_pool_enabled: v })}
 aria-label="LLM 폴링 토글"
 />
 </div>

 {enabled && (
 <>
 <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
 <div className="grid gap-0.5">
 <Label className="text-sm">지정모델실패폴백</Label>
 <p className="text-muted-foreground text-xs">
 기본꺼짐：Agent 또는작업지정개구성만，실패실패（않음조용히바꿈모델）。
 켜짐후，지정구성실패도폴백까지하폴링。
 </p>
 </div>
 <Switch
 checked={pool?.bind_fallback ?? false}
 disabled={busy}
 onCheckedChange={(v) => void toggle({ llm_pool_bind_fallback: v })}
 aria-label="연결구성실패폴백토글"
 />
 </div>

 <Separator />

 <div className="grid gap-2">
 <div className="flex items-center justify-between">
 <Label className="text-sm">폴링</Label>
 {tripped.length > 0 && (
 <Button size="sm" variant="ghost" onClick={() => void recover()}>
 <RotateCcwIcon /> 전체복원
 </Button>
 )}
 </div>
 {inChain.length < 2 && (
 <p className="text-muted-foreground text-xs">
 현재 {inChain.length} 개구성，폴링않음적용——소필요 2 개 API Key ·폴링구성。
 </p>
 )}
 {chain.map((m) => {
 const excluded = m.excluded && !m.active;
 const order = excluded ? null : inChain.findIndex((x) => x.profile_id === m.profile_id) + 1;
 return (
 <div
 key={m.profile_id}
 className={cn(
 "grid gap-1 rounded-lg border p-2.5 text-sm",
 excluded && "opacity-55",
 m.state === "tripped" && "border-destructive/40",
 )}
 >
 <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
 <span className="w-5 shrink-0 text-center font-mono text-muted-foreground text-xs">
 {order ?? "—"}
 </span>
 <span className="font-medium">{m.name}</span>
 {m.active && (
 <Badge variant="outline" className="border-amber-400/50 text-amber-500">
 활성
 </Badge>
 )}
 {excluded && <Badge variant="outline">폴링 제외</Badge>}
 <div className="ml-auto flex items-center gap-2">
 {m.state === "tripped" && m.cooldown_secs > 0 && (
 <span className="text-muted-foreground text-xs">쿨다운 {cooldownText(m.cooldown_secs)}</span>
 )}
 {m.state === "degraded" && (
 <span className="text-muted-foreground text-xs">연속실패 {m.fails} 차</span>
 )}
 {m.state !== "ok" && (
 <Button
 size="icon"
 variant="ghost"
 className="size-7"
 aria-label="즉시 복원"
 title="즉시 복원：지우기차단，하차호출재시도해당구성"
 onClick={() => void recover(m.profile_id)}
 >
 <RotateCcwIcon className="size-3.5" />
 </Button>
 )}
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-x-3 pl-7 text-muted-foreground text-xs">
 <code className="truncate font-mono">{m.model}</code>
 {!m.active && <span>우선순위 {m.priority}</span>}
 </div>
 {m.last_error && (
 <p className="truncate pl-7 font-mono text-muted-foreground text-xs" title={m.last_error}>
 {m.last_error}
 </p>
 )}
 </div>
 );
 })}
 {chain.length === 0 && (
 <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
 없음구성
 </div>
 )}
 </div>

 <div className="rounded-lg border border-dashed p-3 text-muted-foreground text-xs leading-relaxed">
 활성구성를 1 순위，그우선순위부터높까지낮（에서구성설정）。개구성실패후쿨다운 （60s → 5min →
 30min），쿨다운내，복원후자동복귀。컨텍스트창안 하현재요청구성건너뜀。 지정모델 Agent
 ·작업기본폴링 제외。
 </div>
 </>
 )}
 </div>
 </SheetContent>
 </Sheet>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// 모델구성드로어（새로 생성 / 편집공통세트단）
// ─────────────────────────────────────────────────────────────────────────────

function ProfileSheet({
 profile,
 open,
 onOpenChange,
 onSaved,
}: {
 profile: LLMProfile | null; // null = 새로 생성
 open: boolean;
 onOpenChange: (o: boolean) => void;
 onSaved: (id: string) => void;
}) {
 const isNew = !profile;
 const [name, setName] = React.useState("");
 const [format, setFormat] = React.useState<"anthropic" | "openai" | "openai-responses">("anthropic");
 const [model, setModel] = React.useState("");
 const [baseUrl, setBaseUrl] = React.useState("");
 const [proxy, setProxy] = React.useState("");
 const [apiKey, setApiKey] = React.useState("");
 const [keyHint, setKeyHint] = React.useState("");
 const [rps, setRps] = React.useState("0");
 const [rpm, setRpm] = React.useState("0");
 const [cw, setCw] = React.useState("0"); // 컨텍스트창(K tokens);0=기본200K
 const [thinkingType, setThinkingType] = React.useState(NONE);
 const [effort, setEffort] = React.useState(NONE);
 const [priority, setPriority] = React.useState("0"); // 폴링순위;대
 const [poolExclude, setPoolExclude] = React.useState(false);
 const [streaming, setStreaming] = React.useState(true); // true=스트리밍(기본);false=비스트리밍
 const [maxTokens, setMaxTokens] = React.useState("0"); // 단차응답출력상;0=전송 안 함
 const [maxTokensField, setMaxTokensField] = React.useState(NONE); // 상개필드이름;NONE=max_tokens
 const [sessionHeaderKey, setSessionHeaderKey] = React.useState(""); // 사용자 지정세션이름;=전송 안 함
 const [retry, setRetry] = React.useState<LLMRetryOverride>(ZERO_OVERRIDE); // 이구성재시도커버;전체 0=따름전역
 const [testing, setTesting] = React.useState(false);
 const [saving, setSaving] = React.useState(false);
 const [models, setModels] = React.useState<string[]>([]);
 const [loadingModels, setLoadingModels] = React.useState(false);
 const [modelsOpen, setModelsOpen] = React.useState(false);

 // 매차열기부터입력 profile 단（새로 생성리셋를기본값）。드로어 닫고 다시 열면
 // 는한 번깨끗한시작，않음하상개구성흔적。
 React.useEffect(() => {
 if (!open) return;
 setName(profile?.name ?? "");
 setFormat(profile?.format === "openai" || profile?.format === "openai-responses" ? profile.format : "anthropic");
 setModel(profile?.model ?? "");
 setBaseUrl(profile?.base_url ?? "");
 setProxy(profile?.proxy ?? "");
 setRps(String(profile?.rate_per_second ?? 0));
 setRpm(String(profile?.rate_per_minute ?? 0));
 setCw(String(profile?.context_window_k ?? 0));
 setThinkingType(fromStore(profile?.thinking_type));
 setEffort(fromStore(profile?.reasoning_effort));
 setPriority(String(profile?.priority ?? 0));
 setPoolExclude(profile?.pool_exclude ?? false);
 setStreaming(profile?.streaming ?? true);
 setMaxTokens(String(profile?.max_tokens ?? 0));
 setMaxTokensField(fromStore(profile?.max_tokens_field));
 setSessionHeaderKey(profile?.session_header_key ?? "");
 setRetry(profile?.retry ?? ZERO_OVERRIDE);
 setApiKey("");
 setKeyHint(profile?.api_key_hint ?? "");
 setModels([]);
 setModelsOpen(false);
 }, [open, profile]);

 const profileId = profile ? Number(profile.id) : undefined;

 async function loadModels() {
 if (loadingModels) return;
 setLoadingModels(true);
 setModels([]);
 try {
 const r = await api.fetchLLMModels(format, baseUrl, apiKey, proxy, profileId);
 if (r.ok && r.models && r.models.length > 0) {
 setModels(r.models);
 setModelsOpen(true);
 toast.success(`불러오기 ${r.models.length} 개모델`);
 } else {
 toast.error(`불러오기모델실패：${r.error ?? "미획득까지모델"}`);
 }
 } catch (e) {
 toast.error(`불러오기모델오류：${(e as Error).message}`);
 } finally {
 setLoadingModels(false);
 }
 }

 async function testConnection() {
 if (testing) return;
 setTesting(true);
 try {
 // 구성실제추론매개변수，안 지원해당필드모델에서여기실패，
 // 안 는 외까지작업。 profile id：Key 입력비우기 Key。
 const r = await api.testLLM(
 format,
 model,
 baseUrl,
 apiKey,
 proxy,
 toStore(thinkingType),
 toStore(effort),
 profileId,
 streaming,
 sessionHeaderKey.trim(),
 );
 // 응답내표시：모델，세션는。
 if (r.ok)
 toast.success(`연결성공 · ${r.latency_ms ?? "?"}ms · ${r.model ?? model}`, {
 description: r.reply ? `응답：${r.reply}` : undefined,
 });
 else toast.error(`연결실패：${r.error ?? "알 수 없음"}`);
 } catch (e) {
 toast.error(`테스트오류：${(e as Error).message}`);
 } finally {
 setTesting(false);
 }
 }

 async function save() {
 if (!name.trim() || !model.trim()) {
 toast.error("입력하세요이름·모델");
 return;
 }
 if (saving) return;
 setSaving(true);
 try {
 const { id } = await api.saveLLMProfile({
 ...(profile ? { id: Number(profile.id) } : {}),
 name: name.trim(),
 format,
 model: model.trim(),
 base_url: baseUrl.trim(),
 proxy: proxy.trim(),
 api_key: apiKey,
 rate_per_second: Number(rps) || 0,
 rate_per_minute: Number(rpm) || 0,
 context_window_k: Number(cw) || 0,
 thinking_type: toStore(thinkingType),
 reasoning_effort: toStore(effort),
 priority: Number(priority) || 0,
 pool_exclude: poolExclude,
 streaming,
 max_tokens: Math.max(0, Number(maxTokens) || 0),
 // 필드이름토글대상 openai(Chat Completions) 의미，그형식폴백까지기본；
 // 후도한 번，여기는 UI 값。
 max_tokens_field: format === "openai" ? toStore(maxTokensField) : "",
 session_header_key: sessionHeaderKey.trim(),
 retry,
 });
 if (isNew) toast.success(`새로 생성：${name.trim()}（에서카드상「를활성」활성화）`);
 else toast.success(profile?.is_default ? "저장，활성구성적용，없음" : "저장");
 onSaved(String(id));
 onOpenChange(false);
 } catch (e) {
 toast.error(`저장 실패: ${(e as Error).message}`);
 } finally {
 setSaving(false);
 }
 }

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right"
 className="flex flex-col gap-0 p-0 data-[side=right]:min-w-[420px] data-[side=right]:sm:max-w-xl"
 >
 <SheetHeader className="px-4">
 <SheetTitle className="flex items-center gap-2">
 {isNew ? "새로 생성모델구성" : `편집：${profile?.name}`}
 {profile?.is_default && (
 <Badge variant="outline" className="border-amber-400/50 text-amber-500">
 활성중
 </Badge>
 )}
 </SheetTitle>
 <SheetDescription>
 {isNew
 ? "새로 생성후않음자동활성，에서카드상「를활성」활성화。"
 : "변경후클릭저장；활성구성저장후대상모든 Agent 즉시적용。"}
 </SheetDescription>
 </SheetHeader>

 <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
 <div className="grid gap-4 sm:grid-cols-2">
 <div className="grid gap-2">
 <Label htmlFor="p-name">이름</Label>
 <Input
 id="p-name"
 placeholder="예:：OpenAI "
 value={name}
 onChange={(e) => setName(e.target.value)}
 />
 </div>
 <div className="grid gap-2">
 <Label>형식</Label>
 <Select value={format} onValueChange={(v) => setFormat(v as "anthropic" | "openai" | "openai-responses")}>
 <SelectTrigger>
 <SelectValue placeholder="선택형식" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="anthropic">Anthropic</SelectItem>
 <SelectItem value="openai">OpenAI (Chat Completions)</SelectItem>
 <SelectItem value="openai-responses">OpenAI (Responses API)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="p-model">모델</Label>
 <div className="flex gap-2">
 <Input
 id="p-model"
 className="font-mono"
 placeholder="claude-opus-4-8"
 value={model}
 onChange={(e) => setModel(e.target.value)}
 />
 {/* modal: 개 Popover 내 portal 까지 <body>，에서 Sheet 외，
 안 modal 목록안 。modal 상。 */}
 <Popover open={modelsOpen} onOpenChange={setModelsOpen} modal>
 <PopoverTrigger asChild>
 <Button
 type="button"
 variant="outline"
 size="icon"
 className="shrink-0"
 disabled={loadingModels}
 onClick={loadModels}
 title="부터 API 불러오기모델"
 >
 {loadingModels ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
 </Button>
 </PopoverTrigger>
 {models.length > 0 && (
 <PopoverContent className="max-h-72 w-72 gap-0 overflow-y-auto overscroll-contain p-1" align="end">
 {models.map((m) => (
 <button
 key={m}
 type="button"
 className="w-full shrink-0 rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-accent hover:text-accent-foreground"
 onClick={() => {
 setModel(m);
 setModelsOpen(false);
 }}
 >
 {m}
 </button>
 ))}
 </PopoverContent>
 )}
 </Popover>
 </div>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="p-base-url">Base URL（선택）</Label>
 <Input
 id="p-base-url"
 className="font-mono"
 placeholder="https://api.openai.com/v1"
 value={baseUrl}
 onChange={(e) => setBaseUrl(e.target.value)}
 />
 </div>

 <div className="grid gap-2">
 <Label htmlFor="p-proxy">프록시（선택）</Label>
 <Input
 id="p-proxy"
 className="font-mono"
 placeholder="socks5://user:pass@127.0.0.1:1080 · http://127.0.0.1:8080"
 value={proxy}
 onChange={(e) => setProxy(e.target.value)}
 />
 <p className="text-muted-foreground text-xs">
 LLM 요청이프록시，지원 http/https/socks5，비밀번호（예:
 socks5://user:pass@host:port，비밀번호글자 URL 코드）；비우기표시안 프록시（직접 연결）。
 </p>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="p-session-header">사용자 지정세션（선택）</Label>
 <Input
 id="p-session-header"
 className="font-mono"
 placeholder="예: x-session-id（비우기=전송 안 함）"
 value={sessionHeaderKey}
 onChange={(e) => setSessionHeaderKey(e.target.value)}
 />
 <p className="text-muted-foreground text-xs">
 입력이름후，매차요청상개 HTTP ，값자동를 <b>현재세션 session id</b>（chat 세션예:
 conv-12、worker 예: exp3-worker-i87）。에 session-id 안내 /
 에 의해；세션다、안 세션안 동일。비우기전송 안 함。
 </p>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="p-api-key">API Key</Label>
 <Input
 id="p-api-key"
 type="password"
 placeholder={keyHint ? `설정（${keyHint}），비우기유지안 ` : "sk-…"}
 value={apiKey}
 onChange={(e) => setApiKey(e.target.value)}
 />
 </div>

 <div className="grid gap-4 sm:grid-cols-3">
 <div className="grid gap-2">
 <Label htmlFor="p-rps">매초</Label>
 <Input id="p-rps" type="number" min={0} value={rps} onChange={(e) => setRps(e.target.value)} />
 </div>
 <div className="grid gap-2">
 <Label htmlFor="p-rpm">매분</Label>
 <Input id="p-rpm" type="number" min={0} value={rpm} onChange={(e) => setRpm(e.target.value)} />
 </div>
 <div className="grid gap-2">
 <Label htmlFor="p-cw">컨텍스트창(K)</Label>
 <Input
 id="p-cw"
 type="number"
 min={0}
 max={1000}
 value={cw}
 onChange={(e) => setCw(e.target.value)}
 placeholder="200"
 />
 </div>
 </div>
 <p className="-mt-2 text-muted-foreground text-xs">
 0 = 제한 없음，전체 Agent 。컨텍스트창단 K（ token），0 = 기본 200K，상 1000（
 1M）；높압축안 트리거。
 </p>

 <div className="grid gap-3 rounded-lg border p-3">
 <div className="flex items-center justify-between gap-4">
 <div className="grid gap-0.5">
 <Label htmlFor="p-priority" className="text-sm">
 폴링우선순위
 </Label>
 <p className="text-muted-foreground text-xs">
 수글자대선택됨；활성구성를 1 순위，·이값없음。동일우선순위구성，도。
 </p>
 </div>
 <Input
 id="p-priority"
 type="number"
 className="w-24 shrink-0"
 value={priority}
 onChange={(e) => setPriority(e.target.value)}
 />
 </div>
 <div className="flex items-center justify-between gap-4 border-t pt-3">
 <div className="grid gap-0.5">
 <Label className="text-sm">폴링 제외</Label>
 <p className="text-muted-foreground text-xs">
 켜짐후않음장애 조치목표（ Agent / 작업지정）。 「에개 Agent
 、안 실패」구성。
 </p>
 </div>
 <Switch checked={poolExclude} onCheckedChange={setPoolExclude} aria-label="폴링 제외" />
 </div>
 <div className="flex items-center justify-between gap-4 border-t pt-3">
 <div className="grid gap-0.5">
 <Label className="text-sm">스트리밍출력 · streaming</Label>
 <p className="text-muted-foreground text-xs">
 켜짐（기본）스트리밍 SSE，실행 중실시간도·실시간 token 수。 꺼짐·비스트리밍（stream:false，
 한 번반환전체응답）——일부 SSE （ / 추론필드），
 는실행 중실시간도。
 </p>
 </div>
 <Switch checked={streaming} onCheckedChange={setStreaming} aria-label="스트리밍출력" />
 </div>
 </div>

 <div className="grid gap-3 rounded-lg border p-3">
 <div className="flex items-center justify-between gap-4">
 <div className="grid gap-0.5">
 <Label htmlFor="p-max-tokens" className="text-sm">
 출력상 · max tokens
 </Label>
 <p className="text-muted-foreground text-xs">
 단차응답다다소 token，매차요청。0（기본）= 전송 안 함해당필드，에 의해서비스기본값。
 ·상「컨텍스트창」는：는모델량，에서이압축값。
 소추론모델에서추론，개글자안 。
 </p>
 </div>
 <Input
 id="p-max-tokens"
 type="number"
 min={0}
 className="w-28 shrink-0"
 value={maxTokens}
 onChange={(e) => setMaxTokens(e.target.value)}
 placeholder="0"
 />
 </div>
 <div className="flex items-center justify-between gap-4 border-t pt-3">
 <div className="grid gap-0.5">
 <Label className="text-sm">상필드이름</Label>
 <p className="text-muted-foreground text-xs">{MAX_TOKENS_FIELD_HINTS[format]}</p>
 </div>
 <Select
 value={format === "openai" ? maxTokensField : NONE}
 onValueChange={setMaxTokensField}
 disabled={format !== "openai"}
 >
 <SelectTrigger className="w-56 shrink-0">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {MAX_TOKENS_FIELDS.map((o) => (
 <SelectItem key={o.value} value={o.value}>
 {o.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid gap-3 rounded-lg border p-3">
 <div className="flex items-center justify-between gap-4">
 <div className="grid gap-0.5">
 <Label className="text-sm">추론토글 · thinking.type</Label>
 <p className="text-muted-foreground text-xs">
 제어여부전송 thinking 필드。전송 안 함=안 해당필드（ MiniMax 외안 지원 모델）；꺼짐=
 disabled；켜짐= enabled。·하도서로 독립。
 </p>
 </div>
 <Select value={thinkingType} onValueChange={setThinkingType}>
 <SelectTrigger className="w-32 shrink-0">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {THINKING_TYPES.map((o) => (
 <SelectItem key={o.value} value={o.value}>
 {o.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex items-center justify-between gap-4 border-t pt-3">
 <div className="grid gap-0.5">
 <Label className="text-sm">추론도 · reasoning_effort</Label>
 <p className="text-muted-foreground text-xs">
 독립도（OpenAI reasoning_effort / Anthropic output_config.effort）。 API없음 thinking
 필드、만도활성추론，단설정、전송 안 함추론토글。
 </p>
 </div>
 <Select value={effort} onValueChange={setEffort}>
 <SelectTrigger className="w-32 shrink-0">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {EFFORT_LEVELS.map((o) => (
 <SelectItem key={o.value} value={o.value}>
 {o.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <ProfileRetryFields value={retry} onChange={setRetry} />
 </div>

 <div className="flex gap-2 border-t px-4 py-3">
 <Button variant="outline" onClick={testConnection} disabled={testing}>
 {testing ? <Loader2Icon className="animate-spin" /> : <PlugZapIcon />}
 {testing ? "테스트중…" : "테스트연결"}
 </Button>
 <Button onClick={save} disabled={saving} className="flex-1">
 {saving && <Loader2Icon className="animate-spin" />}
 {!saving && (isNew ? <PlusIcon /> : <SaveIcon />)}
 {isNew ? "새로 생성" : "저장"}
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LLMPage() {
 const [profiles, setProfiles] = React.useState<LLMProfile[]>([]);
 const [pool, setPool] = React.useState<LLMPoolStatus | null>(null);
 const [poolOpen, setPoolOpen] = React.useState(false);
 // 드로어토글내：꺼짐 editing 유지안 ，그렇지 않으면꺼짐제목부터
 // 「편집 X」「새로 생성」。editing = null 표시새로 생성。
 const [editOpen, setEditOpen] = React.useState(false);
 const [editing, setEditing] = React.useState<LLMProfile | null>(null);
 const openEditor = React.useCallback((p: LLMProfile | null) => {
 setEditing(p);
 setEditOpen(true);
 }, []);

 const loadPool = React.useCallback(async () => {
 try {
 setPool(await api.llmPool());
 } catch {
 /* ignore */
 }
 }, []);

 const load = React.useCallback(async () => {
 try {
 setProfiles(await api.llmProfiles());
 } catch {
 /* ignore */
 }
 await loadPool();
 }, [loadPool]);

 React.useEffect(() => {
 void load();
 }, [load]);

 // 카드상 profile id 폴링상태。
 const health = React.useMemo(() => {
 const m = new Map<string, LLMPoolMember>();
 for (const c of pool?.chain ?? []) m.set(c.profile_id, c);
 return m;
 }, [pool]);

 async function activate(id: string, name: string) {
 try {
 await api.activateLLMProfile(id);
 toast.success(`활성：${name}`);
 await load();
 } catch (e) {
 toast.error(`활성실패：${(e as Error).message}`);
 }
 }

 async function remove(p: LLMProfile) {
 if (p.is_default) {
 toast.error("불가삭제현재활성구성");
 return;
 }
 try {
 await api.deleteLLMProfile(p.id);
 toast.success(`삭제：${p.name}`);
 await load();
 } catch (e) {
 toast.error(`삭제 실패: ${(e as Error).message}`);
 }
 }

 const poolOn = pool?.enabled ?? false;

 return (
 <div className="flex flex-1 flex-col gap-4 md:gap-6">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <h1 className="font-semibold text-xl tracking-tight">LLM</h1>
 <p className="text-muted-foreground text-sm">
 전체 Agent 형식 / 모델 / 구성。클릭카드편집，를현재활성구성。
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button size="sm" variant="outline" onClick={() => setPoolOpen(true)}>
 <ZapIcon /> 폴링구성
 {poolOn && (
 <Badge variant="outline" className="ml-1 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
 활성화됨
 </Badge>
 )}
 </Button>
 <Button size="sm" variant="outline" onClick={() => openEditor(null)}>
 <PlusIcon /> 새로 생성
 </Button>
 </div>
 </div>

 <Tabs defaultValue="profiles" className="flex-1">
 <TabsList>
 <TabsTrigger value="profiles">모델구성</TabsTrigger>
 <TabsTrigger value="retry">재시도·백오프</TabsTrigger>
 </TabsList>

 <TabsContent value="profiles" className="mt-4">
 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
 {profiles.map((p) => {
 const h = healthOf(p, health.get(p.id));
 return (
 // biome-ignore lint/a11y/useSemanticElements: 카드내작업버튼， <button> 버튼（비 HTML）
 <Card
 key={p.id}
 role="button"
 tabIndex={0}
 onClick={() => openEditor(p)}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 openEditor(p);
 }
 }}
 className={cn(
 "cursor-pointer gap-0 py-4 outline-none transition-colors hover:border-foreground/30",
 p.is_default && "border-amber-400/50 bg-amber-400/5",
 )}
 >
 <CardContent className="grid gap-2 px-4">
 <div className="flex items-start gap-2">
 <StarIcon
 className={cn(
 "mt-0.5 size-4 shrink-0",
 p.is_default ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
 )}
 />
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <span className="truncate font-medium text-sm">{p.name}</span>
 <Badge variant="outline" className="uppercase">
 {p.format}
 </Badge>
 <Badge variant="outline" className={cn("ml-auto", h.cls)} title={h.hint}>
 {h.label}
 </Badge>
 </div>
 <code className="mt-1 block truncate font-mono text-muted-foreground text-xs">{p.model}</code>
 </div>
 </div>

 <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-muted-foreground text-xs">
 {p.api_key_hint && <span>{p.api_key_hint}</span>}
 <span>
 {p.rate_per_second}/s · {p.rate_per_minute}/min
 </span>
 {p.proxy && <span className="truncate">프록시 {p.proxy}</span>}
 {p.reasoning_effort && (
 <span>추론 {p.reasoning_effort === "off" ? "" : p.reasoning_effort}</span>
 )}
 {/* 폴링개필드에서폴링의미，안 */}
 {poolOn &&
 !p.is_default &&
 (p.pool_exclude ? <span>폴링 제외</span> : <span>우선순위 {p.priority ?? 0}</span>)}
 </div>

 <div className="mt-1 flex gap-2">
 <Button
 size="sm"
 variant="outline"
 className="flex-1"
 disabled={p.is_default}
 onClick={(e) => {
 e.stopPropagation();
 void activate(p.id, p.name);
 }}
 >
 {p.is_default ? "활성" : "를활성"}
 </Button>
 <Button
 size="icon"
 variant="outline"
 aria-label="삭제구성"
 onClick={(e) => {
 e.stopPropagation();
 void remove(p);
 }}
 >
 <Trash2Icon className="text-destructive" />
 </Button>
 </div>
 </CardContent>
 </Card>
 );
 })}
 {profiles.length === 0 && (
 <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
 없음모델구성，클릭우상「새로 생성」생성첫개。
 </div>
 )}
 </div>
 </TabsContent>

 <TabsContent value="retry" className="mt-4">
 <RetryPolicyPanel />
 </TabsContent>
 </Tabs>

 <ProfileSheet profile={editing} open={editOpen} onOpenChange={setEditOpen} onSaved={() => void load()} />
 <PoolSheet open={poolOpen} onOpenChange={setPoolOpen} pool={pool} onReload={loadPool} />
 </div>
 );
}
