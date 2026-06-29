// /api/posts  — full CRUD for News posts.
//   GET    ?id=N            -> single post (+ author, category)
//   GET    ?mine=1          -> all posts incl. drafts (staff only, for admin portal)
//   GET    ?category=N&q=.. -> list published posts (public), optional filters
//   POST                    -> create (admin/editor)
//   PUT    ?id=N            -> update (admin/editor)
//   DELETE ?id=N            -> delete (admin/editor)
import { sql } from './lib/db.js';
import { currentUser, isStaff, json } from './lib/auth.js';

// Images are stored directly in the database as a string — either a data: URL
// (an uploaded photo, downscaled in the browser first) or a normal http(s) URL.
// We cap the size so a huge upload can't bloat the row; ~2M chars of base64 is
// roughly 1.5 MB of image, which is plenty for a downscaled photo.
const MAX_IMAGE_CHARS = 2_000_000;
const TOO_BIG = Symbol('too_big');
function normalizeImage(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  if (v.length > MAX_IMAGE_CHARS) return TOO_BIG;
  // Only allow data-image URLs or http(s) links.
  if (!/^data:image\/|^https?:\/\//i.test(v)) return null;
  return v;
}

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  try {
    // ---- READ ----
    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`
          SELECT p.post_id, p.title, p.content, p.image_url, p.status, p.published_at, p.created_at,
                 p.updated_at, p.category_id, c.name AS category_name,
                 p.user_id, u.fullname AS author
          FROM posts p
          LEFT JOIN categories c ON c.category_id = p.category_id
          JOIN users u ON u.user_id = p.user_id
          WHERE p.post_id = ${id}`;
        const post = rows[0];
        if (!post) return json({ error: 'Post not found.' }, { status: 404 });
        if (post.status !== 'published') {
          const user = await currentUser(req);
          if (!isStaff(user)) return json({ error: 'Post not found.' }, { status: 404 });
        }
        return json({ post });
      }

      // staff listing (includes drafts) for the admin portal
      if (url.searchParams.get('mine')) {
        const user = await currentUser(req);
        if (!isStaff(user)) return json({ error: 'Not authorized.' }, { status: 403 });
        const rows = await sql`
          SELECT p.post_id, p.title, p.status, p.published_at, p.created_at,
                 c.name AS category_name, u.fullname AS author
          FROM posts p
          LEFT JOIN categories c ON c.category_id = p.category_id
          JOIN users u ON u.user_id = p.user_id
          ORDER BY p.created_at DESC`;
        return json({ posts: rows });
      }

      // public listing: published only, optional category + search
      const category = url.searchParams.get('category');
      const q = url.searchParams.get('q');
      const rows = await sql`
        SELECT p.post_id, p.title, p.content, p.image_url, p.published_at, p.created_at,
               c.name AS category_name, c.category_id, u.fullname AS author
        FROM posts p
        LEFT JOIN categories c ON c.category_id = p.category_id
        JOIN users u ON u.user_id = p.user_id
        WHERE p.status = 'published'
          AND (${category}::int IS NULL OR p.category_id = ${category}::int)
          AND (${q}::text IS NULL OR p.title ILIKE '%' || ${q} || '%' OR p.content ILIKE '%' || ${q} || '%')
        ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC`;
      return json({ posts: rows });
    }

    // ---- WRITE (staff only) ----
    const user = await currentUser(req);
    if (!isStaff(user)) return json({ error: 'Not authorized.' }, { status: 403 });

    if (req.method === 'POST') {
      const { title, content, category_id, status, image_url } = await req.json();
      if (!title || !content) return json({ error: 'Title and content are required.' }, { status: 400 });
      const image = normalizeImage(image_url);
      if (image === TOO_BIG) return json({ error: 'That image is too large. Please use one under ~1.5 MB.' }, { status: 400 });
      const state = status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'draft';
      const publishedAt = state === 'published' ? new Date().toISOString() : null;
      const rows = await sql`
        INSERT INTO posts (user_id, category_id, title, content, image_url, status, published_at)
        VALUES (${user.user_id}, ${category_id || null}, ${title}, ${content}, ${image}, ${state}, ${publishedAt})
        RETURNING post_id`;
      return json({ post_id: rows[0].post_id }, { status: 201 });
    }

    if (req.method === 'PUT') {
      if (!id) return json({ error: 'Missing post id.' }, { status: 400 });
      const { title, content, category_id, status, image_url } = await req.json();
      const image = normalizeImage(image_url);
      if (image === TOO_BIG) return json({ error: 'That image is too large. Please use one under ~1.5 MB.' }, { status: 400 });
      const state = status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'draft';
      // set published_at the first time it becomes published
      await sql`
        UPDATE posts SET
          title = ${title},
          content = ${content},
          image_url = ${image},
          category_id = ${category_id || null},
          status = ${state},
          published_at = CASE
            WHEN ${state} = 'published' AND published_at IS NULL THEN now()
            ELSE published_at END,
          updated_at = now()
        WHERE post_id = ${id}`;
      return json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!id) return json({ error: 'Missing post id.' }, { status: 400 });
      await sql`DELETE FROM posts WHERE post_id = ${id}`;
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    console.error('posts error', err);
    return json({ error: 'Something went wrong handling that post.' }, { status: 500 });
  }
};
