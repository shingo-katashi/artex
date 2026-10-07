"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const termsBodyRef = useRef<HTMLDivElement>(null);

  // 약관 맨 아래까지 스크롤(또는 한 화면에 모두 보이는 경우)해야 「동의」를 누를 수 있습니다.
  function handleTermsScroll() {
    const el = termsBodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true);
  }

  useEffect(() => {
    if (!termsOpen) return;
    // 열 때 초기화하고, 내용이 한 화면 이하라 스크롤이 없는 경우를 처리합니다.
    setReadToEnd(false);
    const el = termsBodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setReadToEnd(true);
  }, [termsOpen]);

  useEffect(() => {
 // 로그인직접주（보내기하없음 middleware 이 레이어）。
    const token = auth.getToken();
    if (token) {
 // localStorage 가능자격 증명 cookie 。동기화，전체신요청，
 // 방지서비스또는에 의해에 checking 상태로그인페이지。
      auth.setToken(token);
      window.location.replace("/function/tasks");
      return;
    }
    api
      .authStatus()
      .then(({ initialized }) => {
        if (!initialized) router.replace("/setup");
      })
      .catch(() => setError("백엔드 서비스에 연결할 수 없습니다"))
      .finally(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("먼저 《이용 안내》를 읽고 동의해 주세요");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.login("ARTEX", password);
      auth.setToken(token);
      window.location.replace("/function/tasks");
    } catch {
      setError("사용자 이름 또는 비밀번호가 올바르지 않습니다");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center text-muted-foreground">
        로그인 상태 확인 중…
      </div>
    );
  }

  return (
    <div className="flex h-dvh">
      {/* Left panel */}
      <div className="hidden flex-col items-center justify-center bg-primary p-12 text-center lg:flex lg:w-1/3">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-80 rounded-full border border-primary-foreground/10" />
          <div className="absolute size-60 rounded-full border border-primary-foreground/15" />
          <div className="absolute size-40 rounded-full border border-primary-foreground/20" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ARTEX" width={160} height={160} className="relative brightness-0 invert" />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-medium tracking-tight">로그인</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">다시 오신 것을 환영합니다. ARTEX를 계속 사용하려면 비밀번호를 입력하세요</p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">사용자 이름</Label>
              <Input id="username" value="ARTEX" readOnly className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoFocus
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="agree-terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
                읽었으며 동의합니다
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="mx-0.5 font-medium text-primary underline-offset-4 hover:underline"
                >
                  《이용 안내》
                </button>
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !password || !agreed}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="flex-row items-center gap-3 border-b px-6 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base">ARTEX 이용 안내 및 면책 조항</DialogTitle>
              <p className="text-xs text-muted-foreground">
                버전 v1.0 · 시행일 2026-09-18 · 로그인 전 아래 약관을 모두 읽어 주세요
              </p>
            </div>
          </DialogHeader>

          <div
            ref={termsBodyRef}
            onScroll={handleTermsScroll}
            className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground"
          >
            <p className="rounded-lg border bg-muted/40 p-3 text-foreground/80">
              본 《이용 안내 및 면책 조항》(이하 "본 약관")은 귀하와 ARTEX
              프로젝트 작성자 및 기여자 간에 본 소프트웨어 사용에 관한 합의입니다. 사용 전 각 조항, 특히 면책·책임 제한·금지 조항을 주의 깊게 읽고 이해해 주세요.
              <span className="font-medium text-foreground">
                {" "}
                다운로드·설치·접근 또는 기타 방식으로 본 소프트웨어를 사용하면 본 약관 전체에 동의한 것으로 봅니다.
              </span>
            </p>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  1
                </span>
                제1조 · 정의 및 오픈소스 라이선스
              </h4>
              <p className="pl-7">
                본 소프트웨어(ARTEX)는 GNU Affero General Public License
                v3.0(AGPL-3.0)에 따라 배포됩니다. 해당 라이선스에 따라 사용·복제·수정·배포할 수 있으나, 파생 저작물(제3자에게 제공하는 온라인 서비스 포함)도
                AGPL-3.0으로 동일하게 오픈소스 공개 및 전체 소스 코드를 사용자에게 제공해야 합니다. 전체 조항은 LICENSE 파일을 따릅니다.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  2
                </span>
                제2조 · 허용된 사용 범위
              </h4>
              <p className="pl-7">
                본 소프트웨어는 개인 학습, 코드 연구, 보안 기술 원리 탐구, 자체 구축한 격리 환경에서의 기술 검증 등 비공격·비파괴 목적으로만 사용할 수 있습니다. 본 조에서 명시적으로 허용한 경우를 제외하고 다른 목적으로 사용할 수 없습니다.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="flex items-center gap-2 font-medium text-destructive">
                <span className="flex size-5 items-center justify-center rounded-md bg-destructive/10 text-xs font-semibold text-destructive">
                  3
                </span>
                <AlertTriangle className="size-4" />
                제3조 · 금지 행위
              </h4>
              <ul className="ml-7 list-decimal space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 pl-8 text-foreground/80 marker:text-destructive/70">
                <li>
                  웹사이트, 온라인 서비스, 타인 또는 제3자 소유의 연결 시스템에 대한 스캔·탐지·이용·공격(승인 여부·자산 소유와 무관)을 금지합니다;
                </li>
                <li>본 소프트웨어를 실제 모의해킹, 공방 대결, 레드/블루 팀 훈련 또는 운영 환경에 사용하는 것을 금지합니다;</li>
                <li>불법 침입, 데이터 탈취, 랜섬, 서비스 거부(DoS/DDoS) 또는 기타 파괴적·범죄적 활동에 사용하는 것을 금지합니다;</li>
                <li>본 소프트웨어 및 출력물의 저작권, 라이선스 또는 보안 안내를 제거·변조·회피하는 것을 금지합니다;</li>
                <li>거주 국가·지역의 법률·규정·감독 규정을 위반하는 행위를 금지합니다.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  4
                </span>
                제4조 · 지적 재산권
              </h4>
              <p className="pl-7">
                본 소프트웨어의 저작권 및 관련 지적 재산권은 프로젝트 작성자 및 기여자에게 있으며, AGPL-3.0
                라이선스 범위 내에서 해당 권리를 부여합니다. 해당 라이선스에서 명시한 권리 외에 본 약관은 다른 권리를 부여하지 않습니다.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  5
                </span>
                제5조 · 데이터 및 개인정보
              </h4>
              <p className="pl-7">
                본 소프트웨어는 자체 배포 가능한 오픈소스이며, 작성자는 중앙 서비스를 운영하지 않고 사용 데이터를 수집·업로드하지 않습니다. 사용 중 생성·처리·접촉하는 모든 데이터의 합법성과 보안은 귀하의 책임입니다.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  6
                </span>
                제6조 · 규정 준수 및 법적 책임
              </h4>
              <p className="pl-7">
                거주 국가·지역의 네트워크 보안, 데이터 보안, 개인정보 보호, 컴퓨터 범죄 관련 법률을 준수해야 합니다.
                <span className="font-medium text-foreground">
                  {" "}
                  위 법률 또는 본 약관 위반으로 발생하는 모든 법적 책임과 결과는 귀하에게 있으며, 작성자 및 기여자와 무관합니다.
                </span>
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  7
                </span>
                제7조 · 면책 및 책임 제한
              </h4>
              <p className="pl-7">
                본 소프트웨어는 "있는 그대로(AS IS)" 및 "현재 제공되는(AS
                AVAILABLE)" 상태로 제공되며, 상품성·특정 목적 적합성·정확성·비침해 등 명시적·묵시적 보증을 하지 않습니다. 법이 허용하는 최대 범위에서 사용·미사용으로 인한 직접·간접·부수·특별·결과적 손실에 대해 책임지지 않습니다.
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  8
                </span>
                제8조 · 약관 변경 및 해석
              </h4>
              <p className="pl-7">
                작성자는 필요 시 본 약관을 업데이트할 수 있으며, 공개일부터 효력이 있습니다. 계속 사용하면 수정 약관에 동의한 것으로 봅니다. 무효 조항이 있어도 나머지 조항은 유효합니다.
              </p>
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 flex-col items-stretch gap-2 rounded-b-xl px-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {readToEnd ? "약관을 모두 확인했습니다" : "약관을 끝까지 스크롤한 후 확인해 주세요"}
            </p>
            <DialogClose asChild>
              <Button
                type="button"
                disabled={!readToEnd}
                onClick={() => {
                  setAgreed(true);
                  setError("");
                }}
              >
                약관을 모두 읽고 동의합니다
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
