// Admin portal: guard access, switch tabs, and run CRUD for each section.
let admin = null;
let editingPostId = null;
let categoriesCache = [];
let postImage = null; // data URL (or http URL) for the post being edited, or null

// ---- Access guard -----------------------------------------------------------
async function boot() {
  admin = await getMe();
  const gate = document.getElementById('gate');
  if (!admin) {
    gate.innerHTML = `<div class="admin-message"><h2>Staff sign-in required</h2>
      <p>This area is for Project LIKHA staff.</p>
      <a class="button button-donate" href="/login.html">Sign in</a></div>`;
    return;
  }
  if (!isStaff(admin)) {
    gate.innerHTML = `<div class="admin-message"><h2>No access</h2>
      <p>Your account doesn't have permission to manage the site. Ask an administrator to upgrade your role.</p>
      <a class="button button-secondary-dark" href="/news.html">Back to News</a></div>`;
    return;
  }

  gate.classList.add('hidden');
  document.getElementById('shell').classList.remove('hidden');
  document.getElementById('whoami').textContent = `${admin.fullname} · ${admin.role}`;

  // Editors don't see admin-only tabs.
  if (admin.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach((el) => el.classList.add('hidden'));
  }

  setupTabs();
  setupPostModal();
  loadCategoriesInto();
  loadPosts();
}

// ---- Tabs -------------------------------------------------------------------
function setupTabs() {
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.add('hidden'));
      document.getElementById(`panel-${name}`).classList.remove('hidden');
      if (name === 'posts') loadPosts();
      if (name === 'comments') loadComments();
      if (name === 'categories') loadCategories();
      if (name === 'permissions') loadUsers();
    });
  });
}

// ---- Posts ------------------------------------------------------------------
const statusBadge = (s) => `<span class="badge badge-${s}">${s}</span>`;

