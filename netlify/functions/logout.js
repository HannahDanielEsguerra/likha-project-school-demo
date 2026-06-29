// POST /api/logout  — end the current session.
import { destroySession, clearSessionCookie, json } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });
  try {
    await destroySession(req);
  } catch (err) {
    console.error('logout error', err);
  }
  return json({ ok: true }, { cookie: clearSessionCookie() });
};
