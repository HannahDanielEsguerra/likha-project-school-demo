// Shared database client — Neon serverless Postgres.
// The connection string comes from the DATABASE_URL environment variable,
// which you set in the Netlify dashboard (see README). Netlify's own DB
// integration also exposes NETLIFY_DATABASE_URL, so we accept either.
import { neon } from '@neondatabase/serverless';

const connectionString =
  process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!connectionString) {
  console.error(
    'No database URL found. Set DATABASE_URL in your Netlify environment variables.'
  );
}

// `sql` is a tagged-template function: sql`SELECT * FROM users WHERE id = ${id}`
// Values interpolated with ${} are sent as bound parameters, so this is safe
// against SQL injection.
export const sql = neon(connectionString);
