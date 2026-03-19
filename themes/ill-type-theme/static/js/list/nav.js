const nav = document.querySelector('#tagcloud nav');
const checkbox = document.querySelector('#touch');
const menu = document.querySelector('.slide');

nav.addEventListener('click', (e) => {
	const link = e.target.closest('a');
	if (!link) return;

	e.preventDefault();
	const url = link.href;

	// Uncheck checkbox triggers closing animation
	checkbox.checked = false;

	menu.addEventListener('transitionend', function handler() {
		window.location.href = url;
		menu.removeEventListener('transitionend', handler);
	})
});
