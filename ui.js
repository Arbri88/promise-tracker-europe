// UI render helpers (pure functions: return HTML strings).
import { STATUS_META, CATEGORY_META } from './data.js';

export function escapeHtml(str='') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function flagEmoji(code='') {
  const c = String(code || '').toUpperCase();
  if (c === 'EU') return '🇪🇺';
  if (c.length !== 2) return '🏳️';
  const A = 0x1F1E6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + (c.charCodeAt(0) - base), A + (c.charCodeAt(1) - base));
}

export function formatDate(d) {
  if (!d) return '—';
  const dt = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function statusBadge(status) {
  const label = STATUS_META[status]?.label || status || '—';
  const s = String(status || '');
  const cls =
    s === 'KEPT' ? 'bg-green-500/15 text-green-200 border-green-500/25' :
    s === 'BROKEN' ? 'bg-red-500/15 text-red-200 border-red-500/25' :
    s === 'IN_THE_WORKS' ? 'bg-blue-500/15 text-blue-200 border-blue-500/25' :
    s === 'STALLED' ? 'bg-amber-500/15 text-amber-200 border-amber-500/25' :
    s === 'COMPROMISE' ? 'bg-purple-500/15 text-purple-200 border-purple-500/25' :
    'bg-zinc-500/10 text-zinc-200 border-zinc-500/20';
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cls}">${escapeHtml(label)}</span>`;
}

export function categoryPill(category) {
  const label = CATEGORY_META[category]?.label || category || '—';
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-zinc-700 bg-zinc-900/40 text-zinc-200">${escapeHtml(label)}</span>`;
}

export function statCard(title, value, sub='') {
  return `
    <div class="rounded-2xl glass-card p-4">
      <div class="text-xs text-zinc-400">${escapeHtml(title)}</div>
      <div class="mt-2 stat-emphasis font-semibold">${escapeHtml(String(value))}</div>
      ${sub ? `<div class="mt-1 text-xs text-zinc-500">${escapeHtml(sub)}</div>` : ''}
    </div>
  `;
}

export function renderShell({ title, subtitle, actionsHtml='' }) {
  return `
    <div class="page-heading">
      <div>
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="mt-2 text-sm text-zinc-400 max-w-3xl">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      ${actionsHtml}
    </div>
  `;
}

export function renderCountriesPage({ countries, q='' }) {
  const query = String(q || '').trim().toLowerCase();
  const filtered = countries.filter(c => c.name.toLowerCase().includes(query) || c.slug.includes(query) || c.code.toLowerCase().includes(query));
  const cards = filtered.map(c => `
    <a href="#/country/${c.slug}" class="group rounded-2xl glass-card hover:bg-zinc-950/70 transition p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="text-2xl">${flagEmoji(c.code)}</div>
          <div>
            <div class="font-medium">${escapeHtml(c.name)}</div>
            <div class="text-xs text-zinc-500">/${escapeHtml(c.slug)}</div>
          </div>
        </div>
        <div class="text-zinc-500 group-hover:text-zinc-300">→</div>
      </div>
    </a>
  `).join('');

  return `
    ${renderShell({ title: 'Countries', subtitle: 'Pick a country to see its promises, timeline, insights, statistics, community voting, and citizen pulse.' })}
    <div class="mt-6">
      <label class="text-xs text-zinc-500">Search countries</label>
      <input id="countrySearch" value="${escapeHtml(q)}" placeholder="Type a country name…" class="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-700" />
    </div>
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${cards || `<div class="text-sm text-zinc-400">No matches.</div>`}
    </div>
  `;
}

export function renderCountryHeader({ country, actor, stats }) {
  const leader = actor?.name || '—';
  const party = actor?.party ? ` · ${escapeHtml(actor.party)}` : '';
  const term = actor?.termStart ? `${formatDate(actor.termStart)} → ${actor.termEnd ? formatDate(actor.termEnd) : 'present'}` : '—';
  const small = `${leader}${party} · term: ${term}`;

  return `
    <div class="rounded-3xl glass-card-strong p-5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="text-3xl">${flagEmoji(country.code)}</div>
          <div>
            <div class="text-2xl font-semibold tracking-tight">${escapeHtml(country.name)}</div>
            <div class="mt-1 text-xs text-zinc-500">${small}</div>
          </div>
        </div>
        <div class="text-right text-xs text-zinc-500">
          <div>${escapeHtml(stats.total)} promises tracked</div>
          <div>last updated: ${escapeHtml(stats.lastUpdated || '—')}</div>
        </div>
      </div>
    </div>
  `;
}

