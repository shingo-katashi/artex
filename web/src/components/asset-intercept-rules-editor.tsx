"use client";

import * as React from "react";

import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { AssetInterceptKind, AssetInterceptRuleInput } from "@/lib/types";

// NativeSelect（ <select>）비 shadcn Select：개편집기에서 Sheet 드로어내，
// shadcn Select 하 portal 까지 body、클릭외트리거드로어「클릭외꺼짐」；하없음이。
export const ASSET_INTERCEPT_KIND_OPTIONS: {
  value: AssetInterceptKind;
  label: string;
  placeholder: string;
}[] = [
  { value: "exact_domain", label: "도메인(전체 일치)", placeholder: "example.gov.cn" },
  { value: "exact_ip", label: "IP(전체 외)", placeholder: "203.0.113.10" },
  { value: "exact_url", label: "URL(전체 외)", placeholder: "https://example.com/login" },
  { value: "fuzzy_domain", label: "도메인(퍼지)", placeholder: ".gov.cn" },
  { value: "fuzzy_ip", label: "IP(퍼지)", placeholder: "203.0.113." },
  { value: "fuzzy_url", label: "URL(부분 일치)", placeholder: "/admin" },
  { value: "cidr", label: "CIDR 대역", placeholder: "192.168.0.0/16" },
];

// AssetInterceptRulesEditor 는「차단/허용규칙」다행편집（차단block/허용allow +
// 유형 + 일치내 + ），안 ——에 의해컴포넌트제출。
export function AssetInterceptRulesEditor({
  value,
  onChange,
}: {
  value: AssetInterceptRuleInput[];
  onChange: (v: AssetInterceptRuleInput[]) => void;
}) {
  function update(i: number, patch: Partial<AssetInterceptRuleInput>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, { action: "block", kind: "fuzzy_domain", pattern: "", note: "", enabled: true }]);
  }
  return (
    <div className="grid gap-2">
      {value.map((r, i) => {
        const ph = ASSET_INTERCEPT_KIND_OPTIONS.find((o) => o.value === r.kind)?.placeholder ?? "";
        return (
 // biome-ignore lint/suspicious/noArrayIndexKey: 행없음 id，
          <div key={i} className="flex items-center gap-2">
            <NativeSelect
              size="sm"
              className="w-[84px] shrink-0"
              value={r.action}
              onChange={(e) => update(i, { action: e.target.value as "block" | "allow" })}
            >
              <NativeSelectOption value="block">차단</NativeSelectOption>
              <NativeSelectOption value="allow">허용</NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              size="sm"
              className="w-[120px] shrink-0"
              value={r.kind}
              onChange={(e) => update(i, { kind: e.target.value as AssetInterceptKind })}
            >
              {ASSET_INTERCEPT_KIND_OPTIONS.map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input
              className="flex-1"
              placeholder={ph}
              value={r.pattern}
              onChange={(e) => update(i, { pattern: e.target.value })}
            />
            <Input
              className="w-[120px] shrink-0"
              placeholder="메모(선택)"
              value={r.note}
              onChange={(e) => update(i, { note: e.target.value })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive size-8 shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        );
      })}
      <Button type="button" size="sm" variant="outline" className="w-fit" onClick={add}>
        <PlusIcon className="size-4" /> 항목 추가
      </Button>
    </div>
  );
}
