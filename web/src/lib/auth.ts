const TOKEN_KEY = "artex_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 （초）

export interface CurrentUser {
 id: string;
 name: string;
 username: string;
 email: string;
 avatar: string;
 role: string;
}

export const auth = {
 getToken(): string | null {
 if (typeof window === "undefined") return null;
 // Mock demo：없음로그인，반환개 token 에 의해행、직접주。
 return localStorage.getItem(TOKEN_KEY) ?? (process.env.NEXT_PUBLIC_MOCK === "1" ? "mock-demo" : null);
 },

 setToken(token: string): void {
 localStorage.setItem(TOKEN_KEY, token);
 // 동기화 cookie， Next.js middleware 서비스읽기
 document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
 },

 clearToken(): void {
 localStorage.removeItem(TOKEN_KEY);
 document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
 },

 // 부터 JWT payload sub 필드파싱현재，에표시，안 이름검증。
 getCurrentUser(): CurrentUser | null {
 const token = this.getToken();
 if (!token) return null;
 try {
 const parts = token.split(".");
 if (parts.length !== 3) return null;
 // base64url → base64
 const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
 const username: string = payload.sub ?? "ARTEX";
 return { id: "1", name: username, username, email: "", avatar: "", role: "operator" };
 } catch {
 return null;
 }
 },
};
