import { row, playTrackByIndex, trn } from "./music.js";

const PLAYLISTS_KEY = 'userPlaylists';

// ========== STATE ==========
let currentPlaylistIndices = [];       // ordered (or shuffled) indices of the active playlist
let currentPlaylistIndicesSorted = []; // original sorted order
let playlistShuffleOn = false;
let playlistRepeatOn = false; 
let currentPlaylistPos = 0;

// ========== HELPERS ==========
function getPlaylists() {
  const raw = localStorage.getItem(PLAYLISTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function savePlaylists(playlists) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

function getCurrentTrackId() {
  if (typeof trn !== 'undefined' && row[trn]) {
    const trackEl = row[trn].querySelector('.Track');
    return trackEl ? trackEl.dataset.trackId : null;
  }
  return null;
}

// ========== SHUFFLE TOGGLE ==========

function shuffleArray(arr) {
    // Fisher‑Yates (same as fy, but takes an array and returns it)
    for (let c = arr.length; c; ) {
        const b = Math.random() * c-- | 0;
        const d = arr[c];
        arr[c] = arr[b];
        arr[b] = d;
    }
    return arr;
}

function togglePlaylistShuffle() {
  if (!document.body.classList.contains('playlist-view')) return;

  playlistShuffleOn = !playlistShuffleOn;
  if (playlistShuffleOn) {
    const shuffled = [...currentPlaylistIndicesSorted];
    shuffleArray(shuffled);
    const currentIdx = (typeof trn !== 'undefined') ? trn : -1;
    if (currentIdx >= 0 && shuffled.includes(currentIdx)) {
      const pos = shuffled.indexOf(currentIdx);
      shuffled.splice(pos, 1);
      shuffled.unshift(currentIdx);
    }
    currentPlaylistIndices = shuffled;
    currentPlaylistPos = 0;
  } else {
    currentPlaylistIndices = [...currentPlaylistIndicesSorted];
    const currentIdx = (typeof trn !== 'undefined') ? trn : -1;
    const pos = currentPlaylistIndices.indexOf(currentIdx);
    currentPlaylistPos = (pos >= 0) ? pos : 0;
  }

  const sb = document.getElementById('Shuffle');
  if (sb) sb.style.background = playlistShuffleOn ? '#eeeeee' : '#d7ffff';
}

// ========== NAVIGATION ==========
function playCurrentPlaylistTrack() {
  const idx = currentPlaylistIndices[currentPlaylistPos];
  playTrackByIndex(idx);
}

function playlistNext() {
  if (currentPlaylistIndices.length === 0) return;
  currentPlaylistPos = (currentPlaylistPos + 1) % currentPlaylistIndices.length;
  playCurrentPlaylistTrack();
}

function playlistPrev() {
  if (currentPlaylistIndices.length === 0) return;
  currentPlaylistPos = (currentPlaylistPos - 1 + currentPlaylistIndices.length) % currentPlaylistIndices.length;
  playCurrentPlaylistTrack();
}

// Intercept all player controls when playlist-view is active
function setupPlaylistNavigation() {
  const nextBtn = document.getElementById('Next');
  const prevBtn = document.getElementById('Previous');
  const shuffleBtn = document.getElementById('Shuffle');
  const audio = document.getElementById('PlayerAudio');
  const repeatBtn = document.getElementById('Repeat');
 
  // Next / Previous / Shuffle
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      if (!document.body.classList.contains('playlist-view')) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      playlistNext();
    }, { capture: true });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      if (!document.body.classList.contains('playlist-view')) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      playlistPrev();
    }, { capture: true });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', (e) => {
      if (!document.body.classList.contains('playlist-view')) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      togglePlaylistShuffle();
    }, { capture: true });
  }

 if (repeatBtn) {
    repeatBtn.addEventListener('click', (e) => {
      if (!document.body.classList.contains('playlist-view')) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      playlistRepeatOn = !playlistRepeatOn;
      repeatBtn.style.background = playlistRepeatOn ? '#eeeeee' : '#d7ffff';
    }, { capture: true });
  }

  // Auto‑advance: intercept ended event
if (audio) {
  audio.addEventListener('ended', (e) => {
    if (!document.body.classList.contains('playlist-view')) return;
	  e.stopImmediatePropagation();
	  e.preventDefault();

	  if (playlistRepeatOn) {
	    audio.currentTime = 0;
	    audio.play();
	    return;
	  }
	  playlistNext();
    }, { capture: true });
  }
}

// ========== RENDERING PLAYLISTS IN MODAL ==========
function renderPlaylistList() {
  const playlists = getPlaylists();
  const container = document.getElementById('playlist-list');
  const label = document.getElementById('existing-label');
  container.innerHTML = '';
  const names = Object.keys(playlists);
  if (names.length === 0) {
    label.style.display = 'none';
    return;
  }
  label.style.display = 'block';
  names.forEach(name => {
    const div = document.createElement('div');
    div.className = 'playlist-item';
    div.innerHTML = `
      <span class="playlist-name" data-name="${name}">${name}</span>
      <div class="playlist-actions">
        <button class="add-to-existing-btn" title="Add current track">➕</button>
        <button class="delete-playlist-btn" title="Delete playlist">➖</button>
      </div>
    `;

    div.querySelector('.playlist-name').addEventListener('click', (e) => {
      e.stopPropagation();
      showPlaylist(name);
    });

    div.querySelector('.add-to-existing-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      addToExistingPlaylist(name);
    });

    div.querySelector('.delete-playlist-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deletePlaylist(name);
    });

    container.appendChild(div);
  });
}

