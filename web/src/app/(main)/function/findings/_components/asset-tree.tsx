"use client";

import * as React from "react";

import {
 BuildingIcon,
 ChevronRightIcon,
 CircleDashedIcon,
 GlobeIcon,
 LayoutTemplateIcon,
 LinkIcon,
 type LucideIcon,
 NetworkIcon,
 RefreshCwIcon,
 SearchIcon,
 SmartphoneIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { FindingAssetKind, FindingAssetNode } from "@/lib/types";
import { cn } from "@/lib/utils";

// 자산페이지유형매핑,한 가지자산에서。
const KIND_ICON: Record<FindingAssetKind, LucideIcon> = {
 company: BuildingIcon,
 root_domain: GlobeIcon,
 subdomain: GlobeIcon,
 ip: NetworkIcon,
 app: SmartphoneIcon,
 service: LayoutTemplateIcon,
 endpoint: LinkIcon,
 none: CircleDashedIcon,
};

const KIND_LABEL: Record<FindingAssetKind, string> = {
 company: "기업",
 root_domain: "루트 도메인",
 subdomain: "하위 도메인",
 ip: "IP",
 app: "애플리케이션",
 service: "서비스",
 endpoint: "API",
 none: "미연관",
};

// TreeNode 는노드수。후「하발견다에서전」,
// 여기수。
interface TreeNode extends FindingAssetNode {
 children: TreeNode[];
 depth: number;
 /** 상글자;전체 label 보존에서 label (안내·)。 */
 display: string;
}

function stripBrackets(host: string) {
 return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function parseAssetURL(raw: string): URL | null {
 try {
 return new URL(raw);
 } catch {
 return null;
 }
}

// hostOf 개노드주:URL hostname,「host:port」 host,그는
// 태그이(루트 도메인 / 하위 도메인 / IP)。
function hostOf(label: string): string {
 const url = parseAssetURL(label);
 if (url) return stripBrackets(url.hostname);
 const hostPort = label.match(/^(.+):(\d+)$/);
 return stripBrackets(hostPort ? hostPort[1] : label);
}

// shortLabel ·노드중복전。service / endpoint label 는전체 URL,
// 주도메인/IP 상행이미 —— 노드이, host 중복,
// 정보량포트경로전체。전체값에서 title ·。
function shortLabel(node: FindingAssetNode, parent?: FindingAssetNode): string {
 if (!parent) return node.label;

 // 하위 도메인에서루트 도메인하:루트 도메인후,。
 if (node.kind === "subdomain" && node.label.endsWith(`.${parent.label}`)) {
 return node.label.slice(0, -(parent.label.length + 1)) || node.label;
 }
 if (node.kind !== "service" && node.kind !== "endpoint") return node.label;

 // 태그는전(API에서 URL 서비스하、서비스에서 IP 하):직접。
 if (node.label.startsWith(parent.label)) {
 return node.label.slice(parent.label.length) || node.label;
 }

 // 그렇지 않으면노드는개 URL 주,안 정보
 // (예:서비스때문하위 도메인자산행직접에서루트 도메인하,표시전체 URL)。
 if (hostOf(node.label) !== hostOf(parent.label)) return node.label;

 const url = parseAssetURL(node.label);
 if (!url) return node.label;
 if (node.kind === "endpoint") return `${url.pathname}${url.search}` || "/";
 const scheme = url.protocol.replace(":", "");
 const port = url.port || (url.protocol === "https:" ? "443" : "80");
 return `${scheme} :${port}`;
}

export function buildAssetTree(nodes: FindingAssetNode[]): TreeNode[] {
 const byKey = new Map<string, TreeNode>();
 for (const node of nodes) {
 byKey.set(node.key, { ...node, children: [], depth: 0, display: node.label });
 }
 const roots: TreeNode[] = [];
 for (const node of nodes) {
 const current = byKey.get(node.key);
 if (!current) continue;
 const parent = node.parent ? byKey.get(node.parent) : undefined;
 // 노드(급)상를최상위,안 개。
 if (parent) {
 parent.children.push(current);
 current.display = shortLabel(node, parent);
 } else {
 roots.push(current);
 }
 }
 const setDepth = (node: TreeNode, depth: number) => {
 node.depth = depth;
 for (const child of node.children) setDepth(child, depth + 1);
 };
 for (const root of roots) setDepth(root, 0);
 return roots;
}

// assetPathOf 반환부터최상위까지해당노드경로,에우。매급표시대상
// 상급량(display),전체값에서 label 。
export function assetPathOf(nodes: FindingAssetNode[], key: string | null): (FindingAssetNode & { display: string })[] {
 if (!key) return [];
 const byKey = new Map(nodes.map((n) => [n.key, n]));
 const path: FindingAssetNode[] = [];
 const seen = new Set<string>();
 let current = byKey.get(key);
 while (current && !seen.has(current.key)) {
 seen.add(current.key);
 path.unshift(current);
 current = current.parent ? byKey.get(current.parent) : undefined;
 }
 return path.map((node, index) => ({ ...node, display: shortLabel(node, path[index - 1]) }));
}

// filterTree 키워드:매칭노드보존,보존그건(가능안 매칭)。
// 매칭노드보존,에재개하。
function filterTree(nodes: TreeNode[], keyword: string): TreeNode[] {
 const kw = keyword.trim().toLowerCase();
 if (!kw) return nodes;
 const walk = (node: TreeNode): TreeNode | null => {
 const hit = node.label.toLowerCase().includes(kw);
 if (hit) return node;
 const children = node.children.map(walk).filter((c): c is TreeNode => c !== null);
 if (children.length === 0) return null;
 return { ...node, children };
 };
 return nodes.map(walk).filter((n): n is TreeNode => n !== null);
}

// collectKeys ()전체 key,에「펼치기전체일치건」。
function collectKeys(nodes: TreeNode[], out: Set<string> = new Set()): Set<string> {
 for (const node of nodes) {
 out.add(node.key);
 collectKeys(node.children, out);
 }
 return out;
}

interface AssetTreeProps {
 nodes: FindingAssetNode[];
 selected: string | null;
 onSelect: (key: string | null) => void;
 loading?: boolean;
 truncated?: boolean;
 droppedKinds?: string[];
 /** 미선택됨임의자산우표시발견수,에「전체자산」행。 */
 findingTotal: number;
 /** 자산뷰안 폴링,수개버튼또는페이지내새로고침。 */
 onRefresh?: () => void;
}

export function AssetTree({
 nodes,
 selected,
 onSelect,
 loading,
 truncated,
 droppedKinds,
 findingTotal,
 onRefresh,
}: AssetTreeProps) {
 const [keyword, setKeyword] = React.useState("");
 const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
 // 접기노드,「기본펼치기최상위」에서매차새로고침후그것。
 const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());

 const roots = React.useMemo(() => buildAssetTree(nodes), [nodes]);
 const visible = React.useMemo(() => filterTree(roots, keyword), [roots, keyword]);

 // 검색일치까지전체펼치기,그렇지 않으면매칭건에서접기노드 같음없음。
 const searching = keyword.trim() !== "";
 const searchKeys = React.useMemo(() => (searching ? collectKeys(visible) : null), [searching, visible]);

 const isExpanded = React.useCallback(
 (node: TreeNode) => {
 if (searchKeys) return searchKeys.has(node.key);
 if (expanded.has(node.key)) return true;
 // 최상위기본펼치기:급,한 번상행。
 return node.depth === 0 && !collapsed.has(node.key);
 },
 [collapsed, expanded, searchKeys],
 );

 const toggle = React.useCallback(
 (node: TreeNode) => {
 const open = isExpanded(node);
 setExpanded((prev) => {
 const next = new Set(prev);
 if (open) next.delete(node.key);
 else next.add(node.key);
 return next;
 });
 setCollapsed((prev) => {
 const next = new Set(prev);
 if (open) next.add(node.key);
 else next.delete(node.key);
 return next;
 });
 },
 [isExpanded],
 );

 let emptyHint = "현재필터하없음연관까지자산발견。";
 if (loading) emptyHint = "불러오는 중…";
 else if (searching) emptyHint = "없음일치자산。";

 const rows: React.ReactNode[] = [];
 const pushRows = (list: TreeNode[]) => {
 for (const node of list) {
 const open = isExpanded(node);
 rows.push(
 <AssetTreeRow
 key={node.key}
 node={node}
 open={open}
 selected={selected === node.key}
 onToggle={() => toggle(node)}
 onSelect={() => onSelect(selected === node.key ? null : node.key)}
 />,
 );
 if (open && node.children.length > 0) pushRows(node.children);
 }
 };
 pushRows(visible);

 return (
 <div className="flex min-h-0 flex-1 flex-col gap-2">
 <div className="flex items-center gap-1">
 <InputGroup className="flex-1">
 <InputGroupInput
 type="search"
 value={keyword}
 onChange={(event) => setKeyword(event.target.value)}
 placeholder="자산"
 aria-label="자산"
 />
 <InputGroupAddon>
 <SearchIcon aria-hidden="true" />
 </InputGroupAddon>
 </InputGroup>
 {onRefresh && (
 <Button
 size="icon"
 variant="ghost"
 className="size-8 shrink-0 text-muted-foreground"
 onClick={onRefresh}
 disabled={loading}
 aria-label="새로고침자산"
 title="새로고침자산"
 >
 <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
 </Button>
 )}
 </div>

 <button
 type="button"
 onClick={() => onSelect(null)}
 className={cn(
 "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
 selected === null ? "bg-accent font-medium" : "hover:bg-accent/50",
 )}
 >
 <span>전체자산</span>
 <span className="text-xs tabular-nums text-muted-foreground">{findingTotal}</span>
 </button>

 <div className="max-h-[24rem] min-h-0 flex-1 overflow-y-auto pr-2 lg:max-h-[calc(100vh-16rem)]">
 <div className="flex flex-col">
 {rows}
 {rows.length === 0 && <p className="px-2 py-8 text-center text-xs text-muted-foreground">{emptyHint}</p>}
 </div>
 </div>

 {truncated && (
 <p className="px-1 text-xs text-muted-foreground">
 자산다，{(droppedKinds ?? []).map((k) => KIND_LABEL[k as FindingAssetKind] ?? k).join(" / ")}
 급（수상）。필터또는까지전체급。
 </p>
 )}
 </div>
 );
}

function AssetTreeRow({
 node,
 open,
 selected,
 onToggle,
 onSelect,
}: {
 node: TreeNode;
 open: boolean;
 selected: boolean;
 onToggle: () => void;
 onSelect: () => void;
}) {
 const Icon = KIND_ICON[node.kind] ?? GlobeIcon;
 const hasChildren = node.children.length > 0;
 return (
 <div
 className={cn(
 "group flex items-center gap-1 rounded-md pr-1 text-sm",
 selected ? "bg-accent" : "hover:bg-accent/50",
 )}
 style={{ paddingLeft: `${node.depth * 10}px` }}
 >
 {hasChildren ? (
 <button
 type="button"
 onClick={onToggle}
 className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
 aria-label={open ? "접기" : "펼치기"}
 aria-expanded={open}
 >
 <ChevronRightIcon className={cn("size-3.5 transition-transform", open && "rotate-90")} />
 </button>
 ) : (
 <span className="size-5 shrink-0" />
 )}
 <button
 type="button"
 onClick={onSelect}
 className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
 title={`${KIND_LABEL[node.kind] ?? node.kind} · ${node.label}`}
 >
 <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
 <span className={cn("min-w-0 truncate", selected && "font-medium")}>{node.display}</span>
 </button>
 <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums">
 {node.critical > 0 && (
 <span className="text-rose-600" title={`치명 ${node.critical}`}>
 {node.critical}
 </span>
 )}
 {node.high > 0 && (
 <span className="text-red-500" title={`높음 ${node.high}`}>
 {node.high}
 </span>
 )}
 <span className="text-muted-foreground" title={`총 ${node.total} 건발견`}>
 {node.total}
 </span>
 </span>
 </div>
 );
}
