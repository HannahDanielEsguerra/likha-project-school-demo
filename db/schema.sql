-- ============================================================================
--  Project LIKHA Iskolar PH  —  Database Schema
--  Target: PostgreSQL (Neon serverless)  •  ITS122P Final Project, Group 2
-- ============================================================================
--  Maps directly to the proposal ERD: User, Category, Post, Comment.
--
--  Two additions the ERD did not show but the system requires:
--    • users.password_hash  — login/registration is impossible without it.
--    • sessions table        — stores active login sessions in the database
--                              (keeps "all data in the database" true).
--
--  Minor, documented adjustments from the ERD for usability:
--    • Category.text          -> categories.description (clearer name).
--    • Post.title VARCHAR(50) -> VARCHAR(200) (real headlines need room).
--    • Post had created_at twice (one was a typo) -> single created_at,
--      plus updated_at for edit tracking.
--
--  Run this once against your Neon database (SQL Editor or psql).
-- ============================================================================

-- --- Enumerated types --------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'editor', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --- User --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id       SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  fullname      VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'member',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- --- Category ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- --- Post --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  post_id      SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(user_id)      ON DELETE CASCADE,
  category_id  INTEGER          REFERENCES categories(category_id) ON DELETE SET NULL,
  title        VARCHAR(200) NOT NULL,
  content      TEXT         NOT NULL,
  image_url    TEXT,
  status       post_status  NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- If you already deployed before image support was added, this line adds the
-- column to your existing table. It is safe to run repeatedly.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- --- Comment -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  comment_id SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Session (login sessions, stored in DB) ----------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token      VARCHAR(64) PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- --- Indexes -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_posts_status    ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category  ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_user      ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post   ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

-- ============================================================================
--  SEED DATA  (so the site has content the moment it deploys)
--  Passwords below are placeholders — CHANGE THEM after first login.
--    admin  -> username: admin     password: LikhaAdmin2026!
--    member -> username: scholar   password: LikhaMember2026!
-- ============================================================================

INSERT INTO users (username, email, fullname, password_hash, role) VALUES
  ('admin',   'admin@projectlikha.org',   'LIKHA Administrator',
   '4169f2ae20cfcfa36ab4dcc0400751ed:ffc84ca96e5449cc27942d11fa1cbae3d8eb535be6e922666bb6ecafc907254a6bd00550da312ce9e4581358eb25563f4354859a707874208ae3822437970731',
   'admin'),
  ('scholar', 'scholar@projectlikha.org', 'Sample Scholar',
   '26928062e223b0ae89a7876178f63b1c:4e4a4b1e8617017a77bf414c3d30d8c615b4d06f13a5f408ad9ce9b0cd7ff32a38ee07894e287879c92dd921e29fbd776c4af9dfe6624b563cd58558be269e5d',
   'member')
ON CONFLICT (username) DO NOTHING;

INSERT INTO categories (name, description) VALUES
  ('Scholarship', 'Updates on scholarship programs, awards, and application cycles.'),
  ('Formation',   'Spiritual mentorship, discipleship, and character formation stories.'),
  ('Community',   'Outreach, partnerships, and community impact reports.'),
  ('Announcements', 'Official notices and organizational updates.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO posts (user_id, category_id, title, content, status, published_at)
SELECT
  (SELECT user_id FROM users WHERE username = 'admin'),
  (SELECT category_id FROM categories WHERE name = 'Scholarship'),
  'Preparing scholars for the next academic cycle',
  'As enrollment season approaches, Project LIKHA is preparing support for our scholars'' tuition, school supplies, and formation needs. A focused fund drive helps us cover school-related needs before the pressure of enrollment begins. Every contribution — large or small — keeps a promising student in the classroom and growing in faith.',
  'published', now() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Preparing scholars for the next academic cycle');

INSERT INTO posts (user_id, category_id, title, content, status, published_at)
SELECT
  (SELECT user_id FROM users WHERE username = 'admin'),
  (SELECT category_id FROM categories WHERE name = 'Formation'),
  'Why mentorship matters beyond tuition',
  'Financial aid opens the door, but mentorship is what helps a scholar walk through it. Through assigned Life Group Leaders, Bible studies, and regular check-ins, our scholars receive the guidance, prayer, and accountability that turn opportunity into lasting transformation. Formation is at the heart of what LIKHA stands for.',
  'published', now() - INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Why mentorship matters beyond tuition');

INSERT INTO posts (user_id, category_id, title, content, status, published_at)
SELECT
  (SELECT user_id FROM users WHERE username = 'admin'),
  (SELECT category_id FROM categories WHERE name = 'Community'),
  'Building a donor partnership rhythm',
  'Recurring donors create the stability that lets our team plan support with confidence. This quarter we are grateful for partners who have committed to monthly giving and to our Adopt-a-Scholar program. Together we are building something sustainable for the youth of our community.',
  'published', now() - INTERVAL '9 days'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Building a donor partnership rhythm');