function addToExistingPlaylist(name) {
  const trackId = getCurrentTrackId();
  if (!trackId) return;
  const playlists = getPlaylists();
  if (!playlists[name]) playlists[name] = [];
  if (!playlists[name].includes(trackId)) {
    playlists[name].push(trackId);
    savePlaylists(playlists);
  }
  renderPlaylistList();
}

function deletePlaylist(name) {
  const playlists = getPlaylists();
  delete playlists[name];
  savePlaylists(playlists);

  if (document.body.classList.contains('playlist-view') &&
      document.body.dataset.activePlaylist === name) {
    showAllTracks();
  }
  renderPlaylistList();
}

// ========== SHOW / HIDE ==========
function showPlaylist(name) {
  const playlists = getPlaylists();
  const trackIds = playlists[name] || [];
  if (trackIds.length === 0) {
    alert('This playlist is empty.');
    return;
  }

  // Build sorted indices
  const sorted = [];
  row.forEach((r, i) => {
    const trackEl = r.querySelector('.Track');
    const id = trackEl ? trackEl.dataset.trackId : '';
    if (trackIds.includes(id)) {
      sorted.push(i);
      r.classList.remove('hidden-row');
    } else {
      r.classList.add('hidden-row');
    }
  });
  sorted.sort((a, b) => a - b);
  currentPlaylistIndicesSorted = [...sorted];

  playlistShuffleOn = false;
  currentPlaylistIndices = [...sorted];
  const currentIdx = (typeof trn !== 'undefined') ? trn : -1;
  const pos = currentPlaylistIndices.indexOf(currentIdx);
  currentPlaylistPos = (pos >= 0) ? pos : 0;

  const sb = document.getElementById('Shuffle');
  if (sb) sb.style.background = '#d7ffff';

  playlistRepeatOn = false;
  const rp = document.getElementById('Repeat');
  if (rp) rp.style.background = '#d7ffff';

  document.body.classList.add('playlist-view');
  document.body.dataset.activePlaylist = name;

  const showAllLink = document.getElementById('show-all-tracks-link');
  if (showAllLink) {
    showAllLink.style.display = 'inline';
    showAllLink.textContent = `Showing "${name}" — Show All`;
  }

  closeModal();
}

function showAllTracks() {
  row.forEach(r => r.classList.remove('hidden-row'));
  document.body.classList.remove('playlist-view');
  document.body.dataset.activePlaylist = '';
  currentPlaylistIndices = [];
  currentPlaylistIndicesSorted = [];
  currentPlaylistPos = 0;
  playlistShuffleOn = false;
  playlistRepeatOn = false;
  const rp = document.getElementById('Repeat');
  if (rp) rp.style.background = '#d7ffff';
  const sb = document.getElementById('Shuffle');
  if (sb) sb.style.background = '#d7ffff';
  const showAllLink = document.getElementById('show-all-tracks-link');
  if (showAllLink) showAllLink.style.display = 'none';
}

// ========== CREATE ==========
function createAndAddPlaylist() {
  const input = document.getElementById('new-playlist-name');
  const name = input.value.trim();
  if (!name) {
    input.placeholder = 'Please enter a name';
    input.classList.add('invalid');
    return;
  }
  const playlists = getPlaylists();
  if (playlists[name]) {
    alert('A playlist with that name already exists.');
    return;
  }
  const trackId = getCurrentTrackId();
  playlists[name] = trackId ? [trackId] : [];
  savePlaylists(playlists);
  input.value = '';
  input.classList.remove('invalid');
  renderPlaylistList();
}

function closeModal() {
  const modal = document.getElementById('playlist-modal');
  if (modal) modal.style.display = 'none';
  const addBtn = document.getElementById('add');
  if (addBtn) addBtn.style.background = '#d7ffff';
}

// ========== MODAL EVENTS ==========
function bindModalEvents() {
  const createBtn = document.getElementById('create-playlist-btn');
  const nameInput = document.getElementById('new-playlist-name');
  const showAllLink = document.getElementById('show-all-tracks-link');

  if (createBtn && !createBtn.dataset.bound) {
    createBtn.addEventListener('click', createAndAddPlaylist);
    createBtn.dataset.bound = '1';
  }
  if (nameInput && !nameInput.dataset.bound) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createAndAddPlaylist();
    });
    nameInput.dataset.bound = '1';
  }
  if (showAllLink) {
    showAllLink.addEventListener('click', (e) => {
      e.preventDefault();
      showAllTracks();
    });
  }
}

// ========== GLOBAL ADD BUTTON ==========
window.add = function() {
  const modal = document.getElementById('playlist-modal');
  if (!modal) return;
  const isOpen = modal.style.display === 'flex';
  modal.style.display = isOpen ? 'none' : 'flex';
  const addBtn = document.getElementById('add');
  if (addBtn) addBtn.style.background = isOpen ? '#d7ffff' : '#bfb';
  if (!isOpen) {
    document.getElementById('new-playlist-name').focus();
    renderPlaylistList();
    bindModalEvents();
  }
}; 

// ========== INIT ==========
setupPlaylistNavigation();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindModalEvents);
} else {
  bindModalEvents();
}
