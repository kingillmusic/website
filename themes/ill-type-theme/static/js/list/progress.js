const
    sd = document.querySelector("#StartDuration"),
    ed = document.querySelector("#EndDuration");

// Function to format seconds into mm:ss
function formatTime(seconds) {
    let mins = 0 | (seconds / 60);
    let secs = 0 | (seconds % 60);
    return mins + ':' + (secs < 10 ? '0' + secs : secs);
}

// When metadata is loaded, display the total duration in sd
if (po.readyState >= 1) {
    sd.textContent = formatTime(po.duration);
	} else {
		po.addEventListener('loadedmetadata', () => {
		sd.textContent = formatTime(po.duration);
	});
}

// Countdown during playback
po.ontimeupdate = () => {
    let remaining = po.duration - po.currentTime;
    sd.textContent = formatTime(remaining);
};
