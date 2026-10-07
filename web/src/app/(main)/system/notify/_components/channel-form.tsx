"use client";

import { CheckIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationFilter } from "@/lib/types";

// asText / inputType 는이파일내값（·），안 에서 channel-fields。
import { type FieldDef, type FieldKind, SEVERITY_OPTIONS } from "./channel-fields";

// asText 임의구성값입력글자문자열。
// config 출처 JSON，값가능는 string / number / boolean / array / null，
// 여기「불가이」，열에 의해 buildConfig 。
function asText(v: unknown): string {
 if (typeof v === "string") return v;
 if (v === null || v === undefined) return "";
 return String(v);
}

// inputType 필드유형매핑까지 input type 。
function inputType(kind: FieldKind): "text" | "password" | "number" {
 if (kind === "password") return "password";
 if (kind === "number") return "number";
 return "text";
}

// ConfigField 필드대상。
//
// 코드필드는여기유일：입력**안 표시**코드값이，표시행
// 「저장」안내。상만개규칙——글자는，
// 는값。 "__masked__:…abc123" 입력，를는
// 이，자격 증명。
export function ConfigField({
 def,
 value,
 isSecret,
 onChange,
}: {
 def: FieldDef;
 value: unknown;
 isSecret: boolean;
 onChange: (v: unknown) => void;
}) {
 const id = `n-cfg-${def.key}`;
 const raw = asText(value);
 // 후반환코드값：예: "__masked__:…abc123"，는값조각。
 const masked = isSecret && raw.startsWith("__masked__");
 const maskedTail = masked ? (raw.split("…")[1] ?? "") : "";

 if (def.kind === "switch") {
 return (
 <div className="flex items-center gap-2 text-sm">
 <Switch checked={value === true} onCheckedChange={onChange} aria-label={def.label} />
 {def.label}
 {def.help && <span className="text-muted-foreground">（{def.help}）</span>}
 </div>
 );
 }

 if (def.kind === "select") {
 return (
 <div className="grid gap-2">
 <Label>{def.label}</Label>
 <Select value={raw || def.options?.[0]?.value} onValueChange={onChange}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {(def.options ?? []).map((o) => (
 <SelectItem key={o.value} value={o.value}>
 {o.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 );
 }

 // 필드유형。 if 안 는，는때문여기종，
 // 이미하수。
 function control() {
 if (def.kind === "textarea" || def.kind === "kv") {
 return (
 <Textarea
 id={id}
 className="font-mono"
 placeholder={def.placeholder}
 value={masked ? "" : raw}
 onChange={(e) => onChange(e.target.value)}
 />
 );
 }
 if (def.kind === "list") {
 return (
 <Input
 id={id}
 value={Array.isArray(value) ? (value as string[]).join(", ") : raw}
 onChange={(e) => onChange(e.target.value)}
 placeholder={def.placeholder}
 />
 );
 }
 return (
 <Input
 id={id}
 className={def.kind === "text" ? "font-mono" : ""}
 type={inputType(def.kind)}
 placeholder={def.placeholder}
 value={masked ? "" : raw}
 onChange={(e) => onChange(e.target.value)}
 />
 );
 }

 const hint = masked ? (
 <p className="text-muted-foreground flex items-center gap-1 text-xs">
 <CheckIcon className="size-3" />
 저장{maskedTail ? `（ ${maskedTail}）` : ""} · 신값커버，비우기삭제해당건
 </p>
 ) : (
 def.help && <p className="text-muted-foreground text-xs">{def.help}</p>
 );

 return (
 <div className="grid gap-2">
 <Label htmlFor={id}>{def.label}</Label>
 {control()}
 {hint}
 </div>
 );
}

// FilterSummary 건요약행，카드안 펼치기으로개채널무엇。
export function FilterSummary({ filter }: { filter: NotificationFilter }) {
 const parts: string[] = [];
 if (filter.min_severity) {
 parts.push(SEVERITY_OPTIONS.find((o) => o.value === filter.min_severity)?.label ?? filter.min_severity);
 }
 if (filter.vulnclass_include?.length) parts.push(`유형 ${filter.vulnclass_include.length} `);
 if (filter.vulnclass_exclude?.length) parts.push(`제외 ${filter.vulnclass_exclude.length} `);
 if (filter.task_ids?.length) parts.push(`${filter.task_ids.length}개 작업`);
 if (filter.asset_ids?.length) parts.push(`${filter.asset_ids.length}개 자산`);
 if (filter.on_status_change) parts.push("상태");
 if (parts.length === 0) {
 return <p className="text-muted-foreground text-sm">전체취약점</p>;
 }
 return <p className="text-muted-foreground text-sm">{parts.join(" · ")}</p>;
}
