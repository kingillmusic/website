(function() {

    // pAudio (#PlayerAudio) is defined in music.js
    if (!pAudio) {
        console.error('Waveform: PlayerAudio not found');
        return;
    }

    /*-------CONFIG-------*/

    const 
        BAR_WIDTH = 2,
        BAR_SPACING = 3,
        CONCURRENT_LOADS = 10,          // max parallel JSON fetches
        MAX_BAR_HEIGHT_FRAC = 0.6,
        RESAMPLE_METHOD = 'mean',        // 'max', 'mean', or 'interpolate'
        CONTRAST_EXPONENT = 2;         // >1 sharpens distinctions, 1 = linear, <1 softens

    /*-------STATE-------*/

    const 
        waveforms = [],
        waveformCache = new Map(),
        srcIndexMap = new Map(),
        loadQueue = [];                 // queue of audio src URLs to load JSON for

    let activeLoads = 0;

    /*-------TIME DISPLAY-------*/

    // sDuration & eDuration (#StartDuration & #EndDuration) are defined in progress.js
    function updateTimeDisplay() {

        if (!pAudio.duration || !isFinite(pAudio.duration)) return;

        if (eDuration && typeof formatTime === "function") {
            eDuration.textContent = formatTime(pAudio.duration);
        }

        if (sDuration && typeof formatTime === "function") {
            const remaining = pAudio.duration - pAudio.currentTime;
            sDuration.textContent = formatTime(remaining);
        }
    }

    /*-------INITIALIZATION-------*/

    function initWaveforms() {

        const rows = document.querySelectorAll('.row');

        for (let i = 0; i < rows.length; i++) {

            const
                trackAudio = rows[i].querySelector('.TrackAudio'),
                canvas = rows[i].querySelector('.track-waveform');

            if (!trackAudio || !canvas) continue;

            const container = canvas.parentElement;

            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }

            const barCount = Math.max(1, Math.floor(canvas.width / (BAR_WIDTH + BAR_SPACING)));

            waveforms.push({
                canvas: canvas,
                ctx: canvas.getContext('2d'),
                src: trackAudio.src,
                waveformData: null,
                bitmapGray: null,
                bitmapProgress: null,
                barCount: barCount
            });

            canvas.dataset.waveformIndex = i;
            srcIndexMap.set(trackAudio.src, i);
        }

        drawPlaceholders();
        prepareLoadQueue();
        processLoadQueue();

        if (pAudio.readyState >= 1) {
            updateTimeDisplay();
        }
    }

    /*-------EVENT DELEGATION-------*/

    document.addEventListener('click', function(e) {
        const canvas = e.target.closest('.track-waveform');
        if (!canvas) return;
        handleSeek(e, canvas);
    });

    /*-------PLACEHOLDER WAVEFORMS-------*/

    function drawPlaceholders() {
        for (let w of waveforms) {
            const ctx = w.ctx;
            const canvas = w.canvas;
            const N = w.barCount;                     // number of bars
            const seed = w.src.length;

            // Compute dynamic spacing to fill the canvas width
            let spacing;
            if (N > 1) {
                spacing = (canvas.width - N * BAR_WIDTH) / (N - 1);
            } else {
                spacing = 0;
            }
            const totalStep = BAR_WIDTH + spacing;    // distance from start of one bar to next

            for (let i = 0; i < N; i++) {
                const value = (Math.sin(i * 0.1 + seed) * 0.5 + 0.5) * 0.5 + 0.3;
                const h = value * canvas.height * 0.8;
                // Calculate x position – center if only one bar
                const x = (N > 1) ? i * totalStep : (canvas.width - BAR_WIDTH) / 2;
                const y = (canvas.height - h) / 2;

                ctx.fillStyle = '#bbbbbb';
                ctx.fillRect(x, y, BAR_WIDTH, h);
            }
        }
    }

    /*-------LOAD QUEUE-------*/

    function prepareLoadQueue() {
        // Get unique audio src URLs
        const srcs = [...new Set(waveforms.map(w => w.src))];
        for (let src of srcs) {
            loadQueue.push(src);
        }
    }

    function processLoadQueue() {
        while (activeLoads < CONCURRENT_LOADS && loadQueue.length) {
            const src = loadQueue.shift();
            activeLoads++;
            loadWaveformJson(src).finally(() => {
                activeLoads--;
                processLoadQueue();
            });
        }
    }

    /*-------JSON LOADING-------*/

    /*
     * Convert an audio source URL to the corresponding waveform JSON URL.
     * Assumes:
     *   MP3 path: /mp3/songname/songname.mp3
     *   JSON path: /waveforms/songname/songname.json
     */
    function getJsonUrlFromAudioSrc(src) {
        return src
            .replace('/mp3/', '/waveforms/')
            .replace(/\.mp3$/, '.json');
    }

    async function loadWaveformJson(src) {
        const jsonUrl = getJsonUrlFromAudioSrc(src);

        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const json = await response.json();

            // Extract amplitude peaks (0..1)
            let peaks;
            if (json.peaks) {
                // Custom format with 'peaks' array (0..1)
                peaks = json.peaks;
            } else if (json.data) {
                peaks = json.data.map(v => Math.abs(v - 128) / 128);
            } else {
                console.warn('Unknown JSON format for', src);
                return;
            }

            // Store as Float32Array for consistency
            const amplitudes = Float32Array.from(peaks);
            waveformCache.set(src, amplitudes);

            // Update all waveforms that share this src
            for (let w of waveforms) {
                if (w.src === src) {
                    w.waveformData = amplitudes;
                    await prerenderWaveformBitmaps(w);
                    drawBitmapWaveform(w);
                }
            }
        } catch (err) {
            console.warn('Failed to load waveform JSON:', jsonUrl, err);
        }
    }

    /*-------RESAMPLE (max, mean, or interpolate)-------*/

    /**
     * Resample an array to a new length using the specified method.
     * @param {Float32Array} src - Source amplitudes
     * @param {number} dstLen - Target length
     * @param {string} method - 'max', 'mean', or 'interpolate'
     * @returns {Float32Array}
     */
    function resampleArray(src, dstLen, method) {
        const srcLen = src.length;

        // If source is shorter than target, we cannot do segment aggregation
        if (srcLen <= dstLen || method === 'interpolate') {
            return interpolateArray(src, dstLen);
        }

        const dst = new Float32Array(dstLen);
        const segmentSize = srcLen / dstLen;

        for (let i = 0; i < dstLen; i++) {
            const start = Math.floor(i * segmentSize);
            const end = Math.floor((i + 1) * segmentSize);

            if (method === 'max') {
                let maxVal = -Infinity;
                for (let j = start; j < end; j++) {
                    if (src[j] > maxVal) maxVal = src[j];
                }
                dst[i] = maxVal;
            } else if (method === 'mean') {
                let sum = 0;
                for (let j = start; j < end; j++) {
                    sum += src[j];
                }
                dst[i] = sum / (end - start);
            } else {
                // fallback to interpolation for unknown method
                return interpolateArray(src, dstLen);
            }
        }
        return dst;
    }

    /*-------OFFSCREEN BITMAP RENDER (with contrast)-------*/

    async function prerenderWaveformBitmaps(w) {
        const width = w.canvas.width;
        const height = w.canvas.height;
        const offGray = new OffscreenCanvas(width, height);
        const offProgress = new OffscreenCanvas(width, height);
        const gctx = offGray.getContext('2d');
        const pctx = offProgress.getContext('2d');

        let amps = w.waveformData;
        if (w.barCount !== amps.length) {
            amps = resampleArray(amps, w.barCount, RESAMPLE_METHOD);
        }

        // Find the maximum amplitude in this waveform (after resampling)
        let maxAmp = 0;
        for (let i = 0; i < amps.length; i++) {
            if (amps[i] > maxAmp) maxAmp = amps[i];
        }
        // Avoid division by zero if the track is completely silent
        if (maxAmp === 0) maxAmp = 1;

        // Apply contrast exponent to make variations sharper
        const exp = CONTRAST_EXPONENT;
        const maxAmpExp = Math.pow(maxAmp, exp);
        const scale = MAX_BAR_HEIGHT_FRAC / maxAmpExp;   // barH = val^exp * height * scale

        const N = w.barCount;
        // Compute dynamic spacing to fill the canvas width
        let spacing;
        if (N > 1) {
            spacing = (width - N * BAR_WIDTH) / (N - 1);
        } else {
            spacing = 0;
        }
        const totalStep = BAR_WIDTH + spacing;

        for (let i = 0; i < N; i++) {
            const val = amps[i];
            const transformed = Math.pow(val, exp);
            const barH = transformed * height * scale;   // normalized height after contrast
            const x = (N > 1) ? i * totalStep : (width - BAR_WIDTH) / 2;
            const y = (height - barH) / 2;

            gctx.fillStyle = '#aaaaaa';
            gctx.fillRect(x, y, BAR_WIDTH, barH);

            pctx.fillStyle = '#87ffff';
            pctx.fillRect(x, y, BAR_WIDTH, barH);
        }

        w.bitmapGray = await createImageBitmap(offGray);
        w.bitmapProgress = await createImageBitmap(offProgress);
    }

    /*-------DRAW BITMAP-------*/

    function drawBitmapWaveform(w) {
        if (!w.bitmapGray) return;
        w.ctx.clearRect(0, 0, w.canvas.width, w.canvas.height);
        w.ctx.drawImage(w.bitmapGray, 0, 0);
    }

    /*-------INTERPOLATION (kept for fallback)-------*/

    function interpolateArray(src, dstLen) {
        const 
            step = (src.length - 1) / (dstLen - 1),
            dst = new Float32Array(dstLen);

        for (let i = 0; i < dstLen; i++) {
            const
                pos = i * step,
                idx1 = Math.floor(pos),
                idx2 = Math.min(idx1 + 1, src.length - 1),
                frac = pos - idx1;

            dst[i] = src[idx1] * (1 - frac) + src[idx2] * frac;
        }
        return dst;
    }

    /*-------SEEK-------*/

    function handleSeek(e, canvas) {
        if (!pAudio.duration) return;

        const index = canvas.dataset.waveformIndex;
        if (index === undefined) return;

        const w = waveforms[index];

        // Only allow seeking if this is the currently playing track
        if (w.src !== pAudio.src) return;

        const 
            rect = canvas.getBoundingClientRect(),
            clickX = e.clientX - rect.left,
            seekPercent = Math.max(0, Math.min(1, clickX / canvas.width));

        pAudio.currentTime = seekPercent * pAudio.duration;
        updateProgress();  // immediately update waveform progress
    }

    /*-------PROGRESS-------*/

    function updateProgress() {
        if (!pAudio.duration) return;

        const index = srcIndexMap.get(pAudio.src);
        if (index === undefined) return;

        const w = waveforms[index];
        if (!w.bitmapGray) return;

        const ctx = w.ctx;
        ctx.clearRect(0, 0, w.canvas.width, w.canvas.height);
        ctx.drawImage(w.bitmapGray, 0, 0);

        if (!w.bitmapProgress) return;

        const 
            progress = pAudio.currentTime / pAudio.duration,
            width = w.canvas.width * progress;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, w.canvas.height);
        ctx.clip();
        ctx.drawImage(w.bitmapProgress, 0, 0);
        ctx.restore();
    }

    /*-------PLAYBACK LOOP-------*/

    let rafPlaying = false;

    function playbackLoop() {
        if (!rafPlaying) return;
        updateTimeDisplay();
        updateProgress();
        requestAnimationFrame(playbackLoop);
    }

    pAudio.addEventListener('play', () => {
        rafPlaying = true;
        playbackLoop();
    });

    pAudio.addEventListener('pause', () => {
        rafPlaying = false;
    });

    pAudio.addEventListener('ended', () => {
        rafPlaying = false;
    });

    /*-------RESIZE-------*/

    let resizeTimeout;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(async () => {
            for (let w of waveforms) {
                const container = w.canvas.parentElement;
                if (!container) continue;

                w.canvas.width = container.clientWidth;
                w.canvas.height = container.clientHeight;
                w.barCount = Math.max(1, Math.floor(w.canvas.width / (BAR_WIDTH + BAR_SPACING)));

                if (w.waveformData) {
                    await prerenderWaveformBitmaps(w);
                    drawBitmapWaveform(w);
                    updateProgress();   // if playing, overlay progress again
                }
            }
        }, 120);
    });

    /*-------START-------*/

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWaveforms);
    } else {
        initWaveforms();
    }

})();
