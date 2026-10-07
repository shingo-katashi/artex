import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}

// 드로어/대화(Sheet/Dialog) onInteractOutside 꺼짐。
//
// :드로어내 Radix (Select 하、DropdownMenu、Popover 외) portal 까지드로어
// 외。/드로어외접기,한 번 pointerdown Select Sheet 개
// DismissableLayer ;Select 꺼짐는 discrete 、React 동기화 flush,에는
// 까지 Sheet 기 data-state closed —— 에서"하"여부열기
// 안 (검증)。
//
// :Radix pointerdown 에서;에서 capture (에)
// "이없음"기록하,onInteractOutside 개기록값여부행꺼짐。
function isRadixOverlayOpenNow(): boolean {
 if (typeof document === "undefined") return false;
 return !!document.querySelector(
 [
 "[data-slot='select-trigger'][data-state='open']",
 "[data-slot='select-content'][data-state='open']",
 "[role='listbox'][data-state='open']",
 "[data-radix-popper-content-wrapper]",
 "[aria-expanded='true'][data-state='open']",
 ].join(","),
 );
}

let overlayOpenAtLastPointerDown = false;
if (typeof document !== "undefined") {
 document.addEventListener(
 "pointerdown",
 () => {
 overlayOpenAtLastPointerDown = isRadixOverlayOpenNow();
 },
 true, // capture:에서 Radix pointerdown 기이전기록
 );
}

// radixOverlayWasOpenAtPointerDown 반환"최근한 번 pointerdown 발생여부 Radix
// "。드로어/대화이: → 、안 。
export function radixOverlayWasOpenAtPointerDown(): boolean {
 return overlayOpenAtLastPointerDown;
}

// copyText 이,반환여부성공。
// :navigator.clipboard 에서전체컨텍스트(HTTPS / localhost);승인 IP + HTTP
// 를 undefined,이급까지 execCommand("copy")。
export async function copyText(text: string): Promise<boolean> {
 if (navigator.clipboard && window.isSecureContext) {
 try {
 await navigator.clipboard.writeText(text);
 return true;
 } catch {
 // 재개급
 }
 }
 try {
 const textarea = document.createElement("textarea");
 textarea.value = text;
 textarea.style.position = "fixed";
 textarea.style.left = "-9999px";
 textarea.style.top = "0";
 document.body.appendChild(textarea);
 textarea.focus();
 textarea.select();
 const ok = document.execCommand("copy");
 document.body.removeChild(textarea);
 return ok;
 } catch {
 return false;
 }
}

export const getInitials = (str: string): string => {
 if (typeof str !== "string" || !str.trim()) return "?";

 return (
 str
 .trim()
 .split(/\s+/)
 .filter(Boolean)
 .map((word) => word[0])
 .join("")
 .toUpperCase() || "?"
 );
};

export function formatCurrency(
 amount: number,
 opts?: {
 currency?: string;
 locale?: string;
 minimumFractionDigits?: number;
 maximumFractionDigits?: number;
 noDecimals?: boolean;
 },
) {
 const { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

 const formatOptions: Intl.NumberFormatOptions = {
 style: "currency",
 currency,
 minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
 maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
 };

 return new Intl.NumberFormat(locale, formatOptions).format(amount);
}
