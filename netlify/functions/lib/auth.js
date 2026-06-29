// Authentication + session helpers shared by all endpoints.
// Passwords are hashed with Node's built-in scrypt (no native dependencies).
// Sessions are stored in the `sessions` table and tracked via an httpOnly cookie.
import crypto from 'node:crypto';
import { sql } from './db.js';

const COOKIE_NAME = 'likha_session';
const SESSION_DAYS = 7;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

// ---- Password hashing -------------------------------------------------------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// ---- Cookies ----------------------------------------------------------------
export function parseCookies(req) {
  const header = req.headers.get('cookie') || '';
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function buildCookie(value, maxAge) {
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

// ---- Sessions ---------------------------------------------------------------
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expires})`;
  return buildCookie(token, SESSION_SECONDS);
}

export function clearSessionCookie() {
  return buildCookie('', 0);
}

export async function destroySession(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (token) await sql`DELETE FROM sessions WHERE token = ${token}`;
}

// Returns the logged-in user row or null. Also opportunistically clears expired sessions.
export async function currentUser(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const rows = await sql`
    SELECT u.user_id, u.username, u.email, u.fullname, u.role
    FROM sessions s
    JOIN users u ON u.user_id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > now()`;
  return rows[0] || null;
}

export function isStaff(user) {
  return !!user && (user.role === 'admin' || user.role === 'editor');
}

// ---- JSON response helper ---------------------------------------------------
export function json(data, { status = 200, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(JSON.stringify(data), { status, headers });
}

export { COOKIE_NAME };
