// The JWT for the current session. Held in memory (always current, fast to read
// for every request) and mirrored to localStorage so a page refresh stays
// logged in.
//
// XSS trade-off: localStorage is readable by ANY script on the page, so a
// successful XSS attack could steal this token. The more secure option is an
// httpOnly cookie (invisible to JS), which requires CSRF protection and
// server-side cookie handling — deferred past Phase 4.
const STORAGE_KEY = 'jwt';

let current: string | null = localStorage.getItem(STORAGE_KEY);

export function getToken(): string | null {
  return current;
}

export function setToken(token: string): void {
  current = token;
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  current = null;
  localStorage.removeItem(STORAGE_KEY);
}
