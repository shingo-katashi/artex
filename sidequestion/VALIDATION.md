# `/btw` 검증 기록

날짜: 2026-09-10. 브랜치: `codex/btw-side-question`. 기준: `8dae851b9b622f2ff2631f332fde9719d0b16fba`.

독립 PostgreSQL 테스트 DB·데이터 디렉터리 사용; 실제 모델 자격 증명은 독립 테스트 환경에만 주입, 코드·본 기록에 쓰지 않았고 제품 기본 모델도 변경하지 않음. Go 1.26.3, norma v0.3.6, Next.js 16.2.9.

실제 모델 대화, 반환 객체, 엔지니어링 단언, Qwen 원문 검토 텍스트는 [validation-2026-09-10.json](validation-2026-09-10.json)에 저장(API 자격 증명 없음).

## 엔지니어링 검사

| 범위 | 결과 | 증거 |
| --- | --- | --- |
| 구조화 메시지, 도구 파라미터 깊은 복사 | 통과 | `TestCheckpointDeepCopyAndBoundaries` |
| 요약/압축 요청 미덮어쓰기, 완전 응답·종료 게시, 반쪽 응답 제외 | 통과 | `TestCheckpointDeepCopyAndBoundaries`, `TestSnapshotExcludesPartialStreamAndSelectsPoolMember` |
| 실제 모델 풀 멤버 신원 | 통과 | `TestSnapshotExcludesPartialStreamAndSelectsPoolMember` |
| 도구 쌍, 20쌍 재생, 예산 자르기·초과 오류 | 통과 | `TestBuildRequestCompactionToolPairingAndBudget` |
| 메인·우회 병렬, 양방향 취소 격리 | 통과 | 블로킹 Provider, `TestMainSideConcurrencyAndIndependentCancellation` |
| 도구 실행 없음, 스트리밍/비스트리밍, 실패 시 기존 사용량 | 통과 | `TestServiceNoToolsAndUsageOnFailure` |
| 실제 norma ChatAgent + 로컬 Read 도구, 메인 transcript/활동 격리 | 통과 | `TestSideActualChatCheckpointToolResultAndTranscriptIsolation`, 스트리밍·비스트리밍 하위 |
| 영속화, 페이지네이션, 멱등, 재시작 부분 답변 유지 | 통과 | `TestSideHistoryIdempotencyPagingAndRecovery` |
| 비우기·늦은 쓰기 경쟁, 부모 삭제, 버전 비교 | 통과 | `TestSideClearLateWritersAndDeletedParent` |
| MainAgent/Worker 아카이브·복구, v1/v2/v3 | 통과 | `TestSideTaskArchiveVersions` |
| 세 부모 API, 인증, 리소스 소속, Worker 논리 삭제 | 통과 | `TestSideHTTPGlobalLimitTaskWorkerAndDeletion`, `TestSideCheckpointPersistsBeforeAdmissionAndRestart` |
| 바쁜 메인 세션에서 우회 가능, 독립 SSE 재연결/끊김, 취소, 비우기 | 통과 | `TestSideHTTPBusyIsolationClearAndReconnect` |
| 부모당 1 / 전역 4 동시 | 통과 | 두 `TestSideHTTP…` 케이스 |
| 제출 전 스냅샷 DB 저장, 재시작 후 이어질 질문, 구 세션 스냅샷 위조 불가 | 통과 | `TestSideCheckpointPersistsBeforeAdmissionAndRestart` |
| 캐시 설정 삭제·모델 변경 후 거부 | 통과 | `TestSideRejectsDeletedOrChangedCachedProfile` |
| 아카이브 전 취소·최종 답변·사용량 DB 대기 | 통과 | `TestSideTaskDrainPersistsBeforeArchive` |
| 스트리밍 소비자 조기 취소 시 사용량 1회·우회 소속 | 통과 | `TestSideUsageRecordedOnceOnConsumerCancellation` |
| 재시작 자동 복구 Worker/deadline 실행 컨텍스트 새 스냅샷 게시 | 통과 | `TestSideRestoredWorkerRuntimePublishesNewCheckpoint` |
| 관련 패키지 race 검사 | 통과 | 아래 명령 |
| TypeScript·프로덕션 빌드 | 통과 | `npx tsc --noEmit`, `npm run build` |
| 신규 프론트 모듈 Biome | 통과 | `biome check`, 신규 모듈 3개 |

별도 폐기 가능 DB에 `ARTEX_PG_DSN` 설정 후 자동 검사 재현(프로덕션 DB 지정 금지):

```sh
go test -race ./agent ./db ./server ./sidequestion ./llmrec ./llmpool \
  -run 'Test(Side|Checkpoint|Snapshot|BuildRequest|Service|MainSide|CaptureRun|TaskArchive|CompleteForwards|StopIntent|CancelIntent)' -count=1
cd web
npx tsc --noEmit
npx biome check src/lib/side-questions.ts src/hooks/use-side-questions.ts src/components/side-question-workspace.tsx
npm run build
```

전체 Go 회귀는 전부 녹색 아님: `server` 패키지 기존 테스트 2개가 임시 디렉터리 정리 단계 실패, `TempDir RemoveAll … directory not empty`:

- `TestInheritedActivityDetailAndRelationDeletion`
- `TestTaskMetadataPatchReturnsRenameAndPin`

