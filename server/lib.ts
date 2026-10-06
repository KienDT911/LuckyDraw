/// <reference types="@cloudflare/workers-types" />
/**
 * Helpers for the Cloudflare Pages Functions in /functions.
 * Storage is one D1 database (binding "DB"); access is protected by the APP_PASSCODE secret.
 */

export interface Env {
  DB?: D1Database;
  APP_PASSCODE?: string;
}

/** Narrowed env once `isConfigured` has passed. */
export type ReadyEnv = Required<Env>;

export const SESSION_COOKIE = 'ld_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isConfigured(env: Env): env is ReadyEnv {
  return Boolean(env.DB && env.APP_PASSCODE);
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

// ---------- Auth: a stateless, signed session cookie ----------

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function sha256(text: string): Promise<string> {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

/** Compares strings without leaking where they differ. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passcodeMatches(env: ReadyEnv, candidate: string): Promise<boolean> {
  // Hash both sides first so the comparison always runs over equal-length strings.
  return safeEqual(await sha256(candidate), await sha256(env.APP_PASSCODE));
}

export async function makeSessionCookie(env: ReadyEnv): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const token = `${exp}.${await hmac(env.APP_PASSCODE, `session:${exp}`)}`;
  return `${SESSION_COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/** Valid while unexpired and signed with the current passcode (changing APP_PASSCODE signs everyone out). */
export async function isAuthed(request: Request, env: ReadyEnv): Promise<boolean> {
  const cookie = request.headers.get('Cookie') ?? '';
  const raw = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  const token = raw?.slice(SESSION_COOKIE.length + 1) ?? '';
  const [expText, sig] = token.split('.');
  const exp = Number(expText);
  if (!sig || !Number.isFinite(exp) || exp < Date.now()) return false;
  return safeEqual(sig, await hmac(env.APP_PASSCODE, `session:${exp}`));
}

/** Writes must come from this site (defence in depth on top of the SameSite cookie). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

// ---------- Schema ----------

let schemaReady: Promise<unknown> | null = null;

/** Creates the two tables on first use, so no manual SQL step is needed when setting up Cloudflare. */
export function ensureSchema(db: D1Database): Promise<unknown> {
  schemaReady ??= db
    .batch([
      db.prepare(
        'CREATE TABLE IF NOT EXISTS design (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, config TEXT NOT NULL, updated_at INTEGER NOT NULL)',
      ),
      db.prepare(
        'CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL, size INTEGER NOT NULL, created_at INTEGER NOT NULL)',
      ),
    ])
    .catch((err) => {
      schemaReady = null;
      throw err;
    });
  return schemaReady;
}

/** D1 may hand BLOBs back as ArrayBuffer, a typed array or a plain number array depending on version. */
export function toBytes(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (Array.isArray(data)) return Uint8Array.from(data as number[]);
  return null;
}