export function renderCountryTabs({ countrySlug, tab }) {
  const tabs = [
    ['overview','Overview'],
    ['promises','Promises'],
    ['timeline','Timeline'],
    ['insights','Insights'],
    ['stats','Statistics'],
    ['community','Chat & Voting'],
    ['pulse','Citizen Pulse'],
  ];
  const items = tabs.map(([key,label]) => {
    const active = key === tab;
    const cls = active
      ? 'bg-zinc-100 text-zinc-950'
      : 'bg-zinc-950/50 text-zinc-300 hover:bg-zinc-950/80';
    return `<a class="px-3 py-2 rounded-xl text-sm font-medium pill ${cls} transition" href="#/country/${countrySlug}/${key}">${escapeHtml(label)}</a>`;
  }).join('');
  return `<div class="mt-4 flex flex-wrap gap-2">${items}</div>`;
}

export function renderPromisesList({ promises }) {
  if (!promises.length) {
    return `<div class="mt-6 text-sm text-zinc-400">No promises tracked for this country yet.</div>`;
  }
  const rows = promises.map(p => `
    <a href="#/promise/${encodeURIComponent(p.id)}" class="block rounded-2xl glass-card hover:bg-zinc-950/70 transition p-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="font-medium leading-snug">${escapeHtml(p.title)}</div>
          <div class="mt-2 flex flex-wrap gap-2 items-center">
            ${categoryPill(p.category)}
            ${statusBadge(p.status)}
            ${p.timeline ? `<span class="text-xs text-zinc-500">· ${escapeHtml(p.timeline)}</span>` : ''}
          </div>
        </div>
        <div class="text-xs text-zinc-500 whitespace-nowrap">${formatDate(p.updatedAt)}</div>
      </div>
      ${p.fullText ? `<div class="mt-3 text-sm text-zinc-400 line-clamp-2">${escapeHtml(p.fullText)}</div>` : ''}
    </a>
  `).join('');
  return `<div class="mt-6 grid gap-3">${rows}</div>`;
}

export function renderTimeline({ promises }) {
  if (!promises.length) return `<div class="mt-6 text-sm text-zinc-400">No timeline events yet.</div>`;
  const items = [...promises]
    .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 50)
    .map(p => `
      <div class="rounded-2xl glass-card p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="font-medium">${escapeHtml(p.title)}</div>
          <div class="text-xs text-zinc-500">${formatDate(p.updatedAt)}</div>
        </div>
        <div class="mt-2 text-sm text-zinc-400">
          Status: ${statusBadge(p.status)} ${p.timeline ? ` · target: ${escapeHtml(p.timeline)}` : ''}
        </div>
      </div>
    `).join('');
  return `<div class="mt-6 grid gap-3">${items}</div>`;
}

export function renderInsights({ stats }) {
  return `
    <div class="mt-6 grid stat-grid gap-3">
      ${statCard('Kept', stats.kept, `${stats.keptPct}% of tracked`)}
      ${statCard('In progress', stats.inProgress, `${stats.inProgressPct}% of tracked`)}
      ${statCard('Stalled', stats.stalled, `${stats.stalledPct}% of tracked`)}
      ${statCard('Broken', stats.broken, `${stats.brokenPct}% of tracked`)}
    </div>

    <div class="mt-6 rounded-2xl glass-card p-4">
      <div class="flex items-center justify-between">
        <div class="font-medium">Category mix</div>
        <div class="text-xs text-zinc-500">based on tracked promises</div>
      </div>
      <div class="mt-4 grid sm:grid-cols-2 gap-3">
        <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <canvas id="categoryChart" height="160"></canvas>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <canvas id="statusChart" height="160"></canvas>
        </div>
      </div>
    </div>
  `;
}

export function renderStats({ stats }) {
  return `
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      ${statCard('Total promises', stats.total)}
      ${statCard('High importance', stats.highImportance)}
      ${statCard('Evidence items', stats.evidenceCount)}
      ${statCard('Community posts', stats.postCount)}
    </div>

    <div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div class="font-medium">Status distribution</div>
      <div class="mt-4">
        <canvas id="statusBar" height="200"></canvas>
      </div>
    </div>
  `;
}

