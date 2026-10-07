import type { NewAssetType } from "@/lib/types";

const ASSET_TYPE_LABELS: Record<NewAssetType, string> = {
 app: "애플리케이션",
 endpoint: "API",
 ip: "IP",
 root_domain: "루트 도메인",
 service: "서비스",
 subdomain: "하위 도메인",
};

const TASK_ASSET_SOURCE_LABELS: Record<string, string> = {
 agent: "Agent 발견",
 anchor: "",
 api: "자산 API",
 company: "기업연관",
 legacy: "이력연관",
 manual: "",
 system: "시스템연관",
 task: "작업초기",
};

export function taskAssetTypeLabel(type: NewAssetType): string {
 return ASSET_TYPE_LABELS[type];
}

export function taskAssetSourceLabel(source: string): string {
 return TASK_ASSET_SOURCE_LABELS[source] ?? source;
}
