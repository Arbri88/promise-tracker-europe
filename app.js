// PromiseTracker Europe (no build step) — Hash-based SPA
import {
  EUROPE_COUNTRIES,
  getCountryBySlug,
  getCurrentActorForCountry,
  getPromisesForCountry,
  PROMISE_BY_ID,
  getEvidenceForPromise,
  STATUS_META,
  CATEGORY_META,
} from './data.js';

import {
  addPulseRating,
  getPulseRatings,
  addPost,
  getPosts,
  votePost,
  getCompareSelection,
  setCompareSelection,
  setLastCountry,
  getLastCountry,
} from './store.js';

import {
  renderCountriesPage,
  renderCountryHeader,
  renderCountryTabs,
  renderPromisesList,
  renderTimeline,
  renderInsights,
  renderStats,
  renderCommunity,
  renderPulse,
  renderComparePage,
  renderPromiseDetail,
  renderNotFound,
} from './ui.js';

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
const $searchModal = document.getElementById('searchModal');
const $shareModal = document.getElementById('shareModal');
const $shareText = document.getElementById('shareText');

let state = {
  countriesQuery: '',
  charts: [],
};

const rootEl = document.documentElement;
function handlePointerMove(e) {
  const x = `${e.clientX}px`;
  const y = `${e.clientY}px`;
  rootEl?.style.setProperty('--pointer-x', x);
  rootEl?.style.setProperty('--pointer-y', y);
}
window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('touchmove', (e) => {
  const touch = e.touches?.[0];
  if (!touch) return;
  handlePointerMove(touch);
}, { passive: true });

function toast(msg) {
  if (!$toast) return;
  $toast.textContent = msg;
  $toast.classList.remove('hidden');
  $toast.classList.add('opacity-100');
  setTimeout(() => {
    $toast.classList.add('hidden');
  }, 1800);
}

function getRoute() {
  const raw = (location.hash || '#/').slice(1);
  const [path, qs] = raw.split('?');
  const seg = path.split('/').filter(Boolean);
  const query = new URLSearchParams(qs || '');
  return { seg, query, path };
}

function ensureCountry(slug) {
  const c = getCountryBySlug(slug);
  if (c) return c;
  return null;
}

function placeholderActorFor(slug) {
  const c = getCountryBySlug(slug);
  const name = c ? `${c.name} Government` : 'Government';
  return {
    id: `actor-${slug}`,
    name,
    party: '—',
    type: 'GOVERNMENT',
    slug,
    termStart: null,
    termEnd: null,
    termSlug: 'current',
    isCurrent: true,
    about: 'Placeholder actor (seeded automatically).'
  };
}

function computeStats({ slug, promises, evidenceCount, postsCount, pulseRatings }) {
  const total = promises.length;
  const count = (s) => promises.filter(p => p.status === s).length;
  const kept = count('KEPT');
  const broken = count('BROKEN');
  const inProgress = count('IN_THE_WORKS');
  const stalled = count('STALLED');
  const compromise = count('COMPROMISE');
  const notStarted = count('NOT_STARTED');

  const pct = (n) => total ? Math.round((n/total)*100) : 0;

  const lastUpdatedDt = promises.reduce((acc,p)=>{
    const t = new Date(p.updatedAt || 0).getTime();
    return Math.max(acc, Number.isFinite(t)?t:0);
  }, 0);
  const lastUpdated = lastUpdatedDt ? new Date(lastUpdatedDt).toLocaleDateString(undefined, {year:'numeric',month:'short',day:'2-digit'}) : '—';

  const catCounts = {};
  for (const p of promises) catCounts[p.category] = (catCounts[p.category] || 0) + 1;

  const statusCounts = {
    NOT_STARTED: notStarted,
    IN_THE_WORKS: inProgress,
    STALLED: stalled,
    COMPROMISE: compromise,
    KEPT: kept,
    BROKEN: broken,
  };

  const pulseAvg = pulseRatings.length ? (pulseRatings.reduce((a,x)=>a+(x.v||0),0)/pulseRatings.length) : 0;

  const highImportance = promises.filter(p => String(p.importance || '').toLowerCase() === 'high').length;

  return {
    slug,
    total,
    kept, broken, inProgress, stalled, compromise, notStarted,
    keptPct: pct(kept),
    brokenPct: pct(broken),
    inProgressPct: pct(inProgress),
    stalledPct: pct(stalled),
    evidenceCount,
    postCount: postsCount,
    pulseAvg,
    highImportance,
    catCounts,
    statusCounts,
    lastUpdated,
  };
}

