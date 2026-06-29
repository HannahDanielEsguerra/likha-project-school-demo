// /api/users  — admin-only. Powers the "Permissions" screen in the admin portal.
//   GET          -> list all users
//   PUT  ?id=N   -> change a user's role  { role }
import { sql } from './lib/db.js';
import { currentUser, json } from './lib/auth.js';

const ROLES = ['admin', 'editor', 'member'];

export default async (req) => {
  try {
    const user = await currentUser(req);
    if (!user || user.role !== 'admin') {
      return json({ error: 'Admin access required.' }, { status: 403 });
    }

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT user_id, username, email, fullname, role, created_at
        FROM users ORDER BY created_at ASC`;
      return json({ users: rows });
    }

    if (req.method === 'PUT') {
      const id = new URL(req.url).searchParams.get('id');
      if (!id) return json({ error: 'Missing user id.' }, { status: 400 });
      const { role } = await req.json();
      if (!ROLES.includes(role)) return json({ error: 'Invalid role.' }, { status: 400 });
      if (Number(id) === user.user_id && role !== 'admin') {
        return json({ error: 'You cannot remove your own admin access.' }, { status: 400 });
      }
      await sql`UPDATE users SET role = ${role}, updated_at = now() WHERE user_id = ${id}`;
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    console.error('users error', err);
    return json({ error: 'Something went wrong handling users.' }, { status: 500 });
  }
};
