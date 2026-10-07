"use client";

import * as React from "react";

import {
 CheckCircle2Icon,
 DownloadIcon,
 ExternalLinkIcon,
 RefreshCwIcon,
 RotateCcwIcon,
 TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api, sseUrl } from "@/lib/api";
import type { UpdateCheck, UpdateProgress } from "@/lib/types";

/** 외신버전이상시각。한 번급차시작（ → → 신버전），
 * 매차는초급，분커버 Docker 기。 */
const RESTART_TIMEOUT_MS = 180_000;

function humanSize(n?: number): string {
 if (!n || n <= 0) return "";
 const units = ["B", "KB", "MB", "GB"];
 let v = n;
 let i = 0;
 while (v >= 1024 && i < units.length - 1) {
 v /= 1024;
 i++;
 }
 return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function UpdateCard() {
 const [info, setInfo] = React.useState<UpdateCheck | null>(null);
 const [checking, setChecking] = React.useState(true);
 const [progress, setProgress] = React.useState<UpdateProgress | null>(null);
 // · progress ：완료후없음，SSE ，이까지폴링 /api/health。
 const [restarting, setRestarting] = React.useState(false);
 const [busy, setBusy] = React.useState(false);

 // quiet 하지 말후：페이지자동（），
 // 「업데이트 확인」，그렇지 않으면이 외까지。
 const check = React.useCallback((quiet = false) => {
 setChecking(true);
 api
 .checkUpdate(!quiet)
 .then((r) => {
 setInfo(r);
 if (!quiet) {
 if (r.error) toast.error("업데이트 확인실패：" + r.error);
 else if (r.has_update) toast.success(`발견신버전이 ${r.latest}`);
 else if (r.comparable) toast.success("현재는신버전이");
 }
 })
 .catch((e) => {
 if (!quiet) toast.error("업데이트 확인실패：" + (e as Error).message);
 })
 .finally(() => setChecking(false));
 }, []);

 React.useEffect(() => {
 check(true);
 }, [check]);

 // 폴링 /api/health 까지이。
 //
 // 필수는"이"안 는"상"：중구버전이신한 번
 // （한 번 artex.new 상후），성공。
 const waitForNewVersion = React.useCallback(async (fromVersion: string) => {
 setRestarting(true);
 const deadline = Date.now() + RESTART_TIMEOUT_MS;
 while (Date.now() < deadline) {
 await sleep(2000);
 try {
 const r = await fetch("/api/health", { cache: "no-store" });
 if (r.ok) {
 const j = (await r.json()) as { version?: string };
 if (j.version && j.version !== fromVersion) {
 toast.success(`업데이트까지 ${j.version}，진행 중신불러오기페이지`);
 await sleep(800);
 window.location.reload();
 return;
 }
 }
 } catch {
 // 창내안 상는，재개폴링。
 }
 }
 setRestarting(false);
 toast.error(" 외서비스타임아웃。후，또는확인 artex 는승인 start.sh / start.bat 시작。");
 }, []);

 // 업데이트도。SSE 안 Next /api （，안 ）。
 const openStream = React.useCallback(
 (fromVersion: string) => {
 const es = new EventSource(sseUrl("/api/update/stream"));
 es.onmessage = (ev) => {
 let p: UpdateProgress;
 try {
 p = JSON.parse(ev.data) as UpdateProgress;
 } catch {
 return;
 }
 setProgress(p);
 if (p.phase === "failed") {
 es.close();
 setBusy(false);
 toast.error("업데이트실패：" + (p.error || p.message));
 return;
 }
 if (p.phase === "staged") {
 es.close();
 void waitForNewVersion(fromVersion);
 }
 };
 es.onerror = () => {
 // SSE 。만약이미입력 외，에정상，
 // 에 /api/health 폴링재개。
 es.close();
 };
 return es;
 },
 [waitForNewVersion],
 );

 const doUpdate = () => {
 if (!info) return;
 const from = info.current;
 const ok = window.confirm(
 `확인업데이트까지 ${info.latest}？\n\n` +
 "업데이트，진행 중행작업중。\n" +
 (info.mode === "docker"
 ? "\n：기내업데이트이，않음업데이트 playwright / nmap 외도구；" +
 "신버전이의존성신도구， docker compose pull。"
 : ""),
 );
 if (!ok) return;

 setBusy(true);
 setProgress({ phase: "downloading", percent: 0, message: "중…" });
 const es = openStream(from);
 api.applyUpdate().catch((e) => {
 es.close();
 setBusy(false);
 setProgress(null);
 toast.error("시작업데이트실패：" + (e as Error).message);
 });
 };

 const doRollback = () => {
 if (!info) return;
 if (
 !window.confirm(
 "까지상이？\n\n，진행 중행작업중。\n：데이터스키마않음，구버전이가능불가식별신버전데이터。",
 )
 )
 return;
 const from = info.current;
 setBusy(true);
 api
 .rollbackUpdate()
 .then(() => {
 toast.success("전환까지상이，진행 중…");
 void waitForNewVersion(from);
 })
 .catch((e) => {
 setBusy(false);
 toast.error("실패：" + (e as Error).message);
 });
 };

 const phase = progress?.phase;
 const showProgress = busy || restarting;
 // 다운로드까지（ Content-Length ）。검증// 외는
 // 안 ，도건개표시"에서안 다"。
 const downloading = !restarting && phase === "downloading";
 const pct = downloading ? Math.max(progress?.percent ?? 0, 0) : 100;

 return (
 // 설정페이지는다열레이아웃，카드행금지열（ page.tsx 주석）。
 <Card className="mb-4 break-inside-avoid md:mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <DownloadIcon className="size-4" />
 이·업데이트
 </CardTitle>
 <CardDescription>부터 GitHub 신버전이。업데이트，진행 중행작업중。</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex flex-wrap items-center gap-2 text-sm">
 <span className="text-muted-foreground">현재이</span>
 <Badge variant="secondary" className="font-mono">
 {info?.current ?? "…"}
 </Badge>
 {info && (
 <>
 <Badge variant="outline" className="font-mono">
 {info.os}/{info.arch}
 </Badge>
 <Badge variant="outline">{info.mode === "docker" ? "Docker" : "독립"}</Badge>
 </>
 )}
 {info?.latest && (
 <>
 <span className="text-muted-foreground">신버전이</span>
 <Badge variant={info.has_update ? "default" : "secondary"} className="font-mono">
 {info.latest}
 </Badge>
 </>
 )}
 {info?.html_url && (
 <a
 href={info.html_url}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
 >
 업데이트 <ExternalLinkIcon className="size-3" />
 </a>
 )}
 </div>

 {info?.boot_notice && (
 <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
 <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
 {info.boot_notice}
 </p>
 )}

 {info?.error && (
 <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
 <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
 불가연결 GitHub：{info.error}
 {"　"}에서상구성전역프록시후재시도。
 </p>
 )}

 {info && !info.comparable && info.reason && <p className="text-xs text-muted-foreground">{info.reason}</p>}

 {info?.has_update && info.asset_available === false && (
 <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
 <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
 {info.latest} 없음 {info.os}/{info.arch} （소 {info.asset}），불가자동업데이트。
 </p>
 )}

 {info?.has_update && info.asset_available !== false && (
 <p className="text-xs text-muted-foreground">
 다운로드 <span className="font-mono">{info.asset}</span>
 {info.size ? `（${humanSize(info.size)}）` : ""}，검증 SHA256 테스트후，실패자동보존현재이。
 </p>
 )}

 {info && !info.has_update && info.comparable && !info.error && (
 <p className="flex items-center gap-2 text-xs text-muted-foreground">
 <CheckCircle2Icon className="size-3.5 text-emerald-600" />
 현재는신버전이。
 </p>
 )}

 {info?.mode === "docker" && info.has_update && (
 <p className="text-xs text-muted-foreground">
 Docker 하업데이트이，안 업데이트 playwright / nmap 외도구，
 <span className="font-mono"> docker compose up -d </span>
 기후이。필요급실행
 <span className="font-mono"> docker compose pull artex &amp;&amp; docker compose up -d artex</span>。
 </p>
 )}

 {showProgress && (
 <div className="space-y-1.5">
 <Progress value={pct} className={downloading ? undefined : "animate-pulse"} />
 <p className="text-xs text-muted-foreground">
 {restarting ? "진행 중애플리케이션신버전이，（페이지자동새로고침）…" : progress?.message}
 </p>
 </div>
 )}

 <div className="flex flex-wrap gap-2">
 <Button variant="outline" size="sm" onClick={() => check(false)} disabled={checking || busy || restarting}>
 <RefreshCwIcon className={checking ? "size-4 animate-spin" : "size-4"} />
 업데이트 확인
 </Button>
 <Button
 size="sm"
 onClick={doUpdate}
 disabled={busy || restarting || !info?.has_update || info?.asset_available === false}
 >
 <DownloadIcon className="size-4" />
 {info?.has_update ? `업데이트까지 ${info.latest}` : "즉시업데이트"}
 </Button>
 {info?.has_backup && (
 <Button variant="ghost" size="sm" onClick={doRollback} disabled={busy || restarting}>
 <RotateCcwIcon className="size-4" />
 까지상이
 </Button>
 )}
 </div>

 <p className="text-xs text-muted-foreground">
 키업데이트의존성이。승인 <span className="font-mono">start.sh</span>（Windows 를
 <span className="font-mono"> start.bat</span>）시작 ARTEX；직접행 artex 이，후않음자동。
 </p>
 </CardContent>
 </Card>
 );
}
