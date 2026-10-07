"use client";

// LLM 재시도구성：재시도각각「횟수 + 간격」。
//
// 부터내까지외：(SDK) → 응답(SDK) → provider 전체창 → 폴링차단 → 의도재실행。
// 전엔드포인트，따라서매개모델구성커버전역기본；후는급，전역。
//
// 전체입력세트「비우기 = 안 구성」，백엔드와 db.RetryRule 일치：
// 횟수 /0 = 내장 사용기본 | -1 = 꺼짐이 레이어재시도 | >0 = 개횟수
// 간격 /0 = 이 레이어이수백오프 | >0 = 개고정초간격

import * as React from "react";

import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { LLMRetryOverride, LLMRetryPolicy, LLMRetryRule } from "@/lib/types";

export const ZERO_RULE: LLMRetryRule = { attempts: 0, interval_ms: 0 };
export const ZERO_OVERRIDE: LLMRetryOverride = {
 connect: ZERO_RULE,
 empty: ZERO_RULE,
 stream: ZERO_RULE,
};
const ZERO_POLICY: LLMRetryPolicy = {
 ...ZERO_OVERRIDE,
 breaker: ZERO_RULE,
 intent: ZERO_RULE,
};

type LayerMeta = {
 title: string;
 /** 이 레이어재시도발생에서、에 의해실행 */
 where: string;
 /** 무엇오류까지이 레이어——까지상태 코드， */
 trigger: string;
 /** 【안 】이 레이어오류，없음를는 bug */
 skips?: string;
 desc: string;
 attemptsLabel: string;
 /** 횟수비우기기본값，에 */
 defAttempts: number;
 /** 간격비우기기본정책，에 */
 defInterval: string;
 /** 횟수 -1 */
 offHint: string;
};

export const RETRY_LAYERS = {
 connect: {
 title: "재시도",
 where: "SDK · 까지 200 이전",
 trigger:
 "안 상또는없음까지 200：연결리셋 / 타임아웃 / DNS 실패 외오류，및 HTTP 408、429、500、502、503、504。",
 skips: "그상태 코드（400 / 401 / 403 / 404 / 413 / 422 외）는확인거부，실패，직접상。",
 desc: "그대로개요청。시작（이미까지 200），중안 이 레이어。",
 attemptsLabel: "재시도횟수",
 defAttempts: 3,
 defInterval: "0.5s→1s→2s 수（ 8s）",
 offHint: "-1 = 한 번안 재시도，실패상",
 },
 empty: {
 title: "응답재시도",
 where: "SDK · openai 형식",
 trigger:
 "HTTP 200、finish_reason 는정상 stop，건응답개내없음——、추론필드、。",
 skips: " max_tokens 없음내안 （높출력상，한 번）。",
 desc: "개 prompt，따라서에서컨텍스트상，횟수안 에대。",
 attemptsLabel: "재시도횟수",
 defAttempts: 2,
 defInterval: "0.5s→1s→2s 수（ 8s）",
 offHint: "-1 = 응답직접그대로",
 },
 stream: {
 title: " provider 전체창재시도",
 where: "이건 · 미출력전",
 trigger:
 "이미구축（까지 200）이후：연결중、 overloaded、내 429 / 5xx 오류——개 token 없음에호출。",
 skips:
 "도소진（402 / insufficient_quota，에폴링구성）、컨텍스트（413 / context length，에압축）、400 / 401 / 403 / 404 / 422 확인거부，안 재시도。",
 desc: "에서개구성상개요청。때문없음임의출력，않음중복모델출력또는도구실행。",
 attemptsLabel: "재시도횟수",
 defAttempts: 2,
 defInterval: "0.5s→1s 수（ 4s）",
 offHint: "-1 = 직접에외의도재실행",
 },
 breaker: {
 title: "폴링차단",
 where: "이건 · 급，전역",
 trigger:
 "실패（429、5xx、오류）연속까지값차단；잔액안 （402）、만료（401 / 403）、모델존재하지 않음（404）유형확인실패안 값，한 번차단。",
 skips: "성공한 번，따라서구성않음까지차단。",
 desc: "차단후쿨다운，쿨다운내폴링직접개구성。상태，안 。",
 attemptsLabel: "연속실패차차단",
 defAttempts: 3,
 defInterval: "1min→5min→30min 도",
 offHint: "-1 = 실패안 차단（확인실패차단）",
 },
 intent: {
 title: "의도재실행",
 where: "이건 · 급，전역",
 trigger:
 "전없음：worker model_error ——내재시도전체，또는이미시작출력후（안 전체，만건）。",
 skips: "도소진이미에 의해폴링구성，안 에서여기재실행；작업일시정지 / / 진입즉시，안 백오프시각。",
 desc: "건의도부터。는외，한 번재실행횟수。",
 attemptsLabel: "재실행횟수",
 defAttempts: 2,
 defInterval: "고정 3s",
 offHint: "-1 = 안 재실행，해당의도직접를 blocked",
 },
} satisfies Record<string, LayerMeta>;

