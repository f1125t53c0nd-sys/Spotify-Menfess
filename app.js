/* =========================================================
   CONFIG — paste your deployed Apps Script Web App URL here
   ========================================================= */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx8fk3GpUPZxghA-mVt68ZjxmkTjE9R0qYva2jDzNzRFpGbIYEtgYvzTyNXZfT-hFgRig/exec';

const STORAGE_USER_KEY = 'menfess_user';
const STORAGE_THEME_KEY = 'menfess_theme';
const STORAGE_BEST_MOVES_KEY = 'menfess_game_best';

/* ---------- small helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 250);
  }, 2600);
}

async function apiPost(payload) {
  if (WEB_APP_URL.includes('PASTE_YOUR')) {
    showToast('Isi dulu WEB_APP_URL di app.js dengan URL Web App-mu.', true);
    throw new Error('WEB_APP_URL not configured');
  }
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    // text/plain avoids a CORS preflight against Apps Script
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function apiGet(action) {
  if (WEB_APP_URL.includes('PASTE_YOUR')) {
    showToast('Isi dulu WEB_APP_URL di app.js dengan URL Web App-mu.', true);
    throw new Error('WEB_APP_URL not configured');
  }
  const res = await fetch(`${WEB_APP_URL}?action=${encodeURIComponent(action)}`);
  return res.json();
}

/* =========================================================
   THEME
   ========================================================= */
function initTheme() {
  const saved = localStorage.getItem(STORAGE_THEME_KEY) || 'dark';
  document.documentElement.dataset.theme = saved;
  $('#themeToggle').textContent = saved === 'dark' ? '🌙' : '☀️';
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(STORAGE_THEME_KEY, next);
  $('#themeToggle').textContent = next === 'dark' ? '🌙' : '☀️';
}

/* =========================================================
   AUTH
   ========================================================= */
function getSavedUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_USER_KEY)); }
  catch { return null; }
}
function saveUser(user) { localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user)); }
function clearUser() { localStorage.removeItem(STORAGE_USER_KEY); }

