// Single post page: render the article and its comments.
const postId = getQueryParam('id');
let me = null;

function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function loadArticle() {
  const el = document.getElementById('article');
  if (!postId) {
    el.innerHTML = '<p class="loading">No article specified.</p>';
    return;
  }
  try {
    const { post } = await apiGet(`posts?id=${encodeURIComponent(postId)}`);
    document.title = `${post.title} | Project LIKHA`;
    const hero = post.image_url
      ? `<img class="article-hero-img" src="${escapeHtml(post.image_url)}" alt="${escapeHtml(post.title)}" />`
      : '';
    el.innerHTML = `
      ${hero}
      <p class="eyebrow article-cat">${escapeHtml(post.category_name || 'Update')}</p>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="article-meta">By ${escapeHtml(post.author)} · ${formatDate(post.published_at || post.created_at)}</p>
      <div class="article-body">${paragraphs(post.content)}</div>`;
    document.getElementById('commentsSection').hidden = false;
    loadComments();
  } catch (err) {
    el.innerHTML = `<p class="loading">${escapeHtml(err.message)}</p>`;
  }
}

function commentMarkup(c) {
  const canDelete = me && (me.user_id === c.user_id || me.role === 'admin' || me.role === 'editor');
  const del = canDelete
    ? `<button class="comment-delete" data-id="${c.comment_id}" type="button" aria-label="Delete comment">Delete</button>`
    : '';
  return `
    <div class="comment">
      <div class="comment-head">
        <strong>${escapeHtml(c.author)}</strong>
        <span>${formatDate(c.created_at)}</span>
        ${del}
      </div>
      <p>${escapeHtml(c.content).replace(/\n/g, '<br>')}</p>
    </div>`;
}

async function loadComments() {
  const list = document.getElementById('commentsList');
  try {
    const { comments } = await apiGet(`comments?post_id=${encodeURIComponent(postId)}`);
    list.innerHTML = comments.length
      ? comments.map(commentMarkup).join('')
      : '<p class="empty-state">No comments yet. Be the first to respond.</p>';
    list.querySelectorAll('.comment-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        try {
          await apiDel(`comments?id=${btn.dataset.id}`);
          loadComments();
        } catch (err) { alert(err.message); }
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${escapeHtml(err.message)}</p>`;
  }
}

async function setupCommentForm() {
  me = await getMe();
  if (me) {
    document.getElementById('commentForm').classList.remove('hidden');
  } else {
    document.getElementById('commentSignin').classList.remove('hidden');
  }

  const submit = document.getElementById('commentSubmit');
  if (submit) {
    submit.addEventListener('click', async () => {
      const input = document.getElementById('commentInput');
      const errorBox = document.getElementById('commentError');
      errorBox.classList.add('hidden');
      const content = input.value.trim();
      if (!content) return;
      submit.disabled = true;
      try {
        await apiPost('comments', { post_id: Number(postId), content });
        input.value = '';
        loadComments();
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        submit.disabled = false;
      }
    });
  }
}

setupCommentForm().then(loadArticle);