type LayerKey = keyof typeof RETRY_LAYERS;

/** 초，에에서입력반환，수。 */
function humanMs(ms: number) {
 if (!Number.isFinite(ms) || ms <= 0) return "";
 if (ms < 1000) return `${ms}ms`;
 if (ms < 60_000) return `${Number((ms / 1000).toFixed(2))}s`;
 return `${Number((ms / 60_000).toFixed(2))}min`;
}

/** 수글자입력： ↔ 0，중（"-"、"1e"）그대로에서이，안 급。 */
function NumField({
 id,
 value,
 onChange,
 placeholder,
 min,
}: {
 id: string;
 value: number;
 onChange: (n: number) => void;
 placeholder: string;
 min: number;
}) {
 const [text, setText] = React.useState(value === 0 ? "" : String(value));
 // 급값（읽기까지정책、전환구성）상；글자않음까지여기，
 // 때문 value 이미 같음이이 parse 후。
 React.useEffect(() => {
 const incoming = value === 0 ? "" : String(value);
 setText((cur) => (Number(cur || 0) === value ? cur : incoming));
 }, [value]);
 return (
 <Input
 id={id}
 type="number"
 min={min}
 className="w-28 shrink-0"
 value={text}
 placeholder={placeholder}
 onChange={(e) => {
 setText(e.target.value);
 const n = Number(e.target.value);
 onChange(e.target.value.trim() === "" || !Number.isFinite(n) ? 0 : Math.trunc(n));
 }}
 />
 );
}

/** 재시도개。idPrefix 에서페이지다차 label htmlFor。 */
export function RetryRuleFields({
 layer,
 idPrefix,
 value,
 onChange,
 compact,
}: {
 layer: LayerKey;
 idPrefix: string;
 value: LLMRetryRule;
 onChange: (r: LLMRetryRule) => void;
 /** true = 구성드로어：펼치기설명，「무엇오류까지이 레이어」 */
 compact?: boolean;
}) {
 const meta = RETRY_LAYERS[layer];
 const human = humanMs(value.interval_ms);
 return (
 <div className={compact ? "grid gap-2" : "grid gap-3 rounded-lg border p-3"}>
 <div className="grid gap-0.5">
 <div className="flex flex-wrap items-baseline gap-2">
 <Label className="text-sm">{meta.title}</Label>
 <span className="text-muted-foreground text-xs">{meta.where}</span>
 </div>
 {/* 어느오류까지이 레이어，까지상태 코드——안 까지，다는오류안 에서이 레이어。 */}
 <p className="text-muted-foreground text-xs">
 <span className="font-medium text-foreground">트리거</span>：{meta.trigger}
 </p>
 {!compact && meta.skips && (
 <p className="text-muted-foreground text-xs">
 <span className="font-medium text-foreground">안 이 레이어</span>：{meta.skips}
 </p>
 )}
 {!compact && <p className="text-muted-foreground text-xs">{meta.desc}</p>}
 </div>
 <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
 <div className="flex items-center gap-2">
 <Label htmlFor={`${idPrefix}-${layer}-n`} className="text-muted-foreground text-xs">
 {meta.attemptsLabel}
 </Label>
 <NumField
 id={`${idPrefix}-${layer}-n`}
 min={-1}
 value={value.attempts}
 placeholder={`기본 ${meta.defAttempts}`}
 onChange={(n) => onChange({ ...value, attempts: n })}
 />
 </div>
 <div className="flex items-center gap-2">
 <Label htmlFor={`${idPrefix}-${layer}-ms`} className="text-muted-foreground text-xs">
 간격 ms
 </Label>
 <NumField
 id={`${idPrefix}-${layer}-ms`}
 min={0}
 value={value.interval_ms}
 placeholder="기본백오프"
 onChange={(n) => onChange({ ...value, interval_ms: n })}
 />
 <span className="text-muted-foreground text-xs">{human ? `고정 ${human}` : meta.defInterval}</span>
 </div>
 </div>
 {!compact && <p className="text-muted-foreground text-xs">비우기 = 기본；{meta.offHint}。</p>}
 </div>
 );
}

