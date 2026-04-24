// Map footer button IDs to their related modal IDs
const buttonModalMap = {
  add: 'playlist-modal',
  share: 'CopiedMessage',
  showLeasesBtn: 'leasesModal'
};

// All known modal IDs
const allModalIds = ['playlist-modal', 'leasesModal', 'cartModal', 'checkoutModal', 'CopiedMessage'];

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.footerButtons');
  if (!btn) return;

  // Which modal does this button control?
  const keepModalId = buttonModalMap[btn.id] || '';

  // Close every modal except the one belonging to this button
  allModalIds.forEach(id => {
    if (id === keepModalId) return;
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Reset background for buttons that aren't the one just clicked
  const addBtn = document.getElementById('add');
  if (addBtn && btn.id !== 'add') addBtn.style.background = '#d7ffff';
  const showLeasesBtn = document.getElementById('showLeasesBtn');
  if (showLeasesBtn && btn.id !== 'showLeasesBtn') showLeasesBtn.style.backgroundColor = '#d7ffff';
}, true);
