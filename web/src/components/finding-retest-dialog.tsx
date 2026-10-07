"use client";

import * as React from "react";

import { RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { FindingRetest } from "@/lib/types";

interface FindingRetestDialogProps {
 findingId: string;
 findingName?: string;
 onClose: () => void;
 onStarted?: (retest: FindingRetest) => void;
}

// 에서열기，꺼짐후비우기설명；목록·상세제출·오류，시작후에서현재페이지。
export function FindingRetestDialog({ findingId, findingName, onClose, onStarted }: FindingRetestDialogProps) {
 const notesId = React.useId();
 const [notes, setNotes] = React.useState("");
 const [submitting, setSubmitting] = React.useState(false);
 const submitLock = React.useRef(false);

 async function start() {
 if (submitLock.current) return;
 submitLock.current = true;
 setSubmitting(true);
 try {
 const result = await api.startFindingRetest(findingId, notes.trim());
 onStarted?.(result.retest);
 onClose();
 toast.success(result.created ? "재검증시작，클릭「재검증 중」보기세션" : "해당취약점진행 중재검증，보기세션");
 } catch (e) {
 toast.error(`재검증 시작실패：${(e as Error).message}`);
 } finally {
 submitLock.current = false;
 setSubmitting(false);
 }
 }

 return (
 <Dialog open onOpenChange={(open) => !open && !submitLock.current && onClose()}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>재검증취약점 #{findingId}</DialogTitle>
 <DialogDescription className="break-words">
 {findingName ? <span className="mb-2 block">{findingName}</span> : null}
 재검증 Agent
 읽기증거테스트제약，에서독립세션중실행대상검증。재검증성공완료확인수정후，취약점상태자동를「수정됨」，그보존이전 상태。
 </DialogDescription>
 </DialogHeader>
 <FieldGroup>
 <Field data-disabled={submitting}>
 <FieldLabel htmlFor={notesId}>설명（선택）</FieldLabel>
 <Textarea
 id={notesId}
 value={notes}
 maxLength={4000}
 rows={4}
 disabled={submitting}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="예:：테스트검증API；수정이를 v2。"
 />
 <FieldDescription>수정이、테스트건또는이차제한。</FieldDescription>
 </Field>
 </FieldGroup>
 <DialogFooter>
 <Button variant="outline" disabled={submitting} onClick={onClose}>
 취소
 </Button>
 <Button disabled={submitting} onClick={() => void start()}>
 {submitting ? <Spinner data-icon="inline-start" /> : <RotateCcwIcon data-icon="inline-start" />}
 {submitting ? "진행 중생성…" : "시작재검증"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