/** 모델구성드로어커버（엔드포인트）。 */
export function ProfileRetryFields({
 value,
 onChange,
}: {
 value: LLMRetryOverride;
 onChange: (o: LLMRetryOverride) => void;
}) {
 return (
 <div className="grid gap-3 rounded-lg border p-3">
 <div className="grid gap-0.5">
 <Label className="text-sm">재시도커버</Label>
 <p className="text-muted-foreground text-xs">
 대상개구성적용，커버「재시도·백오프」전역기본。매비우기 = 따름전역；횟수 -1 = 닫기이 레이어재시도；
 간격고정간격수백오프。차단·의도재실행는급，만에서전역페이지。
 </p>
 </div>
 {(["connect", "empty", "stream"] as const).map((k) => (
 <div key={k} className="border-t pt-3 first:border-t-0 first:pt-0">
 <RetryRuleFields
 compact
 layer={k}
 idPrefix="pf"
 value={value[k]}
 onChange={(r) => onChange({ ...value, [k]: r })}
 />
 </div>
 ))}
 </div>
 );
}

/** 「재시도·백오프」tab：전역기본값。 */
export function RetryPolicyPanel() {
 const [policy, setPolicy] = React.useState<LLMRetryPolicy>(ZERO_POLICY);
 const [loading, setLoading] = React.useState(true);
 const [saving, setSaving] = React.useState(false);

 const load = React.useCallback(async () => {
 setLoading(true);
 try {
 const p = await api.llmRetryPolicy();
 setPolicy({ ...ZERO_POLICY, ...p });
 } catch (e) {
 toast.error(`읽기재시도정책실패：${(e as Error).message}`);
 } finally {
 setLoading(false);
 }
 }, []);

 React.useEffect(() => {
 void load();
 }, [load]);

 async function save() {
 if (saving) return;
 setSaving(true);
 try {
 // 후값，직접값새로고침，。
 const saved = await api.saveLLMRetryPolicy(policy);
 setPolicy({ ...ZERO_POLICY, ...saved });
 toast.success("저장，적용（진행 중호출구매개변수）");
 } catch (e) {
 toast.error(`저장 실패: ${(e as Error).message}`);
 } finally {
 setSaving(false);
 }
 }

 const set = (k: LayerKey) => (r: LLMRetryRule) => setPolicy((p) => ({ ...p, [k]: r }));

 if (loading) {
 return (
 <div className="flex items-center gap-2 rounded-lg border border-dashed p-10 text-muted-foreground text-sm">
 <Loader2Icon className="size-4 animate-spin" /> 읽기재시도정책…
 </div>
 );
 }

 return (
 <div className="grid gap-4">
 <div className="rounded-lg border bg-muted/30 p-3 text-muted-foreground text-xs leading-relaxed">
 한 번모델호출실패차재시도，에 의해내까지외：
 <span className="text-foreground"> → 응답 → provider 전체창 → 폴링차단 → 의도재실행</span>
 。내까지외，따라서횟수는
 <span className="text-foreground"></span>
 ——매，한 번차요청。
 전체비우기현재기본값，·없음페이지행를전체일치。전가능에서매개모델구성단커버。
 </div>

 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
 {(Object.keys(RETRY_LAYERS) as LayerKey[]).map((k) => (
 <RetryRuleFields key={k} layer={k} idPrefix="gl" value={policy[k]} onChange={set(k)} />
 ))}
 </div>

 <div className="flex gap-2">
 <Button onClick={save} disabled={saving}>
 {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
 저장
 </Button>
 <Button variant="outline" onClick={() => setPolicy(ZERO_POLICY)} disabled={saving}>
 전체기본값 복원
 </Button>
 </div>
 </div>
 );
}