export function renderCommunity({ country, posts }) {
  const items = posts.length
    ? posts.slice().sort((a,b)=>b.t-a.t).map(p => `
        <div class="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-medium">${escapeHtml(p.name || 'Anonymous')}</div>
            <div class="text-xs text-zinc-500">${new Date(p.t).toLocaleString()}</div>
          </div>
          <div class="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">${escapeHtml(p.text)}</div>
          <div class="mt-3 flex items-center gap-2">
            <button class="postVote inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs hover:bg-zinc-950/80 transition" data-post-id="${escapeHtml(p.id)}" data-delta="1">▲ Upvote</button>
            <button class="postVote inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs hover:bg-zinc-950/80 transition" data-post-id="${escapeHtml(p.id)}" data-delta="-1">▼</button>
            <div class="text-xs text-zinc-500">score: <span class="font-medium text-zinc-200">${escapeHtml(String(p.up || 0))}</span></div>
          </div>
        </div>
      `).join('')
    : `<div class="text-sm text-zinc-400">No posts yet. Start the discussion below.</div>`;

  return `
    <div class="mt-6 grid gap-3">${items}</div>

    <div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div class="font-medium">Post a comment</div>
      <div class="mt-4 grid gap-3">
        <input id="postName" placeholder="Name (optional)" class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-700" />
        <textarea id="postText" rows="4" placeholder="What should be tracked next? Add sources if you can." class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-700"></textarea>
        <button id="submitPost" class="rounded-xl bg-zinc-100 text-zinc-950 px-4 py-2 text-sm font-medium hover:bg-white transition w-fit">Publish</button>
      </div>
    </div>
  `;
}