function setAuthTab(tab) {
  $$('.auth-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  $('#loginForm').hidden = tab !== 'login';
  $('#registerForm').hidden = tab !== 'register';
  $('#authMessage').hidden = true;
}

function setAuthMessage(msg, ok = false) {
  const el = $('#authMessage');
  el.textContent = msg;
  el.hidden = false;
  el.classList.toggle('success', ok);
}

function setFormBusy(form, busy) {
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = busy;
  btn.querySelector('.btn-spinner').hidden = !busy;
}

async function handleLogin(e) {
  e.preventDefault();
  const username = $('#loginUsername').value.trim();
  const password = $('#loginPassword').value;
  setFormBusy(e.target, true);
  try {
    const result = await apiPost({ action: 'login', username, password });
    if (result.success) {
      saveUser({ username: result.username, token: result.token });
      enterApp();
    } else {
      setAuthMessage(result.message || 'Gagal masuk.');
      $('.auth-card').classList.add('shake');
      setTimeout(() => $('.auth-card').classList.remove('shake'), 400);
    }
  } catch (err) { /* toast already shown */ }
  setFormBusy(e.target, false);
}

async function handleRegister(e) {
  e.preventDefault();
  const username = $('#registerUsername').value.trim();
  const password = $('#registerPassword').value;
  setFormBusy(e.target, true);
  try {
    const result = await apiPost({ action: 'register', username, password });
    if (result.success) {
      saveUser({ username: result.username, token: result.token });
      enterApp();
    } else {
      setAuthMessage(result.message || 'Gagal daftar.');
      $('.auth-card').classList.add('shake');
      setTimeout(() => $('.auth-card').classList.remove('shake'), 400);
    }
  } catch (err) { /* toast already shown */ }
  setFormBusy(e.target, false);
}

function logout() {
  clearUser();
  $('#appScreen').hidden = true;
  $('#authScreen').hidden = false;
  $('#loginForm').reset();
  $('#registerForm').reset();
}

function enterApp() {
  const user = getSavedUser();
  if (!user) return;
  $('#authScreen').hidden = true;
  $('#appScreen').hidden = false;
  $('#currentUserName').textContent = user.username;
  loadWall();
  setupGame();
}

/* =========================================================
   NAVIGATION
   ========================================================= */
const VIEW_TITLES = { wall: 'Song Wall', submit: 'Kirim Menfess', game: 'Mini Game' };

function switchView(view) {
  $$('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  $$('.view').forEach(sec => sec.classList.toggle('active', sec.id === `view-${view}`));
  $('#viewTitle').textContent = VIEW_TITLES[view] || '';
}

/* =========================================================
   SONG WALL
   ========================================================= */
let wallData = [];

function extractSpotifyTrackId(url) {
  if (!url) return null;
  const m1 = url.match(/track[/:]([a-zA-Z0-9]+)/);
  return m1 ? m1[1] : null;
}

async function loadWall() {
  $('#wallLoading').hidden = false;
  $('#cardsGrid').hidden = true;
  $('#emptyState').hidden = true;
  try {
    const result = await apiGet('getMenfess');
    wallData = (result.success && result.data) ? result.data : [];
  } catch (err) {
    wallData = [];
  }
  $('#wallLoading').hidden = true;
  renderWall(wallData);
}

function cardHTML(item, index) {
  const senderLabel = item.isAnonim || !item.senderName ? 'Anonim' : item.senderName;
  const safeMsg = (item.message || '').replace(/</g, '&lt;');
  return `
    <article class="cassette-card" style="animation-delay:${Math.min(index * 45, 400)}ms" data-index="${index}">
      <div class="cassette-window">
        <div class="reel"></div>
        <div class="tape-strip"></div>
        <div class="reel"></div>
      </div>
      <div class="card-recipient">Untuk</div>
      <div class="card-to">${escapeHTML(item.recipient)}</div>
      <div class="card-message">${escapeHTML(safeMsg)}</div>
      <div class="card-footer">
        <span class="card-sender">— ${escapeHTML(senderLabel)}</span>
        <button class="play-btn" aria-label="Putar lagu">▶</button>
      </div>
    </article>`;
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function renderWall(list) {
  const grid = $('#cardsGrid');
  if (!list.length) {
    grid.hidden = true;
    $('#emptyState').hidden = false;
    return;
  }
  $('#emptyState').hidden = true;
  grid.hidden = false;
  grid.innerHTML = list.map(cardHTML).join('');
  $$('.cassette-card .play-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => playTrack(list[i], btn.closest('.cassette-card')));
  });
}

function playTrack(item, cardEl) {
  const trackId = extractSpotifyTrackId(item.spotifyLink);
  const bar = $('#nowPlaying');
  const embed = $('#npEmbed');
  $$('.cassette-card').forEach(c => c.classList.remove('playing'));
  $$('.play-btn').forEach(b => b.textContent = '▶');

  if (!trackId) {
    showToast('Link Spotify tidak valid.', true);
    return;
  }
  cardEl.classList.add('playing');
  cardEl.querySelector('.play-btn').textContent = '❚❚';
  $('#npTitle').textContent = `${item.recipient}`;
  embed.innerHTML = `<iframe src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  bar.hidden = false;
}

function closeNowPlaying() {
  $('#nowPlaying').hidden = true;
  $('#npEmbed').innerHTML = '';
  $$('.cassette-card').forEach(c => c.classList.remove('playing'));
}

function filterWall(query) {
  const q = query.trim().toLowerCase();
  if (!q) { renderWall(wallData); return; }
  const filtered = wallData.filter(item =>
    (item.recipient || '').toLowerCase().includes(q) ||
    (item.message || '').toLowerCase().includes(q) ||
    (item.senderName || '').toLowerCase().includes(q)
  );
  renderWall(filtered);
}

/* =========================================================
   SUBMIT FORM
   ========================================================= */
function toggleSenderField() {
  const anon = $('#isAnonim').checked;
  $('#senderNameWrap').classList.toggle('hidden-field', anon);
  $('#senderName').required = !anon;
}

async function handleMenfessSubmit(e) {
  e.preventDefault();
  const spotifyLink = $('#spotifyLink').value.trim();
  if (!extractSpotifyTrackId(spotifyLink)) {
    showToast('Cek lagi link Spotify-nya, ya.', true);
    return;
  }
  const payload = {
    action: 'submitMenfess',
    isAnonim: $('#isAnonim').checked,
    senderName: $('#senderName').value.trim(),
    recipient: $('#recipient').value.trim(),
    message: $('#message').value.trim(),
    spotifyLink
  };
  setFormBusy(e.target, true);
  try {
    const result = await apiPost(payload);
    if (result.success) {
      showToast('Menfess terkirim! 🎶');
      e.target.reset();
      toggleSenderField();
      switchView('wall');
      loadWall();
    } else {
      showToast(result.message || 'Gagal mengirim.', true);
    }
  } catch (err) { /* toast already shown */ }
  setFormBusy(e.target, false);
}

/* =========================================================
   MINI GAME — Cassette Memory Match
   ========================================================= */
const GAME_SYMBOLS = ['🎵', '🎧', '💌', '⭐', '🎤', '📻', '💜', '🎶'];
let gameState = { tiles: [], first: null, second: null, moves: 0, matched: 0, seconds: 0, timer: null, locked: false };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setupGame() {
  clearInterval(gameState.timer);
  const symbols = shuffle([...GAME_SYMBOLS, ...GAME_SYMBOLS]);
  gameState = { tiles: symbols, first: null, second: null, moves: 0, matched: 0, seconds: 0, timer: null, locked: false };
  $('#gameMoves').textContent = '0';
  $('#gameTime').textContent = '0s';
  $('#gameBest').textContent = localStorage.getItem(STORAGE_BEST_MOVES_KEY) || '-';
  renderGame();
}

function renderGame() {
  const grid = $('#gameGrid');
  grid.innerHTML = gameState.tiles.map((symbol, i) => `
    <div class="game-tile" data-index="${i}" data-symbol="${symbol}">
      <div class="tile-face tile-back">📼</div>
      <div class="tile-face tile-front">${symbol}</div>
    </div>`).join('');
  $$('.game-tile').forEach(tile => tile.addEventListener('click', onTileClick));
}

function startGameTimer() {
  if (gameState.timer) return;
  gameState.timer = setInterval(() => {
    gameState.seconds++;
    $('#gameTime').textContent = `${gameState.seconds}s`;
  }, 1000);
}

function onTileClick(e) {
  const tile = e.currentTarget;
  const index = Number(tile.dataset.index);
  if (gameState.locked || tile.classList.contains('flipped') || tile.classList.contains('matched')) return;

  startGameTimer();
  tile.classList.add('flipped');

  if (gameState.first === null) {
    gameState.first = index;
    return;
  }
  gameState.second = index;
  gameState.locked = true;
  gameState.moves++;
  $('#gameMoves').textContent = gameState.moves;

  const firstTile = $(`.game-tile[data-index="${gameState.first}"]`);
  const symbolA = gameState.tiles[gameState.first];
  const symbolB = gameState.tiles[gameState.second];

  if (symbolA === symbolB) {
    firstTile.classList.add('matched');
    tile.classList.add('matched');
    gameState.matched += 2;
    resetSelection();
    if (gameState.matched === gameState.tiles.length) finishGame();
  } else {
    setTimeout(() => {
      firstTile.classList.add('wrong');
      tile.classList.add('wrong');
      setTimeout(() => {
        firstTile.classList.remove('flipped', 'wrong');
        tile.classList.remove('flipped', 'wrong');
        resetSelection();
      }, 500);
    }, 500);
  }
}

function resetSelection() {
  gameState.first = null;
  gameState.second = null;
  gameState.locked = false;
}

function finishGame() {
  clearInterval(gameState.timer);
  gameState.timer = null;
  const best = Number(localStorage.getItem(STORAGE_BEST_MOVES_KEY) || Infinity);
  if (gameState.moves < best) {
    localStorage.setItem(STORAGE_BEST_MOVES_KEY, gameState.moves);
    $('#gameBest').textContent = gameState.moves;
    showToast(`Rekor baru! Selesai dalam ${gameState.moves} langkah 🏆`);
  } else {
    showToast(`Selesai dalam ${gameState.moves} langkah, ${gameState.seconds}s 🎉`);
  }
}

/* =========================================================
   INIT
   ========================================================= */
function init() {
  initTheme();

  $$('.auth-tab').forEach(btn => btn.addEventListener('click', () => setAuthTab(btn.dataset.tab)));
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#registerForm').addEventListener('submit', handleRegister);

  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#logoutBtn').addEventListener('click', logout);
  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));

  $('#searchInput').addEventListener('input', (e) => filterWall(e.target.value));
  $('#refreshWall').addEventListener('click', loadWall);

  $('#isAnonim').addEventListener('change', toggleSenderField);
  $('#menfessForm').addEventListener('submit', handleMenfessSubmit);

  $('#npClose').addEventListener('click', closeNowPlaying);
  $('#gameRestart').addEventListener('click', setupGame);

  toggleSenderField();

  if (getSavedUser()) {
    enterApp();
  }
}

document.addEventListener('DOMContentLoaded', init);
