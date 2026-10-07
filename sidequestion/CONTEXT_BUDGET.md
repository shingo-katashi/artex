# 우회 장대화와 컨텍스트 예산

2026-09-11 수정. 기존 구현은 요청 JSON 문자 수를 token으로 직접 취하고 메인 작업 32K 출력 예약을 이어받아, HTML·JS·도구 결과가 많을 때 정상 우회 질문이 조기 거부되었습니다.

## 오픈소스 구현 대조

- [Grok CLI 우회 컨텍스트](https://github.com/superagent-ai/grok-cli/blob/fb97af83f06dca873281d60168430f06c8de6324/src/agent/agent.ts#L739): 최근 사용자·어시스턴트 텍스트에서 발췌, 문자 예산 약 2000, 항목당 최대 400자. 이 경로에서 연속 우회 Q&A 이력은 유지하지 않음.
- [Grok CLI 독립 요청](https://github.com/superagent-ai/grok-cli/blob/fb97af83f06dca873281d60168430f06c8de6324/src/utils/side-question.ts): 독립 취소 신호; 모델 지원 시 출력 상한 2048 tokens; 도구 없음.
- [Grok CLI 메인 세션 압축](https://github.com/superagent-ai/grok-cli/blob/fb97af83f06dca873281d60168430f06c8de6324/src/agent/compaction.ts): token 추정, 최근 내용 유지, 새 내용을 구 요약에 갱신, 턴 간 절단 처리.
- [OpenCode 세션 압축](https://github.com/anomalyco/opencode/blob/b3f1a96c6dd7adeb28b36dd11add1998fc84d67b/packages/core/src/session/compaction.ts): 전체 요청 추정, 출력/버퍼 예약, 최근 내용+롤링 요약, 도구 없는 요약 요청; 기본 최근 예산 8000, 요약 출력 상한 4096 tokens.
- [OpenCode 오버플로 복구](https://github.com/anomalyco/opencode/blob/b3f1a96c6dd7adeb28b36dd11add1998fc84d67b/packages/core/src/session/runner/llm.ts): 어시스턴트 출력이 시작되지 않았을 때만 오버플로 복구 시도, 복구 후 호출은 같은 경로로 재진입하지 않음.

ARTEX는 독립 출력 예산, 최근 내용·롤링 요약, 제한적 복구를 참고합니다. norma v0.3.6 구조화 메시지·도구 쌍을 유지하고 Grok 텍스트 발췌를 그대로 따르지 않으며, OpenCode 메인 세션 압축 이벤트를 ARTEX 메인 transcript에 쓰지 않습니다.

## 요청 예산 및 실행

- 메시지는 norma의 콘텐츠 블록 UTF-8 바이트 추정 및 4/3 여유; 시스템 프롬프트, 도구 schema, 메시지 래핑 오버헤드 추가. 추정은 모델 정확 token 수가 아님.
- 우회 출력 기본 최대 8192 tokens, 메인 설정 출력 상한을 넘지 않음. 서비스 환경 변수 `ARTEX_BTW_MAX_OUTPUT_TOKENS`로 256–32768 상한; 제품 기본 모델·메인 작업 파라미터는 변경하지 않음.
- 입력 예산 = 컨텍스트 창 − 출력 상한 − 안전 여유; 창 미지 시 플랫폼 기본 200K. 안전 여유는 창의 5%, 최소 128·최대 8192 tokens.
- 성공 Q&A는 증가 순번으로 배치당 최대 20쌍. 원문 최대 20쌍, token 예산은 입력 예산의 1/4 이하·16K 이하.
- 초과 Q&A는 롤링 요약 갱신. 요약에 이력 출처·컨텍스트 시각; 과거 어시스턴트 답변은 새 도구 증거와 동일하지 않으며, 충돌 시 최신 메인 스냅샷 우선.
- 메인 컨텍스트가 여전히 길면 복사본의 오래된 메시지만 요약, 최근 최대 8K tokens; 절단점은 도구 호출·결과를 쪼개지 않음. 과도한 단일 그룹은 전체 요약.
- 요약 입력은 실제 남은 창으로 UTF-8 안전 분할, 출력 상한 2048 tokens; 빈 요약·절단·도구 호출·요약 예산 초과는 캐시에 쓰지 않음. 단일 우회 요약 호출 최대 12회, 동일 120초 타임아웃; 상한 도달 시 명시 실패, 무한 루프 없음.
- 모델 첫 응답이 컨텍스트 초과이고 텍스트·도구 호출이 없으면 추가 축소 후 최대 1회 재시도; 추정 크기가 줄지 않으면 즉시 복구 중단. 다른 모델 오류·부분 스트리밍 출력은 해당 복구 미트리거.
- 취득한 사용량(요약, 실패 시도, 취소 시 사용량)은 동일 우회 요청에 누적. Provider가 사용량을 안 주면 0만 기록, 추정을 실제로 기록하지 않음.

## 영속화 및 UI

`side_question_sessions.memory`에 구 Q&A 요약, 덮어쓴 ordinal, 스냅샷 신원별 캐시된 메인 컨텍스트 요약. `side_question_requests.context_info`에 준비 단계, 실제 재생 쌍 수, 요약 사용, 예산 추정.

요약은 원 요청이 여전히 실행 중이고 정리 버전이 일치할 때만 저장; 비우기는 캐시도 지우고 늦은 쓰기는 정리된 데이터 복구하지 않음. 새 스냅샷은 구 스냅샷 요약 재사용하지 않음. 요약 필드는 v3 작업 아카이브에 저장; v3 복구 시 필드 없으면 빈 객체, v1/v2 호환.

POST는 먼저 수락·요청 반환, 준비·압축은 백그라운드, 입장 잠금·DB 트랜잭션 보유하지 않음. SSE/이력에 준비·Q&A 정리·복사본 압축·답변 단계 표시; 압축 실패는 해당 우회 요청의 실패 종료로 저장. 프론트는 오류 유지·실패 질문 초안 복구, 입력창 가리는 토스트 없음; 이력 폴링이 제출 오류를 지우지 않음.

## 검증 기록

- 19/20/21/50쌍 재생, 20쌍 넘는 구 결론 유지, 요약 캐시 재시작 재사용: 자동 통과.
- 초장문 중국어 답변·코드 컨텍스트, 분할 요청 예산, 도구 쌍, 스냅샷 불변, 새 스냅샷 캐시 무효: 자동 통과.
- 요약 실패/취소/절단/초장/도구 반환, 비우기 경쟁, 호출 상한, 단일 오버플로 복구·부분 스트림 재시도 없음: 자동 통과.
- 독립 PostgreSQL 페이지네이션, 재시작, v1/v2/v3 아카이브, 요약 캐시·예산 메타 아카이브 복구, 구 v3 새 필드 없음, 20 부모 세션 4 동시 슬롯 공유: 통과.
- Go 후보 서비스 빌드, 프론트 TypeScript, 수정 컴포넌트 Biome, 독립 디렉터리 Next.js 프로덕션 빌드: 통과.
- 내장 브라우저 독립 UI 픽스처, 1280×720·390×844에서 정리 단계, 요약 범위 안내, 실패 후 초안 복구, 토스트 오류 없음, 가로 넘침·콘솔 오류 없음. 임시 픽스처 제거됨.
- 읽기 전용 재생 로컬 기존 Worker 스냅샷, 새 예산 검사 통과; 예: Worker #3 293085자 스냅샷이 로컬 문자 수로 거부되지 않음. 외부 모델 호출 없음.
- 이번에 비공개 Worker 스냅샷을 Grok에 보낸 실제 대화 테스트는 자동 승인 검토 거부, 미실행, 통과 항목 아님.
- 2026-09-11 00:37 사용자 요청으로 로컬 백엔드 재시작, 기존 DB·데이터 디렉터리·로그인 설정 유지. 실행 파일·후보 바이너리 SHA-256 일치; 백엔드·프론트 프록시 `/api/health` 정상.

검증 명령(독립 테스트 DB만):

```sh
go test -race ./sidequestion ./db ./server -run 'TestSide|TestCheckpoint|TestSnapshot|TestBuildRequest|TestService|TestMainSide|TestTaskArchive' -count=1
go build ./cmd/artex
npx tsc --noEmit
npm run build -- --webpack
```

프론트 프로덕션 빌드는 독립 복사본으로 실행 중 `.next` 미덮어쓰기. 후보 서비스 `/private/tmp/artex-btw-budget-candidate`, `/private/tmp/artex-btw-preview/artex`에 복사·기동; 원 바이너리 백업 `artex.before-context-budget`.
