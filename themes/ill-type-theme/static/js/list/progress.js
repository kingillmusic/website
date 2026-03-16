const
    sDuration = document.getElementById("StartDuration"),
    eDuration = document.getElementById("EndDuration");

// Function to format seconds into mm:ss
function formatTime(seconds) {
    let mins = 0 | (seconds / 60);
    let secs = 0 | (seconds % 60);
    return mins + ':' + (secs < 10 ? '0' + secs : secs);
}

// When metadata is loaded, display the total duration in sd
if (pAudio.readyState >= 1) {
    sDuration.textContent = formatTime(pAudio.duration);
	} else {
		pAudio.addEventListener('loadedmetadata', () => {
		sDuration.textContent = formatTime(pAudio.duration);
	});
}

// Countdown during playback
pAudio.ontimeupdate = () => {
    let remaining = pAudio.duration - pAudio.currentTime;
    sDuration.textContent = formatTime(remaining);
};
