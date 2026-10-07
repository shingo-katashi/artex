"use client";

import * as React from "react";

import { getLocalStorageValue, setLocalStorageValue } from "@/lib/local-storage.client";

// 세션입력전송/행키。전： localStorage，안 、안 동기화，
// 이기필요。 issue #39——0.3.2 Ctrl+Enter 전송 Enter 전송，
// 여기구키를선택건。
export type ChatSendMode = "enter" | "ctrl-enter";

export const CHAT_SEND_MODE_KEY = "artex_chat_send_mode";
export const DEFAULT_CHAT_SEND_MODE: ChatSendMode = "enter";

export const CHAT_SEND_MODE_OPTIONS: { value: ChatSendMode; label: string }[] = [
  { value: "enter", label: "Enter로 전송, Shift+Enter로 줄바꿈" },
  { value: "ctrl-enter", label: "Ctrl+Enter로 전송, Enter로 줄바꿈" },
];

function parseMode(raw: string | null): ChatSendMode {
  return raw === "ctrl-enter" || raw === "enter" ? raw : DEFAULT_CHAT_SEND_MODE;
}

// 태그페이지내。localStorage storage 에서「그」태그페이지트리거，
// 이페이지에서설정후 emit 알림페이지입력，그렇지 않으면새로고침적용。
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// 반환는글자문자열글자량，Object.is 값，않음 useSyncExternalStore 。
function getSnapshot(): ChatSendMode {
  return parseMode(getLocalStorageValue(CHAT_SEND_MODE_KEY));
}

// 서비스없음 localStorage，기본값，hydrate 후 getSnapshot 。
function getServerSnapshot(): ChatSendMode {
  return DEFAULT_CHAT_SEND_MODE;
}

export function useChatSendMode(): ChatSendMode {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setChatSendMode(mode: ChatSendMode) {
  setLocalStorageValue(CHAT_SEND_MODE_KEY, mode);
  for (const listener of listeners) listener();
}

// shouldSubmitOnKey 한 번키여부전송。
// isComposing / keyCode 229 는중 외입력진행 중글자，필수행，그렇지 않으면전송。
// enter 모드제외 Shift，· 0.3.2 행를글자유지일치——안 설정안 。
// ctrl-enter 모드허용 Ctrl · Cmd（macOS）。
export function shouldSubmitOnKey(e: React.KeyboardEvent, mode: ChatSendMode): boolean {
  if (e.key !== "Enter") return false;
  if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return false;
  if (mode === "ctrl-enter") return e.ctrlKey || e.metaKey;
  return !e.shiftKey;
}
