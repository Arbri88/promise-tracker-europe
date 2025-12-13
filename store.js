// Local storage helpers for PromiseTracker Europe

const PREFIX = 'promise-tracker-eu::';

function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

export function load(key, fallback) {
  const raw = localStorage.getItem(PREFIX + key);
  if (!raw) return fallback;
  return safeParse(raw, fallback);
}

export function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function uid(prefix='id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// Citizen Pulse: store per-country ratings (1-5) with timestamps.
// { [countrySlug]: [{v: number, t: number}] }
export function addPulseRating(countrySlug, value) {
  const db = load('pulse', {});
  const arr = db[countrySlug] || [];
  arr.push({ v: value, t: Date.now() });
  // Keep last 500 ratings per country
  db[countrySlug] = arr.slice(-500);
  save('pulse', db);
  return db[countrySlug];
}

export function getPulseRatings(countrySlug) {
  const db = load('pulse', {});
  return db[countrySlug] || [];
}

// Community posts per country.
// { [countrySlug]: [{id, name, text, t, up}] }
export function addPost(countrySlug, { name, text }) {
  const db = load('posts', {});
  const arr = db[countrySlug] || [];
  arr.push({ id: uid('post'), name: name || 'Anonymous', text, t: Date.now(), up: 0 });
  db[countrySlug] = arr.slice(-200);
  save('posts', db);
  return db[countrySlug];
}

export function getPosts(countrySlug) {
  const db = load('posts', {});
  return db[countrySlug] || [];
}

export function votePost(countrySlug, postId, delta) {
  const db = load('posts', {});
  const arr = db[countrySlug] || [];
  const p = arr.find(x => x.id === postId);
  if (p) p.up = Math.max(0, (p.up || 0) + delta);
  db[countrySlug] = arr;
  save('posts', db);
  return p;
}

// Compare selection persistence
export function getCompareSelection() {
  return load('compareSelection', []);
}

export function setCompareSelection(slugs) {
  save('compareSelection', slugs);
}

export function setLastCountry(slug) {
  save('lastCountry', slug);
}

export function getLastCountry(defaultSlug='eu') {
  return load('lastCountry', defaultSlug);
}
