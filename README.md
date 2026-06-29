# Project LIKHA Iskolar PH; Web Application

A dynamic, database-backed website for **Project LIKHA Iskolar PH**, a Christ-centered
NGO providing scholarships and formation to underprivileged Filipino youth.

Built for **ITS122P / IT135-8L (Web Systems & Technologies)** Group 2.

---

## What this is

The original prototype was a single static landing page. This version is a full
web application with:

| # | Feature | What it does |
|---|---------|--------------|
| 1 | **Accounts & sessions** | Register, log in, log out. Passwords hashed (scrypt). Login state kept in **database-backed sessions**. Three roles: `admin`, `editor`, `member`. |
| 2 | **News / Posts (CRUD)** | Public visitors read **published** posts, filter by category, and search. Staff create, edit, publish/archive, and delete posts. |
| 3 | **Comments (CRUD)** | Logged-in users comment on posts. Owners delete their own; staff moderate any. |
| + | **Admin portal** | Manage Posts, moderate Comments, manage Categories, and change user roles (Permissions). |

Every piece of data — users, sessions, categories, posts, comments — lives in the
database. This satisfies the project requirements for a dynamic site, login/registration,
admin + user pages, sessions, and CRUD.

---

## Tech stack (and why)

The course tutorials assume **PHP + MySQL**, but **Netlify cannot run PHP**. To deploy
on Netlify as required, this project uses Netlify's own recommended stack:

