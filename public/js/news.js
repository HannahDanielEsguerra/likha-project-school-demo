// News listing: category filter chips + search + post cards.
let activeCategory = '';

function snippet(text, n = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n).trimEnd() + '…' : clean;
}

const imageClasses = ['image-one', 'image-two', 'image-three'];

async function loadCategories() {
  const chips = document.getElementById('filterChips');
  try {
    const { categories } = await apiGet('categories');
    const all = `<button class="chip active" data-id="" type="button">All</button>`;
    const rest = categories
      .map((c) => `<button class="chip" data-id="${c.category_id}" type="button">${escapeHtml(c.name)}</button>`)
      .join('');
    chips.innerHTML = all + rest;
    chips.querySelectorAll('.chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        chips.querySelectorAll('.chip').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.id;
        loadPosts();
      });
    });
  } catch (_) {
    chips.innerHTML = '';
  }
}

async function loadPosts() {
  const grid = document.getElementById('postsGrid');
  const empty = document.getElementById('emptyState');
  const q = document.getElementById('searchInput').value.trim();
  grid.innerHTML = '<p class="loading">Loading…</p>';
  empty.classList.add('hidden');

  const params = new URLSearchParams();
  if (activeCategory) params.set('category', activeCategory);
  if (q) params.set('q', q);

  try {
    const { posts } = await apiGet(`posts?${params.toString()}`);
    if (!posts.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    grid.innerHTML = posts.map((p, i) => {
      const media = p.image_url
        ? `<img class="update-image card-img" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" loading="lazy" />`
        : `<div class="update-image ${imageClasses[i % imageClasses.length]}"></div>`;
      return `
      <a class="update-card" href="/post.html?id=${p.post_id}">
        ${media}
        <div class="update-body">
          <span>${escapeHtml(p.category_name || 'Update')}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(snippet(p.content))}</p>
          <small class="post-meta">${escapeHtml(p.author)} · ${formatDate(p.published_at || p.created_at)}</small>
        </div>
      </a>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<p class="loading">${escapeHtml(err.message)}</p>`;
  }
}

document.getElementById('searchBtn').addEventListener('click', loadPosts);
document.getElementById('searchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadPosts();
});

loadCategories();
loadPosts();
