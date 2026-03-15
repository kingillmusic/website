let outsideClickHandler = null;
let escapeHandler = null;

dcm = () => {
    const cm = document.querySelector("#CopiedMessage");

    // Copy link to clipboard
    if (typeof go === 'undefined' || !go.innerText) {
        console.error('go element not found or empty');
        return;
    }
    const link = 'https://kingillmusic.com/' + go.innerText;
    navigator.clipboard.writeText(link).catch(err => console.error('Copy failed:', err));

    // Show the popup
    cm.style.display = "block";
    console.log('Popup shown'); // for debugging

    // Remove any previously attached handlers (cleanup from previous popup)
    if (outsideClickHandler) {
        document.removeEventListener('click', outsideClickHandler);
        outsideClickHandler = null;
    }
    if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
        escapeHandler = null;
    }

    // Define the outside\xe2\x80\x91click handler
    outsideClickHandler = (event) => {
        // If click is outside the popup, close it
        if (!cm.contains(event.target)) {
            closePopup(cm);
        }
    };

    // Define the Escape key handler
    escapeHandler = (event) => {
        if (event.key === 'Escape') {
            closePopup(cm);
        }
    };

    // Delay attaching listeners to avoid catching the opening click
    setTimeout(() => {
        document.addEventListener('click', outsideClickHandler);
        document.addEventListener('keydown', escapeHandler);
    }, 10); // 10ms delay

    // Helper function to close the popup and remove listeners
    function closePopup(popupElement) {
        popupElement.style.display = "none";
        console.log('Popup closed'); // for debugging
        // Remove both listeners
        document.removeEventListener('click', outsideClickHandler);
        document.removeEventListener('keydown', escapeHandler);
        outsideClickHandler = null;
		escapeHandler = null;
	}
};

