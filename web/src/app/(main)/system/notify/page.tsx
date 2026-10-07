"use client";

import * as React from "react";

import { BellIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { NotificationChannel, NotificationFilter, NotificationMeta } from "@/lib/types";

import {
 CHANNEL_FIELDS,
 type ChannelForm,
 emptyForm,
 KIND_LABEL,
 parseIDs,
 parseKeywords,
 parseKV,
 SEVERITY_OPTIONS,
} from "./_components/channel-fields";
import { ConfigField, FilterSummary } from "./_components/channel-form";
import { DeliveryList } from "./_components/delivery-list";
import { formatBacklog, StatTile } from "./_components/stat-tile";

// 이페이지：불러오기데이터、단상태、호출API。
// 필드·파싱에서 _components/channel-fields.ts，·요약에서
// _components/channel-form.tsx，전달기록에서 _components/delivery-list.tsx——
// 는때문그것각각단，에서개파일개페이지 1100 행。
export default function NotifyPage() {
 const [meta, setMeta] = React.useState<NotificationMeta | null>(null);
 const [channels, setChannels] = React.useState<NotificationChannel[]>([]);
 const [tab, setTab] = React.useState<"channels" | "deliveries">("channels");

 const [open, setOpen] = React.useState(false);
 const [editing, setEditing] = React.useState<NotificationChannel | null>(null);
 const [form, setForm] = React.useState<ChannelForm>(emptyForm("dingtalk"));
 const [saving, setSaving] = React.useState(false);
 const [testing, setTesting] = React.useState(false);

 const [globalSaving, setGlobalSaving] = React.useState(false);
 const [baseURL, setBaseURL] = React.useState("");
 const [digestMin, setDigestMin] = React.useState("");

 const load = React.useCallback(() => {
 api
 .notifyMeta()
 .then((m) => {
 setMeta(m);
 setBaseURL(m.public_base_url);
 setDigestMin(m.digest_interval_min);
 })
 .catch((e) => toast.error("읽기푸시구성실패：" + (e as Error).message));
 // 채널목록불러오기 실패：실패표시「개채널없음」，
 // 를구성，직접오류。
 api
 .notifyChannels()
 .then(setChannels)
 .catch((e) => toast.error("읽기채널목록실패：" + (e as Error).message));
 }, []);
 React.useEffect(() => {
 load();
 }, [load]);

 function setF(patch: Partial<ChannelForm>) {
 setForm((f) => ({ ...f, ...patch }));
 }
 function setCfg(key: string, value: unknown) {
 setForm((f) => ({ ...f, config: { ...f.config, [key]: value } }));
 }

 function openAdd() {
 setEditing(null);
 setForm(emptyForm(meta?.kinds[0]?.kind ?? "dingtalk"));
 setOpen(true);
 }

 function openEdit(ch: NotificationChannel) {
 setEditing(ch);
 // filter 에서후는 Go 구조，열대상（않음는 null），따라서안 필요폴백。
 const f = ch.filter;
 setForm({
 name: ch.name,
 kind: ch.kind,
 mode: ch.mode,
 enabled: ch.enabled,
 ratePerMin: String(ch.rate_per_min),
 // 후반환 config 자격 증명는코드값；그대로단，제출그대로，
 // 후이보존중값。
 config: { ...ch.config },
 minSeverity: f.min_severity ?? "",
 includeText: (f.vulnclass_include ?? []).join("\n"),
 excludeText: (f.vulnclass_exclude ?? []).join("\n"),
 taskIDsText: (f.task_ids ?? []).join(","),
 assetIDsText: (f.asset_ids ?? []).join(","),
 onStatusChange: f.on_status_change ?? false,
 });
 setOpen(true);
 }

 // buildConfig 단상태채널 config。
 //
 // 유일규칙，유형값：
 // - 코드값（"__masked__..."）그대로 → 후를「개필드없음，보존중값」
 // - 그입력제출，「비우기해당필드」
 //
 // 따라서안 자격 증명필드（예:「자격 증명비우기」），는때문**불가지우기**
 // 개——상없음임의작업「」。에서규칙하，
 // 비우기입력 같음비우기해당필드，유일제어 가능。
 // 코드값않음에서입력（ ConfigField），따라서「글자」 같음
 // 「주」。
 function buildConfig(): Record<string, unknown> {
 const defs = CHANNEL_FIELDS[form.kind] ?? [];
 const out: Record<string, unknown> = {};
 for (const d of defs) {
 const raw = form.config[d.key];
 if (d.kind === "switch") {
 out[d.key] = raw === true;
 continue;
 }
 if (typeof raw === "string" && raw.startsWith("__masked__")) {
 out[d.key] = raw;
 continue;
 }
 if (d.kind === "number") {
 const n = Number(raw);
 out[d.key] = Number.isFinite(n) && n > 0 ? n : 0;
 continue;
 }
 if (d.kind === "kv") {
 out[d.key] = parseKV(String(raw ?? ""));
 continue;
 }
 if (d.kind === "list") {
 out[d.key] = String(raw ?? "")
 .split(/[\s,，]+/)
 .map((s) => s.trim())
 .filter(Boolean);
 continue;
 }
 out[d.key] = String(raw ?? "").trim();
 }
 return out;
 }

 function buildFilter(): NotificationFilter {
 return {
 min_severity: form.minSeverity || undefined,
 vulnclass_include: parseKeywords(form.includeText),
 vulnclass_exclude: parseKeywords(form.excludeText),
 task_ids: parseIDs(form.taskIDsText),
 asset_ids: parseIDs(form.assetIDsText),
 on_status_change: form.onStatusChange,
 };
 }

 async function saveForm() {
 if (!form.name.trim()) {
 toast.error("입력하세요채널이름");
 return;
 }
 setSaving(true);
 try {
 const payload = {
 name: form.name.trim(),
 kind: form.kind,
 mode: form.mode,
 enabled: form.enabled,
 config: buildConfig(),
 filter: buildFilter(),
 rate_per_min: form.ratePerMin.trim() === "" ? undefined : Number(form.ratePerMin),
 };
 if (editing) {
 await api.notifyUpdateChannel(editing.id, payload);
 toast.success("저장");
 setOpen(false);
 } else {
 await api.notifyCreateChannel(payload);
 toast.success("추가채널");
 setOpen(false);
 }
 load();
 } catch (e) {
 toast.error("저장 실패: " + (e as Error).message);
 } finally {
 setSaving(false);
 }
 }

 async function testChannel() {
 if (!editing) return;
 setTesting(true);
 try {
 const r = await api.notifyTestChannel(editing.id);
 toast.success(`테스트메시지（${r.latency_ms} ms），까지확인`);
 } catch (e) {
 // 후채널반환오류예:，는구성유일，그대로표시。
 toast.error("테스트실패：" + (e as Error).message, { duration: 12000 });
 } finally {
 setTesting(false);
 }
 }

 async function removeChannel(ch: NotificationChannel) {
 try {
 await api.notifyDeleteChannel(ch.id);
 toast.success(`삭제：${ch.name}`);
 setOpen(false);
 load();
 } catch (e) {
 toast.error("삭제 실패: " + (e as Error).message);
 }
 }

 async function toggleEnabled(ch: NotificationChannel) {
 try {
 await api.notifyUpdateChannel(ch.id, { enabled: !ch.enabled });
 load();
 } catch (e) {
 toast.error("작업실패：" + (e as Error).message);
 }
 }

 async function toggleGlobal(on: boolean) {
 setGlobalSaving(true);
 try {
 await api.setSettings({ notify_enabled: on });
 setMeta((m) => (m ? { ...m, enabled: on } : m));
 toast.success(on ? "푸시 활성화됨" : "푸시 일시정지됨");
 } catch (e) {
 toast.error("작업실패：" + (e as Error).message);
 } finally {
 setGlobalSaving(false);
 }
 }

 async function saveGlobal() {
 setGlobalSaving(true);
 try {
 const patch: Record<string, unknown> = { notify_public_base_url: baseURL.trim() };
 const n = Number(digestMin);
 if (Number.isFinite(n) && n > 0) patch.notify_digest_interval_min = n;
 await api.setSettings(patch);
 toast.success("저장");
 load();
 } catch (e) {
 toast.error("저장 실패: " + (e as Error).message);
 } finally {
 setGlobalSaving(false);
 }
 }

 const fields = CHANNEL_FIELDS[form.kind] ?? [];
 const secretKeys = new Set(meta?.kinds.find((k) => k.kind === form.kind)?.secret_keys ?? []);
 const defaultRate = meta?.kinds.find((k) => k.kind === form.kind)?.default_rate_per_min ?? 0;

 return (
 <div className="flex flex-1 flex-col gap-4 md:gap-6">
 <div className="flex items-start justify-between gap-4">
 <div>
 <h1 className="text-xl font-semibold tracking-tight">알림푸시</h1>
 <p className="text-muted-foreground text-sm">
 발견취약점푸시까지 / / 기업 외채널 · 매개채널독립푸시·규칙
 </p>
 </div>
 {meta && (
 // div 안 는 label：Switch aria-label，외 label
 // 연관안 까지임의，클릭글자해야전환。
 <div className="flex shrink-0 items-center gap-2 text-sm">
 <span className="text-muted-foreground">전체 토글</span>
 <Switch
 checked={meta.enabled}
 disabled={globalSaving}
 onCheckedChange={toggleGlobal}
 aria-label="푸시전체 토글"
 />
 </div>
 )}
 </div>

 {meta && (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
 <StatTile label="채널" value={`${meta.stats.channels_on} / ${meta.stats.channels}`} hint="활성화 / 수" />
 <StatTile label="" value={String(meta.stats.sent_today)} />
 <StatTile label="전송 대기" value={String(meta.stats.pending)} />
 <StatTile label="실패" value={String(meta.stats.failed)} tone={meta.stats.failed > 0 ? "red" : undefined} />
 <StatTile
 label=""
 value={formatBacklog(meta.stats.backlog_age_ms)}
 // 건수다： 3 건가능는부터 3 초까지 3 소。
 hint={meta.stats.backlog_age_ms > 5 * 60_000 ? "푸시가능" : undefined}
 tone={meta.stats.backlog_age_ms > 5 * 60_000 ? "red" : undefined}
 />
 </div>
 )}

 <Card className="gap-3">
 <CardHeader>
 <CardTitle className="text-base">전역설정</CardTitle>
 </CardHeader>
 <CardContent className="grid gap-4 sm:grid-cols-2">
 <div className="grid gap-2">
 <Label htmlFor="n-base">주소</Label>
 <Input
 id="n-base"
 placeholder="https://artex.example.com"
 value={baseURL}
 onChange={(e) => setBaseURL(e.target.value)}
 />
 <p className="text-muted-foreground text-xs">메시지「보기상세」버튼로주소。비우기안 버튼。</p>
 </div>
 <div className="grid gap-2">
 <Label htmlFor="n-digest">요약（분）</Label>
 <Input
 id="n-digest"
 type="number"
 min={1}
 max={1440}
 placeholder="30"
 value={digestMin}
 onChange={(e) => setDigestMin(e.target.value)}
 />
 <p className="text-muted-foreground text-xs">대상「요약」모드채널적용。</p>
 </div>
 <div className="sm:col-span-2">
 <Button onClick={saveGlobal} disabled={globalSaving}>
 저장전역설정
 </Button>
 </div>
 </CardContent>
 </Card>

 <Tabs value={tab} onValueChange={(v) => setTab(v as "channels" | "deliveries")} className="flex flex-col gap-4">
 <TabsList>
 <TabsTrigger value="channels">채널</TabsTrigger>
 <TabsTrigger value="deliveries">전달기록</TabsTrigger>
 </TabsList>

 <TabsContent value="channels">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
 <button
 type="button"
 onClick={openAdd}
 className="text-foreground/70 border-foreground/70 hover:bg-muted/60 hover:shadow-sm flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition"
 >
 <PlusIcon className="size-6" />
 <span className="text-sm">추가채널</span>
 </button>

 {channels.map((ch) => (
 <Card
 key={ch.id}
 onClick={() => openEdit(ch)}
 className="hover:border-primary/60 cursor-pointer gap-3 transition hover:shadow-sm"
 >
 <CardHeader>
 <div className="flex items-center gap-2">
 <BellIcon className="text-muted-foreground size-4 shrink-0" />
 <CardTitle className="truncate text-base">{ch.name}</CardTitle>
 {/* 카드전체（진입편집），따라서개필수각각，
 그렇지 않으면토글/삭제트리거편집。 stopPropagation 에서
 상，안 는 div： div 개「상호작용없음
 」，트리거 a11y ，상안 。 */}
 <div className="ml-auto flex items-center gap-2">
 <Switch
 checked={ch.enabled}
 onCheckedChange={() => toggleEnabled(ch)}
 onClick={(e) => e.stopPropagation()}
 aria-label="활성화"
 />
 <Button
 size="icon"
 variant="outline"
 aria-label="삭제"
 onClick={(e) => {
 e.stopPropagation();
 // void Promise：removeChannel catch toast，
 // 여기안 필요 await（onClick 안 는 async）。
 void removeChannel(ch);
 }}
 >
 <Trash2Icon className="text-destructive" />
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent className="grid gap-3">
 <div className="flex flex-wrap items-center gap-2">
 <Badge variant="outline">{KIND_LABEL[ch.kind] ?? ch.kind}</Badge>
 <Badge variant="outline">{ch.mode === "digest" ? "요약" : "실시간"}</Badge>
 {!ch.enabled && <Badge variant="outline">비활성</Badge>}
 </div>
 <FilterSummary filter={ch.filter} />
 </CardContent>
 </Card>
 ))}
 </div>
 </TabsContent>

 <TabsContent value="deliveries">
 <DeliveryList channels={channels} />
 </TabsContent>
 </Tabs>

 <Sheet open={open} onOpenChange={setOpen}>
 <SheetContent side="right" className="w-full data-[side=right]:sm:max-w-lg">
 <SheetHeader>
 <SheetTitle>{editing ? editing.name : "추가알림채널"}</SheetTitle>
 <SheetDescription>
 {KIND_LABEL[form.kind] ?? form.kind}
 {defaultRate > 0 ? ` · 기본속도 제한 ${defaultRate} 건/분` : " · 제한 없음"}
 </SheetDescription>
 </SheetHeader>

 <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
 <div className="grid gap-4 py-4">
 <div className="grid gap-2">
 <Label>채널유형</Label>
 <Select
 value={form.kind}
 onValueChange={(v) => {
 // 유형 같음세트자격 증명필드，불가구구성。
 setF({ kind: v, config: {} });
 }}
 disabled={!!editing}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {(meta?.kinds ?? []).map((k) => (
 <SelectItem key={k.kind} value={k.kind}>
 {KIND_LABEL[k.kind] ?? k.kind}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {editing && (
 <p className="text-muted-foreground text-xs">
 채널유형안 변경——유형 같음세트자격 증명，새로 생성채널。
 </p>
 )}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="n-name">채널이름</Label>
 <Input
 id="n-name"
 placeholder="응답 / 브로드캐스트"
 value={form.name}
 onChange={(e) => setF({ name: e.target.value })}
 />
 </div>

 {fields.length === 0 ? (
 <p className="text-muted-foreground text-sm">
 해당채널단아직（전 CHANNEL_FIELDS 건），전체후。
 </p>
 ) : (
 fields.map((d) => (
 <ConfigField
 key={d.key}
 def={d}
 value={form.config[d.key]}
 isSecret={secretKeys.has(d.key)}
 onChange={(v) => setCfg(d.key, v)}
 />
 ))
 )}

 <div className="grid gap-2">
 <Label>푸시</Label>
 <Select value={form.mode} onValueChange={(v) => setF({ mode: v as "realtime" | "digest" })}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="realtime">실시간 · 매건취약점단건</SelectItem>
 <SelectItem value="digest">요약 · 건</SelectItem>
 </SelectContent>
 </Select>
 <p className="text-muted-foreground text-xs">
 「높음실시간、그요약」개채널：개실시간 + 높음，개요약 + 제한 없음급。
 </p>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="n-rate">속도 제한（건/분）</Label>
 <Input
 id="n-rate"
 type="number"
 min={0}
 placeholder={defaultRate > 0 ? String(defaultRate) : "0 = 제한 없음"}
 value={form.ratePerMin}
 onChange={(e) => setF({ ratePerMin: e.target.value })}
 />
 <p className="text-muted-foreground text-xs">
 비우기채널기본값；0 표시제한 없음。않음메시지，전송。
 </p>
 </div>

 <div className="border-t pt-4">
 <p className="mb-3 text-sm font-medium">규칙（비우기안 ）</p>
 <div className="grid gap-4">
 <div className="grid gap-2">
 <Label>낮급</Label>
 <Select
 value={form.minSeverity || "all"}
 onValueChange={(v) => setF({ minSeverity: v === "all" ? "" : v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {SEVERITY_OPTIONS.map((o) => (
 <SelectItem key={o.value || "all"} value={o.value || "all"}>
 {o.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="grid gap-2">
 <Label htmlFor="n-inc">취약점유형</Label>
 <Textarea
 id="n-inc"
 placeholder={"SQL인젝션\n명령실행"}
 value={form.includeText}
 onChange={(e) => setF({ includeText: e.target.value })}
 />
 <p className="text-muted-foreground text-xs">
 매행개키워드，대소안 일치。비우기=전체유형。
 </p>
 </div>
 <div className="grid gap-2">
 <Label htmlFor="n-exc">제외취약점유형</Label>
 <Textarea
 id="n-exc"
 placeholder={"정보노출"}
 value={form.excludeText}
 onChange={(e) => setF({ excludeText: e.target.value })}
 />
 <p className="text-muted-foreground text-xs">제외우선에포함：매칭제외。</p>
 </div>
 <div className="grid gap-2">
 <Label htmlFor="n-tasks">작업 ID</Label>
 <Input
 id="n-tasks"
 placeholder="1, 2, 3"
 value={form.taskIDsText}
 onChange={(e) => setF({ taskIDsText: e.target.value })}
 />
 </div>
 <div className="grid gap-2">
 <Label htmlFor="n-assets">자산 ID</Label>
 <Input
 id="n-assets"
 placeholder="10, 11"
 value={form.assetIDsText}
 onChange={(e) => setF({ assetIDsText: e.target.value })}
 />
 <p className="text-muted-foreground text-xs">작업/자산비우기=제한 없음；입력후·취약점。</p>
 </div>
 <div className="flex items-center gap-2 text-sm">
 <Switch
 checked={form.onStatusChange}
 onCheckedChange={(v) => setF({ onStatusChange: v })}
 aria-label="상태"
 />
 취약점상태푸시（실시간모드）
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 text-sm">
 <Switch checked={form.enabled} onCheckedChange={(v) => setF({ enabled: v })} aria-label="활성화" />
 활성화해당채널
 </div>
 </div>

 <div className="flex gap-2 pt-2 pb-6">
 <Button onClick={saveForm} disabled={saving}>
 {editing ? "저장" : "추가"}
 </Button>
 {editing && (
 <Button variant="outline" onClick={testChannel} disabled={testing}>
 <SendIcon /> 전송테스트메시지
 </Button>
 )}
 </div>
 </div>
 </SheetContent>
 </Sheet>
 </div>
 );
}
