package agent

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Autumn-27/norma/harness"
)

// runTrace retains the latest tool call so an interrupted run can identify the
// operation that was still in flight.
type runTrace struct {
	startedAt time.Time
	id        string
	name      string
	input     string
	at        time.Time
	pending   bool
}

func (t *runTrace) start(id, name, input string) {
	t.id, t.name, t.input, t.at, t.pending = id, name, input, time.Now(), true
}

func (t *runTrace) done(id string) {
	if id == t.id {
		t.pending = false
	}
}

var reasonHint = map[harness.TerminalReason]string{
	harness.ReasonCompleted:         "모델이 이번 라운드를 정상 종료했지만 문자 요약을 남기지 않았습니다. 사실과 자산은 이번 도구 호출 기록을 기준으로 합니다.",
	harness.ReasonMaxTurns:          "스텝 상한(MaxTurns)에 도달: SDK가 마무리를 실행하고 사실·자산을 기록했으며, 의도는 exhausted로 표시되어 플래너가 방향을 바꿔 계속할 수 있습니다(실패 처리 아님).",
	harness.ReasonTimeout:           "단일 실행 월클럭 예산(MaxDuration)에 도달: 시간이 되면 실행 중 도구를 끊고 그 자리에서 마무리하여 확인된 사실·자산을 기록하고, 의도는 exhausted로 표시됩니다.",
	harness.ReasonModelError:        "모델 또는 API 호출 실패(네트워크, 인증, rate limit, 공급자 5xx 등). 재시도 소진 후 의도는 blocked — 전송 계층 오류로 이 의도는 거의 탐색되지 못했습니다. get_worker_trace로 실행 과정을 확인한 뒤 재배정 또는 다른 방법을 결정하세요.",
	harness.ReasonBlockingLimit:     "컨텍스트 길이가 하드 상한에 도달하여 요청이 전송 전에 차단됨. 의도 세분화를 줄이거나 도구 반환을 압축하세요.",
	harness.ReasonPromptTooLong:     "프롬프트가 너무 길고 컨텍스트 압축 재시도가 소진되어 계속할 수 없습니다.",
	harness.ReasonImageError:        "현재 모델이 이번 멀티모달 콘텐츠를 지원하지 않습니다. 비전 지원 모델로 전환하거나 도구가 이미지를 반환하지 않도록 하세요.",
	harness.ReasonStopHookPrevented: "Stop 훅이 이번 라운드 종료를 막았고 이후 계속하지 못함. 작업 Guard 규칙이 너무 엄격한지 확인하세요.",
	harness.ReasonHookStopped:       "도구 또는 훅이 실행을 중단함(예: 범위 밖 목표, 금지 명령). 마지막 tool_result의 차단 설명을 확인하세요.",
	harness.ReasonAbortedStreaming:  "모델 출력 스트리밍 단계에서 실행이 취소됨",
	harness.ReasonAbortedTools:      "도구 실행 단계에서 실행이 취소됨",
}

