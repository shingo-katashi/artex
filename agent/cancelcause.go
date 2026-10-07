package agent

import (
	"context"
	"errors"
	"fmt"
)

// AbortCause names why an agent run's context was cancelled. Every cancellation
// site should attach one so the activity trace can report the real initiator.
type AbortCause struct {
	Code  string
	Short string
	Text  string
}

func (c *AbortCause) Error() string { return c.Text }

func cause(code, short, text string) *AbortCause {
	return &AbortCause{Code: code, Short: short, Text: text}
}

// Causef builds a cause that includes runtime-specific detail.
func Causef(code, short, format string, args ...any) *AbortCause {
	return &AbortCause{Code: code, Short: short, Text: fmt.Sprintf(format, args...)}
}

var (
	// Task-level execution context.
	AbortPausedByUser = cause("paused_by_user", "사용자가 작업을 일시정지함",
		"사용자가 작업 제어 API(POST /api/tasks/{id}/control, action=pause)로 작업을 일시정지했습니다. 이번 Planner/Worker 실행이 취소되었습니다. 실행 중인 의도는 frontier(open)으로 돌아가며, 작업을 재개하면 다시 claim되어 처음부터 실행됩니다.")
	AbortPausedByOrchestrator = cause("paused_by_orchestrator", "오케스트레이션 Agent가 작업을 일시정지함",
		"오케스트레이션 Agent가 pause_task 도구로 이 작업을 일시정지했습니다. 이번 Planner/Worker 실행이 취소되었습니다. 실행 중인 의도는 frontier(open)으로 돌아가며, 재개 후 다시 실행됩니다.")
	AbortTaskDeleted = cause("task_deleted", "작업이 삭제됨",
		"작업이 삭제 중입니다(DELETE /api/tasks/{id}). 삭제 장벽이 해당 작업에서 실행 중인 Planner, Worker, 메인 Agent를 취소했습니다. 이번 실행 결과는 더 이상 사용되지 않습니다.")
	AbortPausedOnReload = cause("paused_on_reload", "백엔드가 작업의 일시정지 상태를 복원함",
		"백엔드 시작 시 DB에 저장된 상태에 따라 작업 일시정지가 복원되었습니다. 이번 실행이 취소되었습니다. 정상적으로는 복원 단계에 실행 중인 Agent가 없습니다.")
	AbortGoalMet = cause("goal_met", "플래너가 작업 목표 달성을 판정함",
		"플래너가 작업 목표를 달성한 것으로 판정하고 작업을 done으로 두었으며, 이후 실행 중인 Worker를 취소했습니다. 해당 의도는 실패가 아니라 stopped로 표시됩니다.")
	AbortSettleDrainTimeout = cause("settle_drain_timeout", "작업 타임아웃 마무리 대기 시간 소진",
		"작업이 timeout에 도달한 뒤 실행 중인 Worker의 정상 종료를 기다렸지만 90초 drain 유예로도 부족하여 강제 취소했습니다. 의도는 exhausted로 표시되며, 마무리 단계에서 이미 기록된 사실과 자산은 유지됩니다.")

	// Per-work context.
	AbortKilledByPlanner = cause("killed_by_planner", "플래너가 이 의도를 종료함",
		"플래너가 kill_work를 호출해 이 의도를 종료했습니다. 보통 방향이 빗나갔거나 더 진행할 가치가 없을 때입니다. 의도는 stopped로 표시되며 자동으로 다시 claim되지 않습니다.")
	AbortWorkPausedByUser = cause("work_paused_by_user", "사용자가 이 Worker 의도를 일시정지함",
		"사용자가 실행 중인 Worker를 일시정지했습니다. 이번 호출이 취소되고 의도는 paused 상태입니다. 이미 등록된 의도, 사실, 취약점, 활동 기록은 모두 유지되며, 재개 후 처음부터 다시 실행됩니다.")
	AbortWorkCancelledByUser = cause("work_cancelled_by_user", "사용자가 이 Worker 의도를 삭제함",
		"사용자가 실행 중인 Worker를 삭제했습니다. 이번 호출이 취소됩니다. Worker가 쓰기 구역을 벗어난 뒤 서버는 사용자가 선택한 삭제 모드로 의도를 처리합니다. 소프트 삭제는 삭제됨으로만 표시하고 모든 결과를 유지하고, 하드 삭제는 이 의도와 이 의도만이 지탱하는 하위 노드를 연쇄 제거합니다.")
	AbortWorkFinished = cause("work_finished", "Worker가 정상 종료되어 context를 해제함",
		"Worker가 정상 종료되었고 엔진이 detachWork에서 context를 해제했습니다. 이것은 실행 중단이 아닙니다. 중단 메시지에 나타나면 취소와 종료 이벤트가 경쟁한 것입니다.")
	AbortPausedRaceGuard = cause("paused_race_guard", "작업 일시정지 중 새 실행 시작 거부",
		"작업이 일시정지 상태일 때 엔진은 새 실행 context를 발급하지 않아 claim과 일시정지 사이의 경쟁으로 Worker가 계속 시작되는 것을 막습니다. 이미 claim된 의도는 frontier로 돌아갑니다.")

	// Main Agent and standalone conversation contexts.
	AbortChatStoppedByUser = cause("chat_stopped_by_user", "사용자가 이번 대화를 중지함",
		"사용자가 중지를 눌러 이번 메인 Agent 또는 세션 Agent 실행을 중단했습니다. 이미 생성된 활동 기록은 유지되며 다음 메시지를 보낼 수 있습니다.")
	AbortChatPausedWithTask = cause("chat_paused_with_task", "작업 일시정지로 메인 Agent 대화가 중단됨",
		"사용자가 작업을 일시정지할 때 실행 중인 메인 Agent 대화도 함께 취소되었습니다. 활동 기록은 유지되며, 작업 재개 후 이번 메시지는 자동 재생되지 않습니다.")
	AbortChatTurnFinished = cause("chat_turn_finished", "이번 대화가 정상 종료되어 context 해제됨",
		"이번 대화가 정상 종료되었고 서버가 해당 라운드 context를 해제 중입니다. 실행 중단이 아닙니다. 중단 메시지에 나타나면 취소와 종료 이벤트가 경쟁한 것입니다.")

	// Process-level and per-run hard backstop.
	AbortShutdown = cause("shutdown", "백엔드 프로세스 종료 중",
		"백엔드가 SIGINT 또는 SIGTERM을 받아 재시작, 업데이트 또는 종료 중입니다. 실행 중인 모든 Agent가 취소됩니다. 재시작 후 남은 running 의도는 open으로 재설정되어 다시 실행됩니다.")
	AbortRunHardTimeout = cause("run_hard_timeout", "단일 실행 하드 타임아웃 안전장치 발동",
		"단일 실행이 소프트 월클럭 예산과 추가 유예를 초과했습니다. 모델 요청 또는 어떤 도구가 오래 응답하지 않아 정상적인 라운드 경계 마무리가 불가능했습니다. 중단 직전 마지막으로 반환되지 않은 도구 호출을 우선 확인하세요.")
)

// AbortReason resolves the named cause attached to a cancelled run context.
func AbortReason(ctx context.Context) (code, short, text string, ok bool) {
	c := context.Cause(ctx)
	if c == nil {
		return "", "", "", false
	}
	var ac *AbortCause
	if errors.As(c, &ac) {
		return ac.Code, ac.Short, ac.Text, true
	}
	switch {
	case errors.Is(c, context.DeadlineExceeded):
		return "deadline_exceeded", "상위 context가 deadline에 도달함",
			"상위 context가 deadline에 도달했지만 설정자가 WithTimeoutCause로 명명된 원인을 붙이지 않았습니다: " + c.Error(), true
	case errors.Is(c, context.Canceled):
		return "canceled_no_cause", "취소자가 명명된 원인을 붙이지 않음",
			"상위 context가 취소되었지만 취소자가 context.WithCancelCause로 명명된 원인을 붙이지 않았습니다. agent/cancelcause.go에 원인을 등록하고 해당 취소 지점에 연결하세요.", true
	default:
		return "other", firstLine(c.Error(), 80), c.Error(), true
	}
}
