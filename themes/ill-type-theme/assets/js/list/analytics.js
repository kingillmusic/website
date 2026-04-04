import { pAudio, go } from "./music.js";   // pAudio is the audio element

console.log('Analytics script loaded');

(function() {
    // Helper: generate a unique ID
    function generateId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Visitor & session IDs
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
        visitorId = generateId();
        localStorage.setItem('visitor_id', visitorId);
    }

    let sessionId = sessionStorage.getItem('session_id');
    let sessionStart = sessionStorage.getItem('session_start');
    if (!sessionId) {
        sessionId = generateId();
        sessionStorage.setItem('session_id', sessionId);
        sessionStart = Date.now();
        sessionStorage.setItem('session_start', sessionStart);
    }

    // Accumulated play time (seconds)
    let totalPlaySeconds = 0;
    let playStartTime = null;        // timestamp when current play started
    let isPlaying = false;

    // Function to add the elapsed time since last play start
    function addCurrentPlayTime() {
        if (playStartTime !== null) {
            const now = Date.now();
            const elapsed = (now - playStartTime) / 1000;
            totalPlaySeconds += elapsed;
            playStartTime = null;
        }
    }

    // Get current track title – use #GoToTrack directly
    function getCurrentTrackId() {
        const titleElement = document.getElementById('GoToTrack');
        if (titleElement) {
            return titleElement.textContent.trim();
        }
        if (go && go.innerHTML) {
            return go.innerHTML.trim();
        }
        console.warn('Analytics: Could not find track title element');
        return null;
    }

    // Send an event (page_view, track_play, session_end)
    function sendEvent(eventType, trackId = null, duration = null) {
        const data = {
            visitor_id: visitorId,
            session_id: sessionId,
            event_type: eventType,
            track_id: trackId,
            referrer: document.referrer || '',
            user_agent: navigator.userAgent
        };
        if (duration !== null) {
            data.duration_seconds = duration;
        }

        fetch('http://localhost:8080/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            keepalive: true
        }).catch(e => console.warn('Analytics error:', e));
    }

    // Send page view
    sendEvent('page_view');

    if (!pAudio) {
        console.error('Analytics: pAudio not available');
        return;
    }

    let lastTrackId = null;

    // ---- Audio play / pause / ended handlers ----
    pAudio.addEventListener('play', () => {
        const trackId = getCurrentTrackId();
		if (trackId && Math.abs(pAudio.currentTime) < 0.1) {
            // Send track play event (only once per track)
            sendEvent('track_play', trackId);
        }
        // Start timing playback
        if (!isPlaying) {
            playStartTime = Date.now();
            isPlaying = true;
        }
    });

    pAudio.addEventListener('pause', () => {
        if (isPlaying) {
            addCurrentPlayTime();
            isPlaying = false;
        }
    });

    pAudio.addEventListener('ended', () => {
        if (isPlaying) {
            addCurrentPlayTime();
            isPlaying = false;
        }
    });

    // Also handle when the user navigates away or closes the tab
    window.addEventListener('beforeunload', () => {
        // Stop any ongoing play timer
        if (isPlaying) {
            addCurrentPlayTime();
        }
        // Send session end with total play seconds
        sendEvent('session_end', null, Math.floor(totalPlaySeconds));
    });
})();