수정 전 기준에서 소스 export 후 동일 격리 환경 `server` 재실행 시 동일 정리 실패. 기준 실행에 `TestCoreTaskLifecyclePG` 목표 노드 수 단언 실패; 최종 수정 `server` 회귀에는 해당 단언 실패 없음. 다른 패키지 통과, 이번 우회 관련·race 통과. 기준 문제를 이번 승인 통과로 표시하지 않았고, 기존 단언 숨기기 위해 수정하지 않음.

Next.js 빌드 출력에 기존 다중 lockfile/workspace root 추론 경고; 빌드 완료·모든 페이지 생성 성공.

## 브라우저 검사

Codex In-app Browser, 독립 로컬 Go 서비스·Next.js dev 서버 연결. 데스크톱·390×844에서 아래 수동 자동화, 스크린샷·브라우저 로그 확인:

- 일반 채팅 실행 중 `/btw` 입력, 메인·우회 동시 표시; 데스크톱 사이드바 정상.
- 연속 추가 질문; 우회 중지 후 생성분 유지; 메인 흐름 계속.
- 패널 닫아도 요청 계속, 재개 시 완료 답변 복구; 새로고침 후 빈 `/btw`로 이력 복구.
- 좁은 Drawer 입력·버튼·이력·닫기 정상, 가로 넘침 없음.
- 비우기 확인 대화상자, 비운 후 이력 사라지고 메인 transcript·스냅샷 유지.
- 작업 MainAgent·두 Worker 각각 질문·전환, Agent 탭·이력 섞이지 않음.
- 블로킹 로컬 모델 픽스처로 Worker 실행 유지; Worker 메인 입력 `/btw` 제출, 우회 중지 후 Worker 실시간 실행·자체 일시정지 버튼, 우회 부분 답변 저장.
- 브라우저 error/warning 로그 비어 있음.

제어 픽스처로 동시성 시퀀스 정밀 검증, 실제 모델 출력 속도에 의존하지 않음. 디버깅 중 Worker 실행 검사 2회는 유효 동시 창 없음(작업 종료/답변 조기 종료), 픽스처 수정 후 재실행 통과; 초기 시도는 유효 통과로 기록하지 않음.

## 실제 모델 대화

우선 `grok-4.6` 탐색, OpenAI 호환 `http://127.0.0.1:12580/tingly/openai`. HTTP 200, 모델명 `grok-4.6`, `READY`, 2.82초. 1순위 사용 가능, Tingly `glm`·智谱 `glm-5.3` 예비 체인 미사용·미검증.

| 시나리오 | 실제 결과 |
| --- | --- |
| 메인 실행 중 자산·목표·마커 질문 | `redhaze.top`, 홈 읽기·목표 요약, `BTW-REAL-0910` 반환; 우회 완료 16.97초 |
| 메인 홈 읽기 완료 후 도구 근거 질문 | WebFetch 200, curl 301→302→200, 페이지 제목 정확 인용; 7.24초 |
| 우회에서 Bash 테스트 파일 생성 요청 | 실행 거부, 대상 파일 미생성; 7.74초 |
| 완료 후 우회가 메인 컨텍스트 변경 안 함 | 메인 transcript SHA-256·메인 활동 기록 일치; 우회 도구 실행 0 |
| 실제 중지/Go 서비스 재시작 후 이어질 질문 | 이전 3개 우회 이력 유지, 영속 스냅샷으로 자산·마커·제목 답변, 메인 Agent 재실행 없음 |
| Grok 비스트리밍 설정 새 세션 | 자산·`ATOMIC-0910` 정확; 사용량 저장 input 11734, output 138, cache_read 11520 |

자산 케이스 메인 세션은 WebFetch·Bash/curl로 공개 홈 읽기, 랜딩 `https://id.redhaze.top/home`, 제목 「红幕科技 RedHaze Group · 全球综合集团门户」. Bash는 로컬 테스트 파일에 응답 임시 저장; 원격 쓰기 없음. 「우회 도구 미실행」과 별도 검증.

메인 transcript 검증값: `e7e61f135a4a120954b539f357e8c4205d7d5cd7460dcaf3dc0fd066463e1d00`.

**사용량 제한:** Tingly Grok 스트리밍 응답에 usage 없음. `stream_options.include_usage=true` 직접 전송 검증, HTTP 200, 12 데이터 프레임, usage 프레임 0. 스트리밍 테스트 0은 엔드포인트 미제공 의미, 무료 아님. 비스트리밍·픽스처 실패/취소 사용량은 정상 저장.

## Qwen 검토

모델 `qwen-flash`, OpenAI 호환 `https://dashscope.aliyuncs.com/compatible-mode/v1`, HTTP 200. 첫 3개 실제 우회 대화·메인 도구 근거·엔지니어링 단언 제공; `verdict: accept`, `concerns: []`, 답변이 자산·마커·페이지 읽기 증거와 일치, 우회 도구 거부가 제약에 부합. 검토 사용량 prompt 6625, completion 312, total 6937.

이번 Qwen 검토 범위에 나중 추가된 서비스 재시작·비스트리밍 테스트 미포함. Qwen 「무쓰기」 요약은 과함: 메인 curl은 로컬 응답 임시 파일 생성, 위에 명시. 동시성·도구 0·transcript 격리는 엔지니어링 단언, 모델 검토는 답변 품질 보조.
