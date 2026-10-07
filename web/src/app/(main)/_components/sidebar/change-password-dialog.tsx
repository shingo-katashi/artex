"use client";

import * as React from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ChangePasswordDialog({
 open,
 onOpenChange,
}: {
 readonly open: boolean;
 readonly onOpenChange: (open: boolean) => void;
}) {
 const [oldPassword, setOldPassword] = React.useState("");
 const [newPassword, setNewPassword] = React.useState("");
 const [confirmPassword, setConfirmPassword] = React.useState("");
 const [saving, setSaving] = React.useState(false);

 // reset fields whenever the dialog closes
 React.useEffect(() => {
 if (!open) {
 setOldPassword("");
 setNewPassword("");
 setConfirmPassword("");
 }
 }, [open]);

 function submit(e: React.FormEvent) {
 e.preventDefault();
 if (!oldPassword || !newPassword) {
 toast.error("입력하세요현재비밀번호신비밀번호");
 return;
 }
 if (newPassword !== confirmPassword) {
 toast.error("차입력신비밀번호안 일치");
 return;
 }
 setSaving(true);
 api
 .changePassword(oldPassword, newPassword)
 .then(() => {
 toast.success("비밀번호변경");
 onOpenChange(false);
 })
 .catch((err) => toast.error(`변경실패：${(err as Error).message}`))
 .finally(() => setSaving(false));
 }

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-md">
 <form onSubmit={submit}>
 <DialogHeader>
 <DialogTitle>변경비밀번호</DialogTitle>
 <DialogDescription>
 사용자 이름고정를 <b>ARTEX</b>。입력현재비밀번호검증；변경후로그인 token 。
 </DialogDescription>
 </DialogHeader>
 <div className="flex flex-col gap-3 py-4">
 <div className="flex flex-col gap-1.5">
 <Label htmlFor="cp-old">현재비밀번호</Label>
 <Input
 id="cp-old"
 type="password"
 autoComplete="current-password"
 value={oldPassword}
 disabled={saving}
 onChange={(e) => setOldPassword(e.target.value)}
 />
 </div>
 <div className="flex flex-col gap-1.5">
 <Label htmlFor="cp-new">신비밀번호</Label>
 <Input
 id="cp-new"
 type="password"
 autoComplete="new-password"
 value={newPassword}
 disabled={saving}
 onChange={(e) => setNewPassword(e.target.value)}
 />
 </div>
 <div className="flex flex-col gap-1.5">
 <Label htmlFor="cp-confirm">확인신비밀번호</Label>
 <Input
 id="cp-confirm"
 type="password"
 autoComplete="new-password"
 value={confirmPassword}
 disabled={saving}
 onChange={(e) => setConfirmPassword(e.target.value)}
 />
 </div>
 </div>
 <DialogFooter>
 <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
 취소
 </Button>
 <Button type="submit" disabled={saving}>
 {saving ? "변경중…" : "확인변경"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
