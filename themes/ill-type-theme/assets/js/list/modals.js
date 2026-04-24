// Map footer button IDs to their related modal IDs (only for simple toggle buttons)
const buttonModalMap = {
  add: 'playlist-modal',
  share: 'CopiedMessage'
  // showLeasesBtn is intentionally omitted – it will close all lease modals
};

const allModalIds = ['playlist-modal', 'leasesModal', 'cartModal', 'checkoutModal', 'CopiedMessage'];

// Record which modals were open BEFORE any click handling
document.addEventListener('mousedown', function(e) {
  const btn = e.target.closest('.footerButtons');
  if (!btn) return;
  const state = {};
  allModalIds.forEach(id => {
    const el = document.getElementById(id);
    state[id] = el && el.style.display !== 'none';
  });
  window._modalOpenBeforeClick = state;
}, true);

// Close all modals EXCEPT the one explicitly mapped to the clicked button
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.footerButtons');
  if (!btn) return;

  const keepModalId = buttonModalMap[btn.id] || '';   // empty if not mapped (like showLeasesBtn)

  allModalIds.forEach(id => {
    if (id === keepModalId) return;
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Reset backgrounds for all buttons except the one just clicked
  const addBtn = document.getElementById('add');
  if (addBtn && btn.id !== 'add') addBtn.style.background = '#d7ffff';
  const showLeasesBtn = document.getElementById('showLeasesBtn');
  if (showLeasesBtn && btn.id !== 'showLeasesBtn') showLeasesBtn.style.backgroundColor = '#d7ffff';
  const shareBtn = document.getElementById('share');
  if (shareBtn && btn.id !== 'share') shareBtn.style.background = '#d7ffff';
}, true);