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
        CONCURRENT_LOADS = 3,               // reduced for mobile
        MAX_BAR_HEIGHT_FRAC = 0.6,
        RESAMPLE_METHOD = 'mean',            // 'max', 'mean', or 'interpolate'
        CONTRAST_EXPONENT = 2;                // >1 sharpens distinctions

    /*-------STATE-------*/

    const 
        waveforms = [],
        waveformCache = new Map(),
        srcIndexMap = new Map(),
        loadQueue = [];

    let activeLoads = 0;

    /*-------WEB WORKER (offload resampling & drawing)-------*/

    let waveformWorker = null;
    if (window.Worker) {
        try {
            waveformWorker = new Worker('/js/list/waveform-worker.js'); // adjust path as needed
            waveformWorker.onmessage = handleWorkerMessage;
            waveformWorker.onerror = (err) => console.error('Waveform worker error:', err);
        } catch (e) {
            console.warn('Failed to create waveform worker, falling back to main thread.', e);
        }
    } else {
        console.warn('Web Workers not supported, falling back to main thread.');
    }

    // Handle messages from the worker
    function handleWorkerMessage(e) {
        const { index, grayBitmap, progressBitmap } = e.data;
        const w = waveforms[index];
        if (!w) return;

        // Store the received bitmaps
        if (grayBitmap) w.bitmapGray = grayBitmap;
        if (progressBitmap) w.bitmapProgress = progressBitmap;

        // Draw the gray waveform immediately
        if (w.bitmapGray) {
            w.ctx.clearRect(0, 0, w.canvas.width, w.canvas.height);
            w.ctx.drawImage(w.bitmapGray, 0, 0);
        }

        // If this track is currently playing, overlay progress
        if (pAudio.src === w.src && pAudio.duration) {
            updateProgressForWaveform(w);
        }
    }

    /*-------TIME DISPLAY (unchanged)-------*/

    function updateTimeDisplay() {
        if (!pAudio.duration || !isFinite(pAudio.duration)) return;
        if (window.eDuration && typeof formatTime === "function") {
            eDuration.textContent = formatTime(pAudio.duration);
        }
        if (window.sDuration && typeof formatTime === "function") {
            const remaining = pAudio.duration - pAudio.currentTime;
            sDuration.textContent = formatTime(remaining);
        }
    }

    /*-------INITIALIZATION-------*/

    function initWaveforms() {
        const rows = document.querySelectorAll('.row');

        for (let i = 0; i < rows.length; i++) {
            const trackAudio = rows[i].querySelector('.TrackAudio');
            const canvas = rows[i].querySelector('.track-waveform');
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
                waveformData: null,        // full-resolution peaks (Float32Array)
                bitmapGray: null,
                bitmapProgress: null,
                barCount: barCount
            });

            canvas.dataset.waveformIndex = i;
            srcIndexMap.set(trackAudio.src, i);
        }

        // No placeholder drawing – canvas remains transparent/white

        prepareLoadQueue();
        processLoadQueue();

        if (pAudio.readyState >= 1) {
            updateTimeDisplay();
        }
    }

    /*-------EVENT DELEGATION (unchanged)-------*/

    document.addEventListener('click', function(e) {
        const canvas = e.target.closest('.track-waveform');
        if (!canvas) return;
        handleSeek(e, canvas);
    });

    /*-------LOAD QUEUE (unchanged)-------*/

    function prepareLoadQueue() {
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

    /*-------JSON LOADING & WORKER OFFLOAD-------*/

    function getJsonUrlFromAudioSrc(src) {
        return src
            .replace('/mp3/', '/waveforms/')
            .replace(/\.mp3$/, '.json');
    }

    async function loadWaveformJson(src) {
        const jsonUrl = getJsonUrlFromAudioSrc(src);

        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();

            let peaks;
            if (json.peaks) {
                peaks = json.peaks;
            } else if (json.data) {
                peaks = json.data.map(v => Math.abs(v - 128) / 128);
            } else {
                console.warn('Unknown JSON format for', src);
                return;
            }

            const amplitudes = Float32Array.from(peaks);
            waveformCache.set(src, amplitudes);

            // Find all waveforms with this src and send them to the worker (if available)
            for (let i = 0; i < waveforms.length; i++) {
                const w = waveforms[i];
                if (w.src === src) {
                    w.waveformData = amplitudes; // store original data

                    // Update canvas size and bar count (in case layout changed since init)
                    const container = w.canvas.parentElement;
                    if (container) {
                        w.canvas.width = container.clientWidth;
                        w.canvas.height = container.clientHeight;
                    }
                    w.barCount = Math.max(1, Math.floor(w.canvas.width / (BAR_WIDTH + BAR_SPACING)));

                    if (waveformWorker) {
                        // Send job to worker
                        waveformWorker.postMessage({
                            srcArray: amplitudes,
                            dstLen: w.barCount,
                            method: RESAMPLE_METHOD,
                            width: w.canvas.width,
                            height: w.canvas.height,
                            barWidth: BAR_WIDTH,
                            barSpacing: BAR_SPACING,
                            contrastExp: CONTRAST_EXPONENT,
                            maxBarHeightFrac: MAX_BAR_HEIGHT_FRAC,
                            index: i
                        });
                        // Note: we do NOT transfer the buffer because we keep a reference in w.waveformData
                        // If you want to avoid copying, you could transfer, but then you'd lose the data in the cache.
                        // For simplicity, we let the browser copy.
                    } else {
                        // Fallback: process on main thread
                        await prerenderWaveformBitmapsFallback(w);
                        drawBitmapWaveform(w);
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to load waveform JSON:', jsonUrl, err);
        }
    }

    /*-------FALLBACK METHODS (if worker unavailable)-------*/

    async function prerenderWaveformBitmapsFallback(w) {
        // This is your original prerenderWaveformBitmaps function, slightly adapted
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

        // Find max amplitude after resampling
        let maxAmp = 0;
        for (let i = 0; i < amps.length; i++) {
            if (amps[i] > maxAmp) maxAmp = amps[i];
        }
        if (maxAmp === 0) maxAmp = 1;

        const exp = CONTRAST_EXPONENT;
        const maxAmpExp = Math.pow(maxAmp, exp);
        const scale = MAX_BAR_HEIGHT_FRAC / maxAmpExp;

        const N = w.barCount;
        let spacing = (N > 1) ? (width - N * BAR_WIDTH) / (N - 1) : 0;
        const totalStep = BAR_WIDTH + spacing;

        for (let i = 0; i < N; i++) {
            const val = amps[i];
            const transformed = Math.pow(val, exp);
            const barH = transformed * height * scale;
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

    function drawBitmapWaveform(w) {
        if (!w.bitmapGray) return;
        w.ctx.clearRect(0, 0, w.canvas.width, w.canvas.height);
        w.ctx.drawImage(w.bitmapGray, 0, 0);
    }

    // Resample function (used only in fallback mode)
    function resampleArray(src, dstLen, method) {
        const srcLen = src.length;
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
                return interpolateArray(src, dstLen);
            }
        }
        return dst;
    }

    function interpolateArray(src, dstLen) {
        const step = (src.length - 1) / (dstLen - 1);
        const dst = new Float32Array(dstLen);
        for (let i = 0; i < dstLen; i++) {
            const pos = i * step;
            const idx1 = Math.floor(pos);
            const idx2 = Math.min(idx1 + 1, src.length - 1);
            const frac = pos - idx1;
            dst[i] = src[idx1] * (1 - frac) + src[idx2] * frac;
        }
        return dst;
    }

    /*-------SEEK (unchanged)-------*/

    function handleSeek(e, canvas) {
        if (!pAudio.duration) return;
        const index = canvas.dataset.waveformIndex;
        if (index === undefined) return;
        const w = waveforms[index];
        if (w.src !== pAudio.src) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const seekPercent = Math.max(0, Math.min(1, clickX / canvas.width));
        pAudio.currentTime = seekPercent * pAudio.duration;
        updateProgress();  // immediate progress update
    }

    /*-------PROGRESS (unchanged, but split for reuse)-------*/

    function updateProgress() {
        if (!pAudio.duration) return;
        const index = srcIndexMap.get(pAudio.src);
        if (index === undefined) return;
        updateProgressForWaveform(waveforms[index]);
    }

    function updateProgressForWaveform(w) {
        if (!w.bitmapGray) return;
        const ctx = w.ctx;
        ctx.clearRect(0, 0, w.canvas.width, w.canvas.height);
        ctx.drawImage(w.bitmapGray, 0, 0);

        if (!w.bitmapProgress) return;
        const progress = pAudio.currentTime / pAudio.duration;
        const width = w.canvas.width * progress;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, w.canvas.height);
        ctx.clip();
        ctx.drawImage(w.bitmapProgress, 0, 0);
        ctx.restore();
    }

    /*-------PLAYBACK LOOP (unchanged)-------*/

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

    /*-------RESIZE (with worker support)-------*/

    let resizeTimeout;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            for (let i = 0; i < waveforms.length; i++) {
                const w = waveforms[i];
                const container = w.canvas.parentElement;
                if (!container) continue;

                const newWidth = container.clientWidth;
                const newHeight = container.clientHeight;

                // Only update if dimensions actually changed
                if (w.canvas.width !== newWidth || w.canvas.height !== newHeight) {
                    w.canvas.width = newWidth;
                    w.canvas.height = newHeight;
                    w.barCount = Math.max(1, Math.floor(newWidth / (BAR_WIDTH + BAR_SPACING)));

                    if (w.waveformData) {
                        if (waveformWorker) {
                            // Send new job to worker
                            waveformWorker.postMessage({
                                srcArray: w.waveformData,
                                dstLen: w.barCount,
                                method: RESAMPLE_METHOD,
                                width: newWidth,
                                height: newHeight,
                                barWidth: BAR_WIDTH,
                                barSpacing: BAR_SPACING,
                                contrastExp: CONTRAST_EXPONENT,
                                maxBarHeightFrac: MAX_BAR_HEIGHT_FRAC,
                                index: i
                            });
                        } else {
                            // Fallback: regenerate on main thread
                            await prerenderWaveformBitmapsFallback(w);
                            drawBitmapWaveform(w);
                            if (pAudio.src === w.src) updateProgressForWaveform(w);
                        }
                    }
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

    // Cleanup worker on page unload (optional)
    window.addEventListener('beforeunload', () => {
        if (waveformWorker) {
            waveformWorker.terminate();
        }
    });

})();