// terminalText renders a terminal event with no final text into a compact summary
// and a Markdown detail block.
func terminalText(ctx context.Context, term *harness.Terminal, tr *runTrace) (string, string) {
	reason := term.Reason
	aborted := reason == harness.ReasonAbortedStreaming || reason == harness.ReasonAbortedTools
	// Prompt may return ctx.Err directly without a terminal event. Preserve the
	// cancellation cause instead of falling back to an empty/unknown terminal reason.
	if reason == "" && ctx.Err() != nil {
		aborted = true
	}

	var sum string
	if aborted {
		_, short, _, ok := AbortReason(ctx)
		if !ok {
			short = "취소 원인을 가져오지 못함"
		}
		stage := "실행 중"
		switch reason {
		case harness.ReasonAbortedStreaming:
			stage = "모델 출력 단계"
		case harness.ReasonAbortedTools:
			stage = "도구 실행 단계"
		}
		sum = "(실행이 중단됨: " + short + "; " + stage + "에서 멈춤" + progressSuffix(term, tr) + ", 미완료)"
	} else if reason == harness.ReasonMaxTurns || reason == harness.ReasonTimeout {
		sum = "(실행 예산 상한(" + string(reason) + ")에 도달, 사실 기록 마무리 완료" + progressSuffix(term, tr) + "; 이번에는 문자 요약 없음)"
	} else {
		hint := terminalReasonHint(reason)
		sum = "(문자 요약 없음, 종료 상태 " + terminalReasonLabel(reason) + ": " + firstLine(hint, 80) + ")"
	}

	var b strings.Builder
	b.WriteString(sum)
	b.WriteString("\n\n")
	displayReason := terminalReasonLabel(reason)
	fmt.Fprintf(&b, "- **종료 상태**: `%s` - %s\n", displayReason, terminalReasonHint(reason))
	if aborted {
		code, _, why, ok := AbortReason(ctx)
		if ok {
			fmt.Fprintf(&b, "- **중단 원인** (`%s`): %s\n", code, why)
		} else {
			b.WriteString("- **중단 원인**: 확인 불가; 취소자가 context.WithCancelCause로 명명된 원인을 붙이지 않았을 수 있습니다\n")
		}
	}
	if term.Err != nil {
		fmt.Fprintf(&b, "- **하위 오류**: `%v`\n", term.Err)
	}
	if aborted && strings.TrimSpace(term.Text) != "" {
		b.WriteString("- **취소 전 생성된 부분 출력**:\n\n")
		b.WriteString(term.Text)
		b.WriteString("\n\n")
	}
	if term.Turns > 0 {
		fmt.Fprintf(&b, "- **실행됨**: %d 라운드 모델 턴\n", term.Turns)
	}
	if !tr.startedAt.IsZero() {
		fmt.Fprintf(&b, "- **이번 실행 소요**: %s\n", roundDur(time.Since(tr.startedAt)))
	}
	if u := term.Usage; u.InputTokens+u.OutputTokens+u.CacheReadTokens+u.CacheWriteTokens > 0 {
		fmt.Fprintf(&b, "- **누적 token**: 입력 %d / 출력 %d / 캐시 읽기 %d / 캐시 쓰기 %d\n",
			u.InputTokens, u.OutputTokens, u.CacheReadTokens, u.CacheWriteTokens)
	}
	if tr.name == "" {
		b.WriteString("- **도구 호출**: 이번 실행에서 도구 호출 없이 종료됨\n")
	} else if tr.pending {
		fmt.Fprintf(&b, "- **중단 시 실행 중인 도구**: `%s` (%s 실행됨, **결과 미반환**)\n\n  ```json\n  %s\n  ```\n",
			tr.name, roundDur(time.Since(tr.at)), firstLine(tr.input, 300))
	} else {
		fmt.Fprintf(&b, "- **중단 직전 마지막 도구**: `%s` (정상 반환)\n", tr.name)
	}
	return sum, b.String()
}

func terminalReasonLabel(reason harness.TerminalReason) string {
	if reason == "" {
		return "context_canceled"
	}
	return string(reason)
}

func terminalReasonHint(reason harness.TerminalReason) string {
	if hint := reasonHint[reason]; hint != "" {
		return hint
	}
	if reason == "" {
		return "실행 context가 취소되었지만 하위에서 Terminal 이벤트가 발생하지 않음"
	}
	return "알 수 없는 종료 상태；harness에 새 TerminalReason이 추가되었을 수 있으니 reasonHint를 보완하세요"
}

func progressSuffix(term *harness.Terminal, tr *runTrace) string {
	var parts []string
	if term.Turns > 0 {
		parts = append(parts, fmt.Sprintf("%d 라운드", term.Turns))
	}
	if !tr.startedAt.IsZero() {
		parts = append(parts, roundDur(time.Since(tr.startedAt)))
	}
	if len(parts) == 0 {
		return ""
	}
	return ", 실행 " + strings.Join(parts, " / ")
}

func roundDur(d time.Duration) string {
	switch {
	case d < time.Minute:
		return d.Round(100 * time.Millisecond).String()
	case d < time.Hour:
		return d.Round(time.Second).String()
	default:
		return d.Round(time.Minute).String()
	}
}
