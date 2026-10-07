"use client";

import * as React from "react";

import { CpuIcon, FlaskConicalIcon, KeyboardIcon, RadioTowerIcon, SearchIcon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { CHAT_SEND_MODE_OPTIONS, type ChatSendMode, setChatSendMode, useChatSendMode } from "@/lib/chat-send-mode";
import type { Settings } from "@/lib/types";

import { UpdateCard } from "./_components/update-card";

export default function SystemSettingsPage() {
 const [trafficCapture, setTrafficCapture] = React.useState(false);
 const [agentTrafficBinding, setAgentTrafficBinding] = React.useState(false);
 const [webSearch, setWebSearch] = React.useState(false);
 const [backend, setBackend] = React.useState("ddgs");
 const [braveKeySet, setBraveKeySet] = React.useState(false);
 const [braveKeyInput, setBraveKeyInput] = React.useState("");
 const [tavilyKeySet, setTavilyKeySet] = React.useState(false);
 const [tavilyKeyInput, setTavilyKeyInput] = React.useState("");
 const [savingTavilyKey, setSavingTavilyKey] = React.useState(false);
 const [proxyInput, setProxyInput] = React.useState("");
 const [savingProxy, setSavingProxy] = React.useState(false);
 const [globalProxyInput, setGlobalProxyInput] = React.useState("");
 const [savingGlobalProxy, setSavingGlobalProxy] = React.useState(false);
 const [testing, setTesting] = React.useState(false);
 const [loaded, setLoaded] = React.useState(false);
 const [saving, setSaving] = React.useState(false);
 const [savingKey, setSavingKey] = React.useState(false);
 const [pyInterp, setPyInterp] = React.useState("");
 const [workers, setWorkers] = React.useState("3");
 const [savingWorkers, setSavingWorkers] = React.useState(false);
 // 작업 제약인젝션범위(기본)。
 const [injectPlanner, setInjectPlanner] = React.useState(true);
 const [injectWorker, setInjectWorker] = React.useState(true);
 // 기능:noa 컨텍스트 압축(기본)。
 const [noaCompaction, setNoaCompaction] = React.useState(false);
 // 전：안 /api/settings，직접 localStorage。
 const sendMode = useChatSendMode();

 const apply = React.useCallback((s: Settings) => {
 setTrafficCapture(!!s.traffic_capture);
 setAgentTrafficBinding(!!s.agent_traffic_binding);
 setWebSearch(!!s.web_search_enabled);
 setBackend(s.web_search_backend || "ddgs");
 setBraveKeySet(!!s.brave_key_set);
 setTavilyKeySet(!!s.tavily_key_set);
 setProxyInput(s.web_search_proxy ?? "");
 setGlobalProxyInput(s.global_proxy ?? "");
 setPyInterp(s.python_interpreter ?? "");
 setWorkers(String(s.workers ?? 3));
 setInjectPlanner(s.constraints_inject_planner !== false);
 setInjectWorker(s.constraints_inject_worker !== false);
 setNoaCompaction(!!s.noa_compaction);
 }, []);

 const saveWorkers = () => {
 const n = Number(workers);
 if (!Number.isInteger(n) || n <= 0) {
 toast.error("동시 실행 수는 0보다 큰 정수여야 합니다");
 return;
 }
 setSavingWorkers(true);
 api
 .setSettings({ workers: n })
 .then((s) => {
 apply(s);
 toast.success("동시 worker agent 수가 저장됨(이후 시작하는 작업에 적용)");
 })
 .catch((e) => toast.error("저장 실패: " + (e as Error).message))
 .finally(() => setSavingWorkers(false));
 };

 const savePython = () => {
 setSaving(true);
 api
 .setSettings({ python_interpreter: pyInterp.trim() })
 .then((s) => {
 apply(s);
 toast.success("Python 인터프리터 설정이 저장됨");
 })
 .catch((e) => toast.error("저장 실패: " + (e as Error).message))
 .finally(() => setSaving(false));
 };
 const detectPython = () => {
 setSaving(true);
 api
 .detectPython()
 .then((r) => setPyInterp(r.python_interpreter))
 .catch(() => undefined)
 .finally(() => setSaving(false));
 };

 React.useEffect(() => {
 api
 .settings()
 .then(apply)
 .catch(() => undefined)
 .finally(() => setLoaded(true));
 }, [apply]);

 const toggleTraffic = (v: boolean) => {
 setTrafficCapture(v); // optimistic
 setSaving(true);
 api
 .setSettings({ traffic_capture: v })
 .then(apply)
 .catch(() => setTrafficCapture(!v)) // revert on failure
 .finally(() => setSaving(false));
 };

 const toggleInjectPlanner = (v: boolean) => {
 setInjectPlanner(v); // optimistic
 api
 .setSettings({ constraints_inject_planner: v })
 .then(apply)
 .catch(() => setInjectPlanner(!v)); // revert on failure
 };

 const toggleAgentTrafficBinding = (v: boolean) => {
 setAgentTrafficBinding(v);
 setSaving(true);
 api
 .setSettings({ agent_traffic_binding: v })
 .then((s) => {
 apply(s);
 toast.success(v ? "Agent 자동 트래픽 연결 활성화" : "비Agent 자동 트래픽 연결 활성화");
 })
 .catch((e) => {
 setAgentTrafficBinding(!v);
 toast.error(`저장 실패: ${(e as Error).message}`);
 })
 .finally(() => setSaving(false));
 };

 const toggleInjectWorker = (v: boolean) => {
 setInjectWorker(v); // optimistic
 api
 .setSettings({ constraints_inject_worker: v })
 .then(apply)
 .catch(() => setInjectWorker(!v)); // revert on failure
 };

 const toggleNoaCompaction = (v: boolean) => {
 setNoaCompaction(v); // optimistic
 api
 .setSettings({ noa_compaction: v })
 .then((s) => {
 apply(s);
 toast.success(v ? "noa 컨텍스트 압축 활성화(이후 시작하는 실행에 적용)" : "noa 컨텍스트 압축 비활성화(내장 압축으로 복귀)");
 })
 .catch((e) => {
 setNoaCompaction(!v); // revert on failure
 toast.error(`저장 실패: ${(e as Error).message}`);
 });
 };

 // Persist a web-search patch (enable and/or backend). Optimistic with refetch.
 const saveWebSearch = (patch: Partial<Settings>) => {
 setSaving(true);
 api
 .setSettings(patch)
 .then((s) => {
 apply(s);
 toast.success("웹 검색 설정이 저장됨");
 })
 .catch((e) => {
 toast.error("저장 실패: " + (e as Error).message);
 api
 .settings()
 .then(apply)
 .catch(() => undefined);
 })
 .finally(() => setSaving(false));
 };

 const saveBraveKey = () => {
 setSavingKey(true);
 api
 .setSettings({ brave_search_api_key: braveKeyInput })
 .then((s) => {
 apply(s);
 setBraveKeyInput("");
 toast.success("Brave API 키가 저장됨");
 })
 .catch((e) => toast.error("저장 실패: " + (e as Error).message))
 .finally(() => setSavingKey(false));
 };

 const saveTavilyKey = () => {
 setSavingTavilyKey(true);
 api
 .setSettings({ tavily_search_api_key: tavilyKeyInput })
 .then((s) => {
 apply(s);
 setTavilyKeyInput("");
 toast.success("Tavily API 키가 저장됨");
 })
 .catch((e) => toast.error("저장 실패: " + (e as Error).message))
 .finally(() => setSavingTavilyKey(false));
 };

 const saveProxy = () => {
 setSavingProxy(true);
 api
 .setSettings({ web_search_proxy: proxyInput.trim() })
 .then((s) => {
 apply(s);
 toast.success(proxyInput.trim() ? "아웃바운드 프록시가 저장됨" : "아웃바운드 프록시가 제거됨(직접 연결)");
 })
 .catch((e) => toast.error("저장 실패: " + (e as Error).message))
 .finally(() => setSavingProxy(false));
 };

 const saveGlobalProxy = () => {
 setSavingGlobalProxy(true);
 api
 .setSettings({ global_proxy: globalProxyInput.trim() })
 .then((s) => {
 apply(s);
 toast.success(globalProxyInput.trim() ? "전역 프록시가 저장됨" : "전역 프록시가 제거됨(직접 연결)");
 })
 .catch((e) => toast.error("저장 실패: " + (e as Error).message))
 .finally(() => setSavingGlobalProxy(false));
 };

 // Run a real "test" search ("test") against the CURRENT form values (backend +
 // proxy + entered key), falling back to saved values server-side. Toasts result.
 const runTest = () => {
 setTesting(true);
 api
 .testWebSearch({
 web_search_backend: backend,
 web_search_proxy: proxyInput.trim(),
 brave_search_api_key: braveKeyInput,
 tavily_search_api_key: tavilyKeyInput,
 })
 .then((r) => {
 if (r.ok) toast.success(`검색 테스트 성공 · ${r.backend}에서 ${r.count}건 반환`);
 else toast.error("검색 테스트 실패: " + (r.error || "알 수 없는 오류"));
 })
 .catch((e) => toast.error("검색 테스트 실패: " + (e as Error).message))
 .finally(() => setTesting(false));
 };

 // brave-free selected but no key stored and none being entered → tool stays off.
 const braveNeedsKey = webSearch && backend === "brave-free" && !braveKeySet;

 return (
 <div className="flex flex-1 flex-col gap-4 md:gap-6">
 <div>
 <h1 className="text-xl font-semibold tracking-tight">시스템 설정</h1>
 <p className="text-muted-foreground text-sm">전역 실행·네트워크·검색 관련 토글</p>
 </div>

 {/* Masonry columns: web search card is taller; cards use mb for row gap in column layout. */}
 <div className="columns-1 gap-4 md:gap-6 lg:columns-2">
 <UpdateCard />

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <RadioTowerIcon className="size-4" />
 트래픽 캡처
 </CardTitle>
 <CardDescription>
 켜면 모든 Agent HTTP 트래픽이 기록 프록시를 거쳐 저장되고, Agent에 traffic_search / traffic_get 도구와
 프록시 구성(안내 문구 포함)이 주입됩니다.
 <br />
 꺼짐(기본) 시 임의 트래픽을 기록하지 않습니다. Agent는 프록시 구성·트래픽 도구를 받지 않으며 안내에도
 프록시 내용이 없습니다. 전환 후 Agent가 재구성됩니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="flex items-center justify-between gap-4">
 <Label htmlFor="traffic-capture" className="text-sm font-normal text-muted-foreground">
 {trafficCapture ? "활성화됨 · 트래픽 기록 및 프록시 주입" : "비활성화됨 · 기록·프록시 주입 없음"}
 </Label>
 <Switch
 id="traffic-capture"
 checked={trafficCapture}
 disabled={!loaded || saving}
 onCheckedChange={toggleTraffic}
 />
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <RadioTowerIcon className="size-4" />
 Agent 자동트래픽 연결
 </CardTitle>
 <CardDescription id="agent-traffic-binding-description">
 기본 꺼짐. 켜면 취약점이 저장될 때 보고서 Agent가 대상 HTTP 요청/응답과 연관 트래픽을 검토한 뒤 보고서를
 작성합니다. <b>패킷 조회·추가 도구 호출로 Token이 더 듭니다.</b>
 <br />
 TCP·미캡처·불일치 트래픽이어도 보고서는 작성될 수 있습니다. 이 토글은 트래픽 캡처·수동 연결·저장 증거
 보기에는 영향 없습니다. 다음 Agent 라운드에 적용되며, 꺼면 새 자동 연결은 거부됩니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="flex items-center justify-between gap-4">
 <Label htmlFor="agent-traffic-binding" className="text-sm font-normal text-muted-foreground">
 {agentTrafficBinding ? "활성화됨 · 추가 Token 소비" : "비활성화됨 · 수동 연결만 가능"}
 </Label>
 <Switch
 id="agent-traffic-binding"
 aria-describedby="agent-traffic-binding-description"
 checked={agentTrafficBinding}
 disabled={!loaded || saving}
 onCheckedChange={toggleAgentTrafficBinding}
 />
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <RadioTowerIcon className="size-4" />
 전역프록시
 </CardTitle>
 <CardDescription>
 모든 Agent의 <b>대상 트래픽</b>이 이 프록시로 아웃바운드됩니다(원 IP 숨김 / 피벗).{" "}
 <b>http / https / socks5</b> 지원, <code>user:pass</code> 인증 가능. 비우면 직접 연결.
 <br />
 <b>트래픽 캡처</b>가 켜져 있으면 기록 프록시 <b>앞단</b>에 위치합니다(트래픽은 저장된 뒤 이 프록시로
 나감). 캡처가 꺼져 있으면 bash / WebFetch 등에 직접 주입됩니다. 웹 검색·LLM 프록시는 별도입니다.
 <br />
 <b>참고</b>: socks5만 쓰고 캡처가 꺼져 있으면 일부 CLI 도구는 <code>ALL_PROXY</code>를 무시할 수
 있습니다. socks5가 주 목적이면 트래픽 캡처를 켜 MITM 경로로 안정적으로 적용하는 것을 권장합니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="flex flex-col gap-2">
 <Label htmlFor="global-proxy" className="text-sm font-normal text-muted-foreground">
 프록시주소
 </Label>
 <div className="flex items-center gap-2">
 <Input
 id="global-proxy"
 autoComplete="off"
 placeholder="socks5://user:pass@host:1080 또는 http://host:port（비우기=직접 연결）"
 value={globalProxyInput}
 disabled={!loaded || savingGlobalProxy}
 onChange={(e) => setGlobalProxyInput(e.target.value)}
 />
 <Button type="button" onClick={saveGlobalProxy} disabled={!loaded || savingGlobalProxy}>
 저장
 </Button>
 </div>
 <p className="text-muted-foreground text-xs">
 {globalProxyInput.trim() ? "구성됨 · 전체목표트래픽이프록시아웃바운드" : "미구성 · 목표트래픽직접 연결아웃바운드"}
 </p>
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <ShieldAlertIcon className="size-4" />
 작업 제약인젝션
 </CardTitle>
 <CardDescription>
 켜짐후，매개작업<b>작업 제약</b>（에서작업개요「작업 제약」 allow/deny 건）대상 Agent
 시스템안내，탐색경계（예:「현재포트」「금지브루트포스」）。
 <br />
 제어인젝션까지 <b>（planner）</b>· <b>실행（worker）</b>
 ；기본。전환적용（하읽기），없음 Agent。꺼짐후해당 Agent 더 이상까지제약。
 </CardDescription>
 </CardHeader>
 <CardContent className="flex flex-col gap-4">
 <div className="flex items-center justify-between gap-4">
 <Label htmlFor="inject-planner" className="text-sm font-normal text-muted-foreground">
 인젝션（planner）{injectPlanner ? " · 활성화됨" : " · 비활성화됨"}
 </Label>
 <Switch
 id="inject-planner"
 checked={injectPlanner}
 disabled={!loaded}
 onCheckedChange={toggleInjectPlanner}
 />
 </div>
 <div className="flex items-center justify-between gap-4">
 <Label htmlFor="inject-worker" className="text-sm font-normal text-muted-foreground">
 인젝션실행（worker）{injectWorker ? " · 활성화됨" : " · 비활성화됨"}
 </Label>
 <Switch
 id="inject-worker"
 checked={injectWorker}
 disabled={!loaded}
 onCheckedChange={toggleInjectWorker}
 />
 </div>
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <FlaskConicalIcon className="size-4" />
 실험 기능
 </CardTitle>
 <CardDescription>
 아직 검증 중인 기능입니다. 기본 꺼짐. Agent 동작이 바뀔 수 있으니 영향을 이해한 뒤 켜세요.
 <br />
 <b>noa 컨텍스트 압축</b>: 모델이 긴 대화 이력을 압축합니다(norma v0.4.0). 켜면 planner / worker / 주
 Agent / 대화 Agent가 내장 압축 대신 noa를 사용하고, 원문은 작업 디렉터리에 보관됩니다. 이후 시작하는
 실행에 적용되며 Agent 재시작은 필요 없습니다. 끄면 내장 압축으로 돌아갑니다.
 </CardDescription>
 </CardHeader>
 <CardContent className="flex items-center justify-between gap-4">
 <Label htmlFor="noa-compaction" className="text-sm font-normal text-muted-foreground">
 noa 컨텍스트 압축{noaCompaction ? " · 활성화됨" : " · 비활성화됨"}
 </Label>
 <Switch
 id="noa-compaction"
 checked={noaCompaction}
 disabled={!loaded}
 onCheckedChange={toggleNoaCompaction}
 />
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <SearchIcon className="size-4" />
 웹 검색
 </CardTitle>
 <CardDescription>
 는웹 검색<b>전체 토글 + 출처구성</b>。켜짐후，에서<b>매개 Agent 구성</b>단선택여부활성화
 <b>web_search</b>（반환제목//요약，안 본문；에 의해 WebFetch ）。웹 검색<b>안 </b>
 기록프록시，독립에트래픽 캡처。
 <br />
 출처선택 <b>DuckDuckGo（ddgs）</b>（없음 Key）、<b>Brave（）</b>（입력 Brave API Key）、{" "}
 <b>Tavily</b>（입력 Tavily API Key）또는 <b>DeepSeek</b>（현재 LLM 구성）。전체 토글꺼짐，
 Agent 웹 검색토글안 。
 </CardDescription>
 </CardHeader>
 <CardContent className="flex flex-col gap-4">
 <div className="flex items-center justify-between gap-4">
 <Label htmlFor="web-search" className="text-sm font-normal text-muted-foreground">
 {webSearch ? "전체 토글활성화됨 · 에서 Agent 구성단활성화" : "비활성화됨 · Agent 불가활성화웹 검색"}
 </Label>
 <Switch
 id="web-search"
 checked={webSearch}
 disabled={!loaded || saving}
 onCheckedChange={(v) => {
 setWebSearch(v); // optimistic
 saveWebSearch({ web_search_enabled: v });
 }}
 />
 </div>

 {webSearch && (
 <div className="flex items-center justify-between gap-4">
 <Label className="text-sm font-normal text-muted-foreground">검색출처</Label>
 <Select
 value={backend}
 disabled={!loaded || saving}
 onValueChange={(v) => {
 setBackend(v); // optimistic
 saveWebSearch({ web_search_backend: v });
 }}
 >
 <SelectTrigger className="w-48 shrink-0">
 <SelectValue placeholder="선택출처" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="ddgs">DuckDuckGo（ddgs · 없음 Key）</SelectItem>
 <SelectItem value="brave-free">Brave（ · Key）</SelectItem>
 <SelectItem value="tavily">Tavily（ Key）</SelectItem>
 <SelectItem value="deepseek">DeepSeek（공식）</SelectItem>
 </SelectContent>
 </Select>
 </div>
 )}

 {webSearch && backend === "deepseek" && (
 <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-md border p-3">
 <p className="text-sm font-medium">DeepSeek 공식검색</p>
 <p className="text-muted-foreground text-xs leading-relaxed">
 해당출처직접<b>현재활성 LLM 구성</b>。이
 <b>지원 DeepSeek 공식모델</b>，해당구성<b>필수 anthropic </b>
 ——DeepSeek OpenAI 엔드포인트안 지원서비스검색。전환 LLM 구성후이출처가능만료。
 </p>
 <p className="text-muted-foreground text-xs leading-relaxed">
 ·그출처안 ，검색에 의해 <b>DeepSeek 서비스실행</b>：매차검색외소비한 번모델호출（생성 Token
 ），검색요청<b>안 상프록시</b>，<b>안 트래픽</b>；반환<b>제목</b>
 （없음요약），필요본문에 의해 WebFetch 。
 </p>
 <p className="text-muted-foreground text-xs leading-relaxed">
 여부충족상건에 의해행확인，시스템안 차단；하「테스트검색」버튼실제한 번검증。
 </p>
 </div>
 )}

 {webSearch && backend === "brave-free" && (
 <div className="flex flex-col gap-2">
 <Label htmlFor="brave-key" className="text-sm font-normal text-muted-foreground">
 Brave Search API Key
 {braveKeySet && <span className="ml-2 text-xs text-emerald-500">구성됨</span>}
 </Label>
 <div className="flex items-center gap-2">
 <Input
 id="brave-key"
 type="password"
 autoComplete="off"
 placeholder={braveKeySet ? "구성됨（비우기안 ）" : "입력 Brave API Key"}
 value={braveKeyInput}
 disabled={!loaded || savingKey}
 onChange={(e) => setBraveKeyInput(e.target.value)}
 />
 <Button
 type="button"
 onClick={saveBraveKey}
 disabled={!loaded || savingKey || braveKeyInput.trim() === ""}
 >
 저장
 </Button>
 </div>
 {braveNeedsKey && (
 <p className="text-xs text-amber-500">
 선택 Brave 미구성 Key —— 에서저장 Key 이전，검색도구않음활성화。
 </p>
 )}
 <p className="text-muted-foreground text-xs">
 도 2,000 차/。전 https://brave.com/search/api/ 획득 Key。
 </p>
 </div>
 )}

 {webSearch && backend === "tavily" && (
 <div className="flex flex-col gap-2">
 <Label htmlFor="tavily-key" className="text-sm font-normal text-muted-foreground">
 Tavily Search API Key
 {tavilyKeySet && <span className="ml-2 text-xs text-emerald-500">구성됨</span>}
 </Label>
 <div className="flex items-center gap-2">
 <Input
 id="tavily-key"
 type="password"
 autoComplete="off"
 placeholder={tavilyKeySet ? "구성됨（비우기안 ）" : "입력 Tavily API Key（tvly-…）"}
 value={tavilyKeyInput}
 disabled={!loaded || savingTavilyKey}
 onChange={(e) => setTavilyKeyInput(e.target.value)}
 />
 <Button
 type="button"
 onClick={saveTavilyKey}
 disabled={!loaded || savingTavilyKey || tavilyKeyInput.trim() === ""}
 >
 저장
 </Button>
 </div>
 {webSearch && backend === "tavily" && !tavilyKeySet && (
 <p className="text-xs text-amber-500">
 선택 Tavily 미구성 Key —— 에서저장 Key 이전，검색도구않음활성화。
 </p>
 )}
 <p className="text-muted-foreground text-xs">전 https://tavily.com 획득 API Key。</p>
 </div>
 )}

 {webSearch && (
 <div className="flex flex-col gap-2">
 <Label htmlFor="ws-proxy" className="text-sm font-normal text-muted-foreground">
 프록시（선택）
 </Label>
 <div className="flex items-center gap-2">
 <Input
 id="ws-proxy"
 autoComplete="off"
 placeholder="http://host:port 또는 socks5://host:port（비우기=직접 연결）"
 value={proxyInput}
 disabled={!loaded || savingProxy}
 onChange={(e) => setProxyInput(e.target.value)}
 />
 <Button type="button" onClick={saveProxy} disabled={!loaded || savingProxy}>
 저장
 </Button>
 </div>
 <p className="text-muted-foreground text-xs">
 독립프록시，에검색엔드포인트（VPN/SOCKS 외）。·기록트래픽 MITM 프록시없음；안 이프록시。
 </p>
 </div>
 )}

 {webSearch && (
 <div className="flex items-center justify-between gap-4 border-t pt-4">
 <p className="text-muted-foreground text-xs">
 현재구성（출처 + 프록시 + Key）실제검색한 번「test」，검증여부。
 </p>
 <Button
 type="button"
 variant="outline"
 onClick={runTest}
 disabled={!loaded || testing}
 className="shrink-0"
 >
 {testing ? "테스트중…" : "테스트검색"}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <RadioTowerIcon className="size-4" />
 사용자 지정이 · Python 기
 </CardTitle>
 <CardDescription>
 사용자 지정 <b>script</b> 유형도구 Python。자동（python3 우선）；이 venv /
 이절대 경로，비우기행자동。
 </CardDescription>
 </CardHeader>
 <CardContent className="flex flex-col gap-3">
 <div className="flex items-center gap-2">
 <Input
 className="font-mono text-sm"
 placeholder="/usr/bin/python3（비우기=자동）"
 value={pyInterp}
 disabled={!loaded || saving}
 onChange={(e) => setPyInterp(e.target.value)}
 />
 <Button variant="outline" onClick={detectPython} disabled={!loaded || saving}>
 신
 </Button>
 <Button onClick={savePython} disabled={!loaded || saving}>
 저장
 </Button>
 </div>
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <CpuIcon className="size-4" />
 동시 · Work Agent 수
 </CardTitle>
 <CardDescription>
 매개작업동시행 agent 수량（기본 3）。수값대동시탐지다、소비높。변경후
 <b>대상이후시작작업적용</b>，진행 중행작업안 영향。
 </CardDescription>
 </CardHeader>
 <CardContent className="flex flex-col gap-3">
 <div className="flex items-center gap-2">
 <Input
 type="number"
 min={1}
 className="w-32 font-mono text-sm"
 placeholder="3"
 value={workers}
 disabled={!loaded || savingWorkers}
 onChange={(e) => setWorkers(e.target.value)}
 />
 <Button onClick={saveWorkers} disabled={!loaded || savingWorkers}>
 저장
 </Button>
 </div>
 </CardContent>
 </Card>

 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <KeyboardIcon className="size-4" />
 세션입력전송키
 </CardTitle>
 <CardDescription>
 대화페이지·작업상세주 Agent 세션입력이설정，선택후즉시적용、없음저장。
 <br />
 해당<b>존재이기</b>，안 동기화，기또는데이터후신설정。
 </CardDescription>
 </CardHeader>
 <CardContent className="flex items-center justify-between gap-4">
 <Label htmlFor="chat-send-mode" className="text-sm font-normal text-muted-foreground">
 전송
 </Label>
 <Select value={sendMode} onValueChange={(v) => setChatSendMode(v as ChatSendMode)}>
 <SelectTrigger id="chat-send-mode" className="w-72">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CHAT_SEND_MODE_OPTIONS.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {option.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