function pulseSummary(ratings) {
  const total = ratings.length;
  const dist = [0,0,0,0,0]; // idx0=5★ ... idx4=1★
  let sum = 0;
  for (const r of ratings) {
    const v = Math.max(1, Math.min(5, Number(r.v || 0)));
    sum += v;
    dist[5 - v] += 1;
  }
  return { total, avg: total ? sum/total : 0, dist };
}

function destroyCharts() {
  for (const ch of state.charts) {
    try { ch.destroy(); } catch {}
  }
  state.charts = [];
}

function drawChartsForInsights(stats) {
  if (!window.Chart) return;
  const categoryCanvas = document.getElementById('categoryChart');
  const statusCanvas = document.getElementById('statusChart');
  if (!categoryCanvas || !statusCanvas) return;

  const catLabels = Object.keys(stats.catCounts).map(k => CATEGORY_META[k]?.label || k);
  const catValues = Object.keys(stats.catCounts).map(k => stats.catCounts[k]);

  const statusKeys = Object.keys(stats.statusCounts);
  const statusLabels = statusKeys.map(k => STATUS_META[k]?.label || k);
  const statusValues = statusKeys.map(k => stats.statusCounts[k]);

  state.charts.push(new Chart(categoryCanvas, {
    type: 'doughnut',
    data: { labels: catLabels, datasets: [{ data: catValues }] },
    options: { plugins: { legend: { labels: { color: '#d4d4d8' } } } }
  }));

  state.charts.push(new Chart(statusCanvas, {
    type: 'doughnut',
    data: { labels: statusLabels, datasets: [{ data: statusValues }] },
    options: { plugins: { legend: { labels: { color: '#d4d4d8' } } } }
  }));
}

function drawChartsForStats(stats) {
  if (!window.Chart) return;
  const bar = document.getElementById('statusBar');
  if (!bar) return;

  const statusKeys = Object.keys(stats.statusCounts);
  const statusLabels = statusKeys.map(k => STATUS_META[k]?.label || k);
  const statusValues = statusKeys.map(k => stats.statusCounts[k]);

  state.charts.push(new Chart(bar, {
    type: 'bar',
    data: { labels: statusLabels, datasets: [{ data: statusValues }] },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#d4d4d8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#d4d4d8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      }
    }
  }));
}

function renderCountries() {
  destroyCharts();
  $app.innerHTML = renderCountriesPage({ countries: EUROPE_COUNTRIES, q: state.countriesQuery });

  const input = document.getElementById('countrySearch');
  if (input) {
    input.addEventListener('input', () => {
      state.countriesQuery = input.value || '';
      renderCountries(); // local rerender
    });
    input.focus();
  }
  setActiveNav('countries');
}