export function renderPulse({ country, ratings, summary }) {
  const dist = summary.dist || [0,0,0,0,0];
  const bars = dist.map((count, idx) => {
    const pct = summary.total ? Math.round((count/summary.total)*100) : 0;
    const stars = 5-idx;
    return `
      <div class="flex items-center gap-3">
        <div class="w-14 text-xs text-zinc-400">${stars}★</div>
        <div class="flex-1 h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div class="h-full bg-zinc-100/70" style="width:${pct}%"></div>
        </div>
        <div class="w-14 text-right text-xs text-zinc-500">${count}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="mt-6 grid sm:grid-cols-2 gap-4">
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div class="font-medium">How is it going?</div>
        <div class="mt-2 text-sm text-zinc-400">Rate government performance in <span class="font-medium text-zinc-200">${escapeHtml(country.name)}</span> from 1 to 5.</div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${[1,2,3,4,5].map(v => `<button class="pulseRate rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-950/80 transition" data-v="${v}">${v}</button>`).join('')}
        </div>
        <div class="mt-4 text-xs text-zinc-500">Stored locally in your browser (demo mode).</div>
      </div>

      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div class="flex items-center justify-between">
          <div class="font-medium">Citizen Pulse</div>
          <div class="text-xs text-zinc-500">${summary.total} ratings</div>
        </div>
        <div class="mt-2 text-3xl font-semibold">${summary.avg ? summary.avg.toFixed(2) : '—'}</div>
        <div class="mt-4 grid gap-2">${bars}</div>
      </div>
    </div>
  `;
}

export function renderComparePage({ countries, selection, comparisons }) {
  const options = countries.map(c => {
    const checked = selection.includes(c.slug) ? 'checked' : '';
    const disabled = !checked && selection.length >= 3 ? 'disabled' : '';
    return `
      <label class="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 hover:bg-zinc-950/70 transition">
        <div class="flex items-center gap-3">
          <div class="text-xl">${flagEmoji(c.code)}</div>
          <div>
            <div class="text-sm font-medium">${escapeHtml(c.name)}</div>
            <div class="text-xs text-zinc-500">${escapeHtml(c.code)}</div>
          </div>
        </div>
        <input class="comparePick" type="checkbox" data-slug="${escapeHtml(c.slug)}" ${checked} ${disabled}/>
      </label>
    `;
  }).join('');

  const columns = selection.map(slug => {
    const c = countries.find(x => x.slug === slug);
    const s = comparisons[slug];
    if (!c) return '';
    return `
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div class="flex items-center gap-3">
          <div class="text-2xl">${flagEmoji(c.code)}</div>
          <div>
            <div class="font-medium">${escapeHtml(c.name)}</div>
            <div class="text-xs text-zinc-500">${escapeHtml(c.code)} · ${s.total} promises</div>
          </div>
        </div>
        <div class="mt-4 grid gap-2 text-sm">
          <div class="flex justify-between"><span class="text-zinc-400">Kept</span><span>${s.kept} (${s.keptPct}%)</span></div>
          <div class="flex justify-between"><span class="text-zinc-400">In progress</span><span>${s.inProgress} (${s.inProgressPct}%)</span></div>
          <div class="flex justify-between"><span class="text-zinc-400">Stalled</span><span>${s.stalled} (${s.stalledPct}%)</span></div>
          <div class="flex justify-between"><span class="text-zinc-400">Broken</span><span>${s.broken} (${s.brokenPct}%)</span></div>
          <div class="flex justify-between"><span class="text-zinc-400">Pulse avg</span><span>${s.pulseAvg ? s.pulseAvg.toFixed(2) : '—'}</span></div>
          <div class="flex justify-between"><span class="text-zinc-400">Community posts</span><span>${s.postCount}</span></div>
        </div>
        <div class="mt-4">
          <a class="text-sm underline text-zinc-200 hover:text-white" href="#/country/${escapeHtml(slug)}">Open country →</a>
        </div>
      </div>
    `;
  }).join('');

  return `
    ${renderShell({ title: 'Compare', subtitle: 'Select up to 3 countries to compare promise progress and citizen pulse.' })}
    <div class="mt-6 grid lg:grid-cols-2 gap-4">
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div class="font-medium">Pick countries (max 3)</div>
        <div class="mt-4 grid gap-2 max-h-[480px] overflow-auto pr-1">${options}</div>
      </div>
      <div>
        <div class="font-medium">Comparison</div>
        <div class="mt-4 grid gap-3">
          ${selection.length ? columns : `<div class="text-sm text-zinc-400">Pick 1–3 countries to see the comparison.</div>`}
        </div>
      </div>
    </div>
  `;
}

export function renderPromiseDetail({ promise, country, actor, evidence }) {
  const ev = evidence.length
    ? evidence.slice().sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).map(e => `
      <div class="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-medium">${escapeHtml(e.title || 'Evidence')}</div>
          <div class="text-xs text-zinc-500">${formatDate(e.publishedAt)}</div>
        </div>
        ${e.summary ? `<div class="mt-2 text-sm text-zinc-400">${escapeHtml(e.summary)}</div>` : ''}
        ${e.url ? `<div class="mt-3 text-sm"><a class="underline text-zinc-200 hover:text-white" href="${escapeHtml(e.url)}" target="_blank" rel="noreferrer">Open source</a></div>` : ''}
      </div>
    `).join('')
    : `<div class="text-sm text-zinc-400">No evidence items linked yet.</div>`;

  return `
    <div class="flex items-center justify-between gap-3">
      <a href="#/country/${escapeHtml(country.slug)}/promises" class="text-sm text-zinc-300 hover:text-white underline">← Back to ${escapeHtml(country.name)}</a>
      <button id="sharePromise" class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm hover:bg-zinc-950/80 transition">Share</button>
    </div>

    <div class="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-sm text-zinc-500">${flagEmoji(country.code)} ${escapeHtml(country.name)} · ${escapeHtml(actor?.name || '—')}</div>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight">${escapeHtml(promise.title)}</h1>
          <div class="mt-3 flex flex-wrap gap-2 items-center">
            ${categoryPill(promise.category)}
            ${statusBadge(promise.status)}
            ${promise.timeline ? `<span class="text-xs text-zinc-500">· ${escapeHtml(promise.timeline)}</span>` : ''}
          </div>
        </div>
        <div class="text-xs text-zinc-500 whitespace-nowrap">updated: ${formatDate(promise.updatedAt)}</div>
      </div>
      ${promise.fullText ? `<div class="mt-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">${escapeHtml(promise.fullText)}</div>` : ''}
    </div>

    <div class="mt-6">
      <div class="font-medium">Evidence</div>
      <div class="mt-3 grid gap-3">${ev}</div>
    </div>
  `;
}

export function renderNotFound() {
  return `
    ${renderShell({ title: 'Not found', subtitle: 'That page does not exist.' })}
    <div class="mt-6">
      <a class="underline text-zinc-200 hover:text-white" href="#/countries">Go to Countries</a>
    </div>
  `;
}