- **Frontend:** static HTML/CSS/JS (the existing design system, extended).
- **Backend:** **Netlify Functions** — small serverless endpoints in Node.js.
- **Database:** **Neon** — serverless **PostgreSQL** (free tier; Netlify's official DB partner).

The data model is exactly the proposal ERD (User, Category, Post, Comment), translated
from MySQL to PostgreSQL. See `db/schema.sql` for the documented schema.

---

## Project structure

```
likha-deploy/
├── db/
│   └── schema.sql            # Postgres schema + seed data (run once in Neon)
├── netlify/
│   └── functions/            # Serverless API (one file = one endpoint)
│       ├── lib/
│       │   ├── db.js         # Neon connection (reads DATABASE_URL)
│       │   └── auth.js       # password hashing + DB sessions + helpers
│       ├── register.js  login.js  logout.js  me.js
│       ├── posts.js  comments.js  categories.js  users.js
├── public/                   # static site (this is what gets served)
│   ├── index.html            # landing page (+ News link + auth nav)
│   ├── news.html  post.html  login.html  register.html  admin.html
│   ├── css/style.css         # original design system + new components
│   └── js/                   # api.js, news.js, post.js, admin.js, script.js
├── netlify.toml              # build config + /api/* routing
└── package.json
```

API routes are exposed under `/api/*` (e.g. `/api/login`), redirected to the
matching function by `netlify.toml`.

---

## Adding images

There are two separate things here.

**Article images (no code needed — done in the app).** When you create or edit a
post in the Admin portal, there's now a **Featured image** field. Choose a photo and
it appears at the top of the article and on its News card. The image is resized in the
browser, then saved in the database with the post, so it survives redeploys and needs no
extra storage service. You can also remove an image while editing. (Anything over ~1.5 MB
is rejected; the auto-resize normally keeps photos well under that.)

**Main landing-page images (edit the files).** The landing page (`public/index.html`)
ships with colored gradient placeholders. To use real pictures:

1. Put your image files in `public/images/` (create the folder).
2. In `public/index.html`, add an `<img>` where you want it, e.g.
   `<img src="images/students.jpg" alt="LIKHA scholars at an event">`.
3. To replace a gradient block instead, set a background image on it in
   `public/css/style.css` — for example:
   `.update-image { background: url('../images/update1.jpg') center/cover; }`
   (the CSS path starts with `../` because the stylesheet is inside `public/css/`).

---

## Deployment runbook

You need two free accounts: **Neon** (database) and **Netlify** (hosting).

### Step 1 — Create the database (Neon)

1. Go to <https://neon.tech> and sign up / log in.
2. Create a new **Project** (any name, e.g. `project-likha`).
3. Open the **SQL Editor** in the Neon dashboard.
4. Open `db/schema.sql` from this repo, copy its entire contents, paste into the
   SQL Editor, and **Run**. This creates all tables and seeds starter content.
5. In Neon, open **Connection Details** and copy the **connection string**
   (it looks like `postgresql://user:password@...neon.tech/dbname?sslmode=require`).
   Keep it handy for Step 3.

### Step 2 — Put the code on Netlify

**Option A — Git (recommended):** push this folder to a GitHub repo, then in Netlify
choose **Add new site → Import an existing project**, pick the repo, and deploy.
Netlify reads `netlify.toml` automatically.

**Option B — Drag & drop:** in the Netlify dashboard, drag the whole `likha-deploy`
folder onto the deploy area. (Git is preferred because functions deploy more reliably.)

### Step 3 — Set the database environment variable

In your Netlify site: **Site configuration → Environment variables → Add a variable**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | *(the Neon connection string from Step 1)* |

Then **redeploy** (Deploys → Trigger deploy → Deploy site) so functions pick it up.

> Tip: If you instead use Netlify's built-in Neon integration ("Add database"), it sets
> `NETLIFY_DATABASE_URL` for you — the code accepts either variable, so no code change is needed.

### Step 4 — Log in and secure the admin account

1. Visit your live site, click **Login**, and sign in as the seeded admin:

   - **Username:** `admin`
   - **Password:** `LikhaAdmin2026!`

2. You'll land in the **Admin portal**. A sample member also exists
   (`scholar` / `LikhaMember2026!`).

> **⚠ Change these passwords before submitting / going live.** They are placeholders
> committed to the repo, so anyone who reads the code knows them. The quickest way is
> to register fresh accounts and then promote/keep only the ones you want (see below),
> or update the seed values before first deploy.

---

## Managing user roles

The first admin comes from the seed data. After that, an admin can change anyone's role
from the **Permissions** tab in the portal.

To promote a user directly in the database (Neon SQL Editor):

```sql
UPDATE users SET role = 'admin' WHERE username = 'the_username';
-- roles: 'admin' (full control), 'editor' (manage posts/comments), 'member' (comment only)
```

---

## Local development (optional)

You don't need this to deploy, but to run it locally:

```bash
npm install -g netlify-cli      # one time
npm install                     # installs @neondatabase/serverless
# create a .env file with:  DATABASE_URL=postgresql://...your Neon string...
netlify dev                     # serves the site + functions at http://localhost:8888
```

`netlify dev` runs the static site and the serverless functions together and applies the
`/api/*` redirects, so the local experience matches production.

---

## API reference (quick)

All return JSON. Auth via the `likha_session` httpOnly cookie.

| Method | Route | Who | Purpose |
|--------|-------|-----|---------|
| POST | `/api/register` | anyone | create a member account |
| POST | `/api/login` | anyone | start a session |
| POST | `/api/logout` | logged-in | end session |
| GET | `/api/me` | anyone | current user (or null) |
| GET | `/api/posts` | public | published posts; `?id=` `?category=` `?q=` `?mine=1` (staff) |
| POST/PUT/DELETE | `/api/posts` | staff | create / edit / delete posts |
| GET | `/api/categories` | public | categories with post counts |
| POST/PUT/DELETE | `/api/categories` | admin | manage categories |
| GET | `/api/comments` | public | `?post_id=` ; `?recent=1` for staff moderation |
| POST | `/api/comments` | logged-in | add a comment |
| DELETE | `/api/comments` | owner/staff | delete a comment |
| GET | `/api/users` | admin | list users |
| PUT | `/api/users?id=` | admin | change a user's role |

---

## Database schema notes

The schema maps 1:1 to the proposal ERD, with two necessary additions and a few
documented clean-ups (all explained at the top of `db/schema.sql`):

- **Added** `users.password_hash` — login is impossible without storing a password.
- **Added** `sessions` table — keeps login state in the database (not just a cookie).
- `Category.text` → `categories.description` (clearer name).
- `Post.title` widened to 200 chars; the duplicated `created_at` in the ERD became a
  single `created_at` plus an `updated_at` for edit tracking.

---
