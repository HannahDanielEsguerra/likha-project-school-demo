// GET /api/me  — who is logged in right now? Returns { user } or { user: null }.
import { currentUser, json } from './lib/auth.js';

export default async (req) => {
  try {
    const user = await currentUser(req);
    return json({ user });
  } catch (err) {
    console.error('me error', err);
    return json({ user: null });
  }
};
