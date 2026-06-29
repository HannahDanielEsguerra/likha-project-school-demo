// POST /api/login  — verify credentials (username OR email) and start a session.
import { sql } from './lib/db.js';
import { verifyPassword, createSession, json } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return json({ error: 'Enter your username and password.' }, { status: 400 });
    }

    const rows = await sql`
      SELECT user_id, username, email, fullname, role, password_hash
      FROM users
      WHERE username = ${username} OR email = ${username}
      LIMIT 1`;

    const found = rows[0];
    if (!found || !verifyPassword(password, found.password_hash)) {
      return json({ error: 'Incorrect username or password.' }, { status: 401 });
    }

    const cookie = await createSession(found.user_id);
    const { password_hash, ...user } = found;
    return json({ user }, { cookie });
  } catch (err) {
    console.error('login error', err);
    return json({ error: 'Could not sign you in. Please try again.' }, { status: 500 });
  }
};
