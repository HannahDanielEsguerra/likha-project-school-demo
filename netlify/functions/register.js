// POST /api/register  — create a new member account and log them in.
import { sql } from './lib/db.js';
import { hashPassword, createSession, json } from './lib/auth.js';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  try {
    const { username, email, fullname, password } = await req.json();

    if (!username || !email || !fullname || !password) {
      return json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const existing = await sql`
      SELECT 1 FROM users WHERE username = ${username} OR email = ${email} LIMIT 1`;
    if (existing.length) {
      return json({ error: 'That username or email is already registered.' }, { status: 409 });
    }

    const rows = await sql`
      INSERT INTO users (username, email, fullname, password_hash, role)
      VALUES (${username}, ${email}, ${fullname}, ${hashPassword(password)}, 'member')
      RETURNING user_id, username, email, fullname, role`;

    const user = rows[0];
    const cookie = await createSession(user.user_id);
    return json({ user }, { status: 201, cookie });
  } catch (err) {
    console.error('register error', err);
    return json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }
};
