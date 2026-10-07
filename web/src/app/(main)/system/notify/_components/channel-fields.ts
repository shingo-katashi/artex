// 채널필드·구성값파싱도구。
//
// ·페이지는때문는**데이터**안 는뷰：설명매종채널어느필드、
// 각각해당무엇，및단이까지구성값（JSON）쌍로。
// 단개파일후，추가채널필요여기，페이지이안 。
// 채널유형표시이름·。에서전는때문영향문구，후안 필요。
export const KIND_LABEL: Record<string, string> = {
 dingtalk: "",
 feishu: "",
 wecom: "기업",
 webhook: " Webhook",
 telegram: "Telegram",
 email: "",
};

// 채널구성필드。
//
// 여기의도적으로보존전필드，안 는후하 schema：후
// Validate（/형식），UI 필요는레이아웃·유형，안 는。
// 유일는 secret_keys —— 어느필드해당비밀번호에 의해후에，
// 때문채널명확히어느값자격 증명（기업개 Webhook 는자격 증명，
// 는그중개 secret）。추가채널여기소개건단，
// 않음오류（하 hasFields 안내）。
export type FieldKind = "text" | "password" | "number" | "select" | "textarea" | "switch" | "kv" | "list";
export interface FieldDef {
 key: string;
 label: string;
 kind: FieldKind;
 placeholder?: string;
 help?: string;
 options?: { value: string; label: string }[];
}
export const CHANNEL_FIELDS: Record<string, FieldDef[]> = {
 dingtalk: [
 {
 key: "webhook",
 label: "Webhook 주소",
 kind: "text",
 placeholder: "https://oapi.dingtalk.com/robot/send?access_token=...",
 },
 {
 key: "secret",
 label: "",
 kind: "password",
 help: "기전체설정「」입력；「사용자 지정키워드」또는미켜짐전체설정비우기",
 },
 ],
 feishu: [
 {
 key: "webhook",
 label: "Webhook 주소",
 kind: "text",
 placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/...",
 },
 { key: "secret", label: "이름검증", kind: "password", help: "기켜짐「이름검증」입력，그렇지 않으면비우기" },
 ],
 wecom: [
 {
 key: "webhook",
 label: "Webhook 주소",
 kind: "text",
 placeholder: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...",
 },
 ],
 webhook: [
 { key: "url", label: "목표 URL", kind: "text", placeholder: "https://your-endpoint.example.com/hook" },
 {
 key: "method",
 label: "요청 메서드",
 kind: "select",
 options: [
 { value: "POST", label: "POST（요청）" },
 { value: "PUT", label: "PUT（요청）" },
 { value: "PATCH", label: "PATCH（요청）" },
 { value: "GET", label: "GET（안 요청）" },
 ],
 },
 { key: "headers", label: "사용자 지정요청", kind: "kv", help: "매행 KEY=VALUE，예: Authorization=Bearer xxx" },
 {
 key: "body_template",
 label: "요청템플릿",
 kind: "textarea",
 help:
 "비우기내장 사용기본템플릿。량：{{.Title}} {{.Batch}} {{.Count}} {{.HomeURL}} {{.SentAt}}，" +
 "및 range .Items 하 .Name/.VulnClass/.Severity/.Summary/.Assets/.DetailURL/.StatusLabel。" +
 "글자문자열 {{json .Xxx}} 안 는 {{.Xxx}}，그렇지 않으면제목 JSON。",
 },
 ],
 telegram: [
 { key: "bot_token", label: "Bot Token", kind: "password", placeholder: "123456:ABC-DEF..." },
 { key: "chat_id", label: "Chat ID", kind: "text", placeholder: "-1001234567890" },
 {
 key: "base_url",
 label: "API 주소",
 kind: "text",
 placeholder: "https://api.telegram.org",
 help: "비우기공식주소； Bot API 입력",
 },
 ],
 email: [
 { key: "host", label: "SMTP 서비스기", kind: "text", placeholder: "smtp.example.com" },
 {
 key: "port",
 label: "포트",
 kind: "number",
 placeholder: "587",
 help: "587 STARTTLS；465 「 TLS」열기",
 },
 { key: "username", label: "", kind: "text" },
 { key: "password", label: "비밀번호 / 권한코드", kind: "password" },
 { key: "from", label: "", kind: "text", placeholder: "artex@example.com" },
 { key: "to", label: "", kind: "list", help: "다개주소" },
 { key: "tls", label: " TLS", kind: "switch", help: "465 포트열기；587 유지꺼짐（자동 STARTTLS）" },
 ],
};

export const SEVERITY_OPTIONS = [
 { value: "", label: "제한 없음" },
 { value: "low", label: "낮음·상" },
 { value: "medium", label: "중간·상" },
 { value: "high", label: "높음·상" },
 { value: "critical", label: "치명" },
];

export type ChannelForm = {
 name: string;
 kind: string;
 mode: "realtime" | "digest";
 enabled: boolean;
 ratePerMin: string;
 config: Record<string, unknown>;
 minSeverity: string;
 includeText: string;
 excludeText: string;
 taskIDsText: string;
 assetIDsText: string;
 onStatusChange: boolean;
};

export const emptyForm = (kind: string): ChannelForm => ({
 name: "",
 kind,
 mode: "realtime",
 enabled: true,
 ratePerMin: "",
 config: {},
 minSeverity: "",
 includeText: "",
 excludeText: "",
 taskIDsText: "",
 assetIDsText: "",
 onStatusChange: false,
});

// parseKV 파싱「매행 KEY=VALUE」이。
export function parseKV(text: string): Record<string, string> {
 const out: Record<string, string> = {};
 for (const line of text.split("\n")) {
 const t = line.trim();
 if (!t) continue;
 const i = t.indexOf("=");
 if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
 }
 return out;
}
// parseIDs 파싱/ id 목록。
export function parseIDs(text: string): number[] {
 return text
 .split(/[\s,，]+/)
 .map((s) => s.trim())
 .filter(Boolean)
 .map((s) => Number(s))
 .filter((n) => Number.isFinite(n) && n > 0);
}
// parseKeywords 파싱행/키워드목록（취약점유형이름가능，따라서행또는）。
export function parseKeywords(text: string): string[] {
 return text
 .split(/[\n,，]+/)
 .map((s) => s.trim())
 .filter(Boolean);
}
