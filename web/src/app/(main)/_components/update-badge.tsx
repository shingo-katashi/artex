"use client";

import * as React from "react";

import Link from "next/link";

import { ArrowUpCircleIcon } from "lucide-react";

import { api } from "@/lib/api";

/**
 * "신버전이"안내：페이지불러오기한 번，업데이트에서이，
 * 클릭시스템 설정페이지「이·업데이트」카드。
 *
 * 후대상 GitHub 쿼리 30 분，따라서여기매차한 번는전체
 * ——미인증 GitHub API 60 차/소/IP，없음，다개태그페이지
 * ，이후업데이트안 。
 *
 * 쿼리실패：안 는오류，설정페이지「업데이트 확인」까지사유。
 */
export function UpdateBadge() {
 const [latest, setLatest] = React.useState("");

 React.useEffect(() => {
 let alive = true;
 api
 .checkUpdate()
 .then((r) => {
 // has_update 이미포함"이"，않음개안내。
 if (alive && r.has_update && r.latest) setLatest(r.latest.replace(/^v(?=\d)/, ""));
 })
 .catch(() => {
 // ：없음 / GitHub 속도 제한안 해당에서오류。
 });
 return () => {
 alive = false;
 };
 }, []);

 if (!latest) return null;

 return (
 <Link
 href="/system/settings"
 title={`발견신버전이 ${latest}，클릭전업데이트`}
 className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground text-xs transition-opacity hover:opacity-90"
 >
 {/* ：다，글자무시，표시。 */}
 <span className="relative flex size-1.5">
 <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground opacity-75" />
 <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
 </span>
 <ArrowUpCircleIcon className="size-3.5" />
 <span className="hidden sm:inline">신버전이 {latest}</span>
 <span className="sm:hidden">신버전이</span>
 </Link>
 );
}