function renderCountry(slug, tab='overview') {
  destroyCharts();
  const country = ensureCountry(slug);
  if (!country) {
    $app.innerHTML = renderNotFound();
    setActiveNav('');
    return;
  }

  setLastCountry(slug);

  const actor = getCurrentActorForCountry(slug) || placeholderActorFor(slug);
  const promises = getPromisesForCountry(slug);
  const evidenceCount = promises.reduce((acc,p)=>acc + getEvidenceForPromise(p.id).length, 0);
  const pulseRatings = getPulseRatings(slug);
  const posts = getPosts(slug);

  const stats = computeStats({
    slug,
    promises,
    evidenceCount,
    postsCount: posts.length,
    pulseRatings
  });

  // Build content for the active tab
  let content = '';
  if (tab === 'overview') {
    content = renderInsights({ stats }) + `
      <div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div class="font-medium">Quick actions</div>
        <div class="mt-3 flex flex-wrap gap-2">
          <a class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-950/80 transition" href="#/country/${slug}/promises">Browse promises</a>
          <a class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-950/80 transition" href="#/country/${slug}/pulse">Open Citizen Pulse</a>
          <a class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-950/80 transition" href="#/country/${slug}/community">Chat & voting</a>
        </div>
      </div>
    `;
  } else if (tab === 'promises') {
    content = renderPromisesList({ promises });
  } else if (tab === 'timeline') {
    content = renderTimeline({ promises });
  } else if (tab === 'insights') {
    content = renderInsights({ stats });
  } else if (tab === 'stats') {
    content = renderStats({ stats });
  } else if (tab === 'community') {
    content = renderCommunity({ country, posts });
  } else if (tab === 'pulse') {
    content = renderPulse({ country, ratings: pulseRatings, summary: pulseSummary(pulseRatings) });
  } else {
    tab = 'overview';
    content = renderInsights({ stats });
  }

  $app.innerHTML = `
    ${renderCountryHeader({ country, actor, stats })}
    ${renderCountryTabs({ countrySlug: slug, tab })}
    <div class="mt-6">${content}</div>
  `;

  // Charts
  if (tab === 'overview' || tab === 'insights') drawChartsForInsights(stats);
  if (tab === 'stats') drawChartsForStats(stats);

  // Community handlers
  const submitPost = document.getElementById('submitPost');
  if (submitPost) {
    submitPost.addEventListener('click', () => {
      const name = (document.getElementById('postName')?.value || '').trim();
      const text = (document.getElementById('postText')?.value || '').trim();
      if (!text) { toast('Write something first.'); return; }
      addPost(slug, { name, text });
      toast('Posted.');
      renderCountry(slug, 'community');
    });
  }
  document.querySelectorAll('.postVote').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.getAttribute('data-post-id');
      const delta = Number(btn.getAttribute('data-delta') || '0');
      if (!postId || !delta) return;
      votePost(slug, postId, delta);
      renderCountry(slug, 'community');
    });
  });

  // Pulse handlers
  document.querySelectorAll('.pulseRate').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = Number(btn.getAttribute('data-v') || '0');
      if (!v) return;
      addPulseRating(slug, v);
      toast('Thanks!');
      renderCountry(slug, 'pulse');
    });
  });

  setActiveNav('countries');
}

function renderCompare() {
  destroyCharts();
  const selection = getCompareSelection().filter(slug => ensureCountry(slug));
  const comparisons = {};
  for (const slug of selection) {
    const promises = getPromisesForCountry(slug);
    const pulseRatings = getPulseRatings(slug);
    const posts = getPosts(slug);
    const evidenceCount = promises.reduce((acc,p)=>acc + getEvidenceForPromise(p.id).length, 0);
    comparisons[slug] = computeStats({
      slug,
      promises,
      evidenceCount,
      postsCount: posts.length,
      pulseRatings
    });
  }

  $app.innerHTML = renderComparePage({
    countries: EUROPE_COUNTRIES,
    selection,
    comparisons
  });

  document.querySelectorAll('.comparePick').forEach(cb => {
    cb.addEventListener('change', () => {
      const slug = cb.getAttribute('data-slug');
      let next = getCompareSelection().slice();
      if (cb.checked) {
        if (!next.includes(slug)) next.push(slug);
        next = next.slice(0, 3);
      } else {
        next = next.filter(x => x !== slug);
      }
      setCompareSelection(next);
      renderCompare();
    });
  });

  setActiveNav('compare');
}

function renderPromise(id) {
  destroyCharts();
  const promise = PROMISE_BY_ID.get(id);
  if (!promise) {
    $app.innerHTML = renderNotFound();
    setActiveNav('');
    return;
  }
  const slug = ensureCountrySlugFromPromise(promise);
  const country = ensureCountry(slug) || { name: promise.country || 'Unknown', slug, code: '--' };
  const actor = getCurrentActorForCountry(slug) || placeholderActorFor(slug);
  const evidence = getEvidenceForPromise(promise.id);

  $app.innerHTML = renderPromiseDetail({ promise, country, actor, evidence });

  const shareBtn = document.getElementById('sharePromise');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => openShare(promise, country));
  }

  setActiveNav('');
}

function ensureCountrySlugFromPromise(promise) {
  const name = String(promise.country || '').toLowerCase();
  const hit = EUROPE_COUNTRIES.find(c => c.name.toLowerCase() === name);
  return hit ? hit.slug : (name || 'eu');
}

