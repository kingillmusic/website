/*
const
    sd = document.querySelector("#StartDuration"),
    ed = document.querySelector("#EndDuration");

let minute, second;

po.ontimeupdate = t => { let { duration: d, currentTime: c } = t.srcElement,
        ts = 0|d%60, tm = 0|d/60, // ts = totalSeconds & tm = totalMinutes
        cs = 0|c%60, cm = 0|c/60; // cs = currentSeconds & cm = currentMinutes
    	td = ts < 10 ? `${tm}:0${ts}`:`${tm}:${ts}`, // td = totalDuration
    	cd = cs < 10 ? `${cm}:0${cs}`:`${cm}:${cs}`, // cd = currentDuration
        sd.textContent = cd, ed.textContent = td 
};
*/

/*
const
    sd = document.querySelector("#StartDuration"),
    ed = document.querySelector("#EndDuration");

po.ontimeupdate = t => { 
    let { duration: d, currentTime: c } = t.srcElement;
    
    // Calculate remaining time
    let remaining = d - c;
    
    // Extract minutes and seconds (using same bitwise floor technique)
    let minutes = 0 | (remaining / 60);
    let seconds = 0 | (remaining % 60);
    
    // Format with leading zero for seconds
    let countdown = minutes + ':' + (seconds < 10 ? '0' + seconds : seconds);
    
    // Update the start duration element with the countdown
    sd.textContent = countdown;
    
    // Optionally clear the end duration element or hide it
    ed.textContent = '';   // or set it to the same value if you prefer
};
*/

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

/*po.addEventListener('loadedmetadata', () => {
    let total = po.duration;
    sd.textContent = formatTime(total);
    // Optional: clear ed or hide it with CSS
    ed.textContent = '';
});
*/

// Countdown during playback
po.ontimeupdate = () => {
    let remaining = po.duration - po.currentTime;
    sd.textContent = formatTime(remaining);
};
