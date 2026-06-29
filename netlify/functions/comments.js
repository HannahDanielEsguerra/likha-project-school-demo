// /api/comments
//   GET    ?post_id=N -> comments on a post (public)
//   POST              -> add a comment (any logged-in user) { post_id, content }
//   DELETE ?id=N      -> delete a comment (the author, or admin/editor)
import { sql } from './lib/db.js';
import { currentUser, isStaff, json } from './lib/auth.js';

export default async (req) => {
  const url = new URL(req.url);

  try {
    if (req.method === 'GET') {
      // Staff moderation view: recent comments across all posts.
      if (url.searchParams.get('recent')) {
        const user = await currentUser(req);
        if (!isStaff(user)) return json({ error: 'Not authorized.' }, { status: 403 });
        const rows = await sql`
          SELECT cm.comment_id, cm.content, cm.created_at, u.fullname AS author,
                 p.post_id, p.title AS post_title
          FROM comments cm
          JOIN users u ON u.user_id = cm.user_id
          JOIN posts p ON p.post_id = cm.post_id
          ORDER BY cm.created_at DESC
          LIMIT 100`;
        return json({ comments: rows });
      }

      const postId = url.searchParams.get('post_id');
      if (!postId) return json({ error: 'Missing post_id.' }, { status: 400 });
      const rows = await sql`
        SELECT cm.comment_id, cm.content, cm.created_at, cm.user_id, u.fullname AS author
        FROM comments cm
        JOIN users u ON u.user_id = cm.user_id
        WHERE cm.post_id = ${postId}
        ORDER BY cm.created_at ASC`;
      return json({ comments: rows });
    }

    const user = await currentUser(req);
    if (!user) return json({ error: 'Please sign in to comment.' }, { status: 401 });

    if (req.method === 'POST') {
      const { post_id, content } = await req.json();
      if (!post_id || !content || !content.trim()) {
        return json({ error: 'Write something before posting.' }, { status: 400 });
      }
      // only allow comments on published posts
      const post = await sql`SELECT status FROM posts WHERE post_id = ${post_id}`;
      if (!post.length || post[0].status !== 'published') {
        return json({ error: 'You can only comment on published posts.' }, { status: 400 });
      }
      const rows = await sql`
        INSERT INTO comments (post_id, user_id, content)
        VALUES (${post_id}, ${user.user_id}, ${content.trim()})
        RETURNING comment_id, content, created_at, user_id`;
      return json({ comment: { ...rows[0], author: user.fullname } }, { status: 201 });
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'Missing comment id.' }, { status: 400 });
      const rows = await sql`SELECT user_id FROM comments WHERE comment_id = ${id}`;
      if (!rows.length) return json({ error: 'Comment not found.' }, { status: 404 });
      if (rows[0].user_id !== user.user_id && !isStaff(user)) {
        return json({ error: 'You can only delete your own comments.' }, { status: 403 });
      }
      await sql`DELETE FROM comments WHERE comment_id = ${id}`;
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (err) {
    console.error('comments error', err);
    return json({ error: 'Something went wrong handling comments.' }, { status: 500 });
  }
};
