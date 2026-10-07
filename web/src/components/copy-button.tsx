"use client";

import * as React from "react";

import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn, copyText } from "@/lib/utils";

type CopyButtonProps = {
 // 복사이;를버튼。
 text: string | null | undefined;
 // 복사성공후 toast 문구,기본「복사됨」。
 successMessage?: string;
 label?: React.ReactNode;
 size?: React.ComponentProps<typeof Button>["size"];
 variant?: React.ComponentProps<typeof Button>["variant"];
 className?: string;
};

// CopyButton 「복사까지」버튼:내장성공/실패,에서 HTTP 비전체컨텍스트
// 하자동급( copyText)。
export function CopyButton({
 text,
 successMessage = "복사됨",
 label = "복사",
 size = "sm",
 variant = "outline",
 className,
}: CopyButtonProps) {
 const [copied, setCopied] = React.useState(false);
 const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

 React.useEffect(() => {
 return () => {
 if (timer.current) clearTimeout(timer.current);
 };
 }, []);

 async function handleCopy() {
 if (!text) return;
 const ok = await copyText(text);
 if (ok) {
 setCopied(true);
 toast.success(successMessage);
 if (timer.current) clearTimeout(timer.current);
 timer.current = setTimeout(() => setCopied(false), 1500);
 } else {
 toast.error("복사 실패，선택이복사");
 }
 }

 return (
 <Button
 type="button"
 size={size}
 variant={variant}
 className={cn(className)}
 disabled={!text}
 onClick={handleCopy}
 >
 {copied ? <CheckIcon /> : <CopyIcon />}
 {label}
 </Button>
 );
}