// --- Modal: share ---
function openShare(promise, country) {
  if (!$shareModal || !$shareText) return;
  const url = `${location.origin}${location.pathname}#/promise/${encodeURIComponent(promise.id)}`;
  $shareText.value = `${promise.title} — ${country.name}\n${url}`;
  $shareModal.classList.remove('hidden');
  document.getElementById('copyShare')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($shareText.value);
      toast('Copied.');
    } catch {
      toast('Copy failed.');
    }
  }, { once: true });
}

function closeShare() {
  $shareModal?.classList.add('hidden');
}
document.getElementById('closeShare')?.addEventListener('click', closeShare);
document.getElementById('shareBackdrop')?.addEventListener('click', closeShare);

// --- Modal: global search ---
function openSearch() {
  if (!$searchModal) return;
  $searchModal.classList.remove('hidden');
  const input = document.getElementById('globalSearchInput');
  input.value = '';
  input.focus();
  renderSearchResults('');
}

function closeSearch() {
  $searchModal?.classList.add('hidden');
}
document.getElementById('openSearch')?.addEventListener('click', openSearch);
document.getElementById('closeSearch')?.addEventListener('click', closeSearch);
document.getElementById('searchBackdrop')?.addEventListener('click', closeSearch);

function currentCountryFromRoute() {
  const { seg } = getRoute();
  if (seg[0] === 'country' && seg[1]) return seg[1];
  if (seg[0] === 'promise' && seg[1]) {
    const p = PROMISE_BY_ID.get(seg[1]);
    return p ? ensureCountrySlugFromPromise(p) : null;
  }
  return null;
}

function renderSearchResults(q) {
  const list = document.getElementById('searchResults');
  if (!list) return;
  const query = String(q || '').trim().toLowerCase();
  if (!query) {
    list.innerHTML = `<div class="text-sm text-zinc-400">Type to search promises…</div>`;
    return;
  }
  const cc = currentCountryFromRoute();
  const pool = cc ? getPromisesForCountry(cc) : Array.from(PROMISE_BY_ID.values());
  const matches = pool.filter(p => (p.title||'').toLowerCase().includes(query) || (p.fullText||'').toLowerCase().includes(query)).slice(0, 20);
  list.innerHTML = matches.length ? matches.map(p => `
    <a href="#/promise/${encodeURIComponent(p.id)}" class="block rounded-xl border border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950/80 transition px-3 py-2">
      <div class="text-sm font-medium">${escapeForDom(p.title)}</div>
      <div class="mt-1 text-xs text-zinc-500">${escapeForDom(p.country || '')}</div>
    </a>
  `).join('') : `<div class="text-sm text-zinc-400">No matches.</div>`;
}

function escapeForDom(s='') {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

document.getElementById('globalSearchInput')?.addEventListener('input', (e) => {
  renderSearchResults(e.target.value);
});

// --- Theme ---
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('promise-tracker-eu::theme', theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
}

function toggleTheme() {
  const cur = document.documentElement.dataset.theme || 'dark';
  setTheme(cur === 'dark' ? 'light' : 'dark');
}
document.getElementById('toggleTheme')?.addEventListener('click', toggleTheme);

(function initTheme() {
  const saved = localStorage.getItem('promise-tracker-eu::theme') || 'dark';
  setTheme(saved);
})();

// --- Nav state ---
function setActiveNav(which) {
  document.querySelectorAll('[data-nav]').forEach(a => {
    const key = a.getAttribute('data-nav');
    a.classList.toggle('nav-active', key === which);
  });
}

// --- Router ---
function route() {
  const { seg } = getRoute();

  // aliases
  if (seg.length === 0) {
    location.hash = '#/countries';
    return;
  }

  if (seg[0] === 'countries' || seg[0] === 'governments' || seg[0] === '') {
    renderCountries();
    return;
  }

  if (seg[0] === 'compare') {
    renderCompare();
    return;
  }

  if (seg[0] === 'country' && seg[1]) {
    const slug = seg[1];
    const tab = seg[2] || 'overview';
    renderCountry(slug, tab);
    return;
  }

  if (seg[0] === 'promise' && seg[1]) {
    renderPromise(seg[1]);
    return;
  }

  if (seg[0] === 'eu') { // convenience
    location.hash = '#/country/eu';
    return;
  }

  // fallback: go to last country
  if (seg[0] === 'home') {
    location.hash = `#/country/${getLastCountry('eu')}`;
    return;
  }

  $app.innerHTML = renderNotFound();
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
