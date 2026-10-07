// Mock 토글。인젝션량（NEXT_PUBLIC_ 전에서기읽기 가능）。
// Vercel 상 NEXT_PUBLIC_MOCK=1 mock、없음후。
export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";