async function loadPosts() {
  const tbody = document.querySelector('#postsTable tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading…</td></tr>';
  try {
    const { posts } = await apiGet('posts?mine=1');
    tbody.innerHTML = posts.length ? posts.map((p) => `
      <tr>
        <td><a href="/post.html?id=${p.post_id}">${escapeHtml(p.title)}</a></td>
        <td>${escapeHtml(p.category_name || '—')}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${formatDate(p.published_at || p.created_at)}</td>
        <td class="row-actions">
          <button class="link-btn" data-edit="${p.post_id}" type="button">Edit</button>
          <button class="link-btn danger" data-del="${p.post_id}" type="button">Delete</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="5" class="empty-state">No posts yet. Create your first one.</td></tr>';

    tbody.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => openPostModal(b.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => deletePost(b.dataset.del)));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function deletePost(id) {
  if (!confirm('Delete this post? This also removes its comments.')) return;
  try { await apiDel(`posts?id=${id}`); loadPosts(); }
  catch (err) { alert(err.message); }
}

function setupPostModal() {
  document.getElementById('newPostBtn').addEventListener('click', () => openPostModal());
  document.getElementById('postModalClose').addEventListener('click', closePostModal);
  document.getElementById('savePostBtn').addEventListener('click', savePost);
  document.getElementById('postModal').addEventListener('click', (e) => {
    if (e.target.id === 'postModal') closePostModal();
  });

  // Image upload: read the chosen file, shrink it in the browser, keep the
  // result as a data URL so it can be saved with the post.
  document.getElementById('postImageInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      postImage = await downscaleImage(file);
      showImagePreview(postImage);
    } catch (_) {
      alert('Sorry, that image could not be read. Try a different file.');
    }
  });
  document.getElementById('postImageRemove').addEventListener('click', () => {
    postImage = null;
    document.getElementById('postImageInput').value = '';
    showImagePreview(null);
  });
}

// Draw the image onto a canvas no larger than 1200px on its long edge and
// re-encode as a JPEG. This keeps uploads small (usually well under 1 MB).
function downscaleImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showImagePreview(src) {
  const img = document.getElementById('postImagePreview');
  const remove = document.getElementById('postImageRemove');
  if (src) {
    img.src = src;
    img.classList.remove('hidden');
    remove.classList.remove('hidden');
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
    remove.classList.add('hidden');
  }
}

async function openPostModal(id = null) {
  editingPostId = id;
  const err = document.getElementById('postError');
  err.classList.add('hidden');
  document.getElementById('postModalTitle').textContent = id ? 'Edit post' : 'New post';

  document.getElementById('postImageInput').value = '';
  if (id) {
    const { post } = await apiGet(`posts?id=${id}`);
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postContent').value = post.content;
    document.getElementById('postStatus').value = post.status;
    document.getElementById('postCategory').value = post.category_id || '';
    postImage = post.image_url || null;
    showImagePreview(postImage);
  } else {
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postStatus').value = 'draft';
    document.getElementById('postCategory').value = '';
    postImage = null;
    showImagePreview(null);
  }
  const modal = document.getElementById('postModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closePostModal() {
  const modal = document.getElementById('postModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

async function savePost() {
  const err = document.getElementById('postError');
  err.classList.add('hidden');
  const payload = {
    title: document.getElementById('postTitle').value.trim(),
    content: document.getElementById('postContent').value.trim(),
    category_id: document.getElementById('postCategory').value || null,
    status: document.getElementById('postStatus').value,
    image_url: postImage,
  };
  if (!payload.title || !payload.content) {
    err.textContent = 'Title and content are required.';
    err.classList.remove('hidden');
    return;
  }
  const btn = document.getElementById('savePostBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    if (editingPostId) await apiPut(`posts?id=${editingPostId}`, payload);
    else await apiPost('posts', payload);
    closePostModal();
    loadPosts();
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = 'Save post';
  }
}

// ---- Categories (also fills the post modal's dropdown) ----------------------
async function loadCategoriesInto() {
  try {
    const { categories } = await apiGet('categories');
    categoriesCache = categories;
    const select = document.getElementById('postCategory');
    select.innerHTML = '<option value="">— No category —</option>' +
      categories.map((c) => `<option value="${c.category_id}">${escapeHtml(c.name)}</option>`).join('');
  } catch (_) {}
}

async function loadCategories() {
  const tbody = document.querySelector('#catTable tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';
  try {
    const { categories } = await apiGet('categories');
    categoriesCache = categories;
    tbody.innerHTML = categories.length ? categories.map((c) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.description || '—')}</td>
        <td>${c.post_count}</td>
        <td class="row-actions">
          <button class="link-btn" data-edit="${c.category_id}" type="button">Rename</button>
          <button class="link-btn danger" data-del="${c.category_id}" type="button">Delete</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="4" class="empty-state">No categories yet.</td></tr>';

    tbody.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => editCategory(b.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', () => deleteCategory(b.dataset.del)));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(err.message)}</td></tr>`;
  }
}

document.getElementById('addCatBtn').addEventListener('click', async () => {
  const name = document.getElementById('catName').value.trim();
  const description = document.getElementById('catDesc').value.trim();
  if (!name) return;
  try {
    await apiPost('categories', { name, description });
    document.getElementById('catName').value = '';
    document.getElementById('catDesc').value = '';
    loadCategories();
    loadCategoriesInto();
  } catch (err) { alert(err.message); }
});

async function editCategory(id) {
  const cat = categoriesCache.find((c) => String(c.category_id) === String(id));
  const name = prompt('Category name:', cat ? cat.name : '');
  if (name === null) return;
  const description = prompt('Description:', cat ? (cat.description || '') : '');
  try {
    await apiPut(`categories?id=${id}`, { name: name.trim(), description: (description || '').trim() });
    loadCategories();
    loadCategoriesInto();
  } catch (err) { alert(err.message); }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Posts will keep their content but lose this label.')) return;
  try { await apiDel(`categories?id=${id}`); loadCategories(); loadCategoriesInto(); }
  catch (err) { alert(err.message); }
}

// ---- Comments moderation ----------------------------------------------------
async function loadComments() {
  const tbody = document.querySelector('#commentsTable tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading">Loading…</td></tr>';
  try {
    const { comments } = await apiGet('comments?recent=1');
    tbody.innerHTML = comments.length ? comments.map((c) => `
      <tr>
        <td class="comment-cell">${escapeHtml(c.content)}</td>
        <td>${escapeHtml(c.author)}</td>
        <td><a href="/post.html?id=${c.post_id}">${escapeHtml(c.post_title)}</a></td>
        <td>${formatDate(c.created_at)}</td>
        <td class="row-actions"><button class="link-btn danger" data-del="${c.comment_id}" type="button">Delete</button></td>
      </tr>`).join('') : '<tr><td colspan="5" class="empty-state">No comments yet.</td></tr>';

    tbody.querySelectorAll('[data-del]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        try { await apiDel(`comments?id=${b.dataset.del}`); loadComments(); }
        catch (err) { alert(err.message); }
      }));
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---- Permissions ------------------------------------------------------------
async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="loading">Loading…</td></tr>';
  try {
    const { users } = await apiGet('users');
    tbody.innerHTML = users.map((u) => {
      const roles = ['admin', 'editor', 'member']
        .map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('');
      return `<tr>
        <td>${escapeHtml(u.fullname)}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><select class="role-select" data-id="${u.user_id}">${roles}</select></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.role-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        try { await apiPut(`users?id=${sel.dataset.id}`, { role: sel.value }); }
        catch (err) { alert(err.message); loadUsers(); }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(err.message)}</td></tr>`;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePostModal();
});

boot();
