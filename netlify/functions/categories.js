// /api/categories — read by anyone (for filters); admin-only writes.
//   GET           -> list categories (with post counts)
//   POST          -> create (admin)
//   PUT    ?id=N  -> update (admin)
//   DELETE ?id=N  -> delete (admin)
import { sql } from './lib/db.js';
import { currentUser, json } from './lib/auth.js';

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT c.category_id, c.name, c.description,
               COUNT(p.post_id) FILTER (WHERE p.status = 'published') AS post_count
        FROM categories c
        LEFT JOIN posts p ON p.category_id = c.category_id
        GROUP BY c.category_id
        ORDER BY c.name`;
      return json({ categories: rows });
    }

    const user = await currentUser(req);
    if (!user || user.role !== 'admin') {
      return json({ error: 'Admin access required.' }, { status: 403 });
    }

    if (req.method === 'POST') {
      const { name, description } = await req.json();
      if (!name) return json({ error: 'Category name is required.' }, { status: 400 });
      const dupe = await sql`SELECT 1 FROM categories WHERE name = ${name} LIMIT 1`;
      if (dupe.length) return json({ error: 'That category already exists.' }, { status: 409 });
      const rows = await sql`
        INSERT INTO categories (name, description) VALUES (${name}, ${description || null})
        RETURNING category_id`;
      return json({ category_id: rows[0].category_id }, { status: 201 });
    }

    if (req.method === 'PUT') {
      if (!id) return json({ error: 'Missing category id.' }, { status: 400 });
      const { name, description } = await req.json();
      await sql`UPDATE categories SET name = ${name}, description = ${description || null} WHERE category_id = ${id}`;
      return json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!id) return json({ error: 'Missing category id.' }, { status: 400 });
      await sql`DELETE FROM categories WHERE category_id = ${id}`;
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    console.error('categories error', err);
    return json({ error: 'Something went wrong handling categories.' }, { status: 500 });
  }
};
