(function() {
    pAudio || console.error("Waveform: PlayerAudio not found");

    const BAR_WIDTH = 1;
    const BAR_SPACING = 3;
    const MAX_BAR_HEIGHT_FRAC = 0.7;
    const RESAMPLE_METHOD = 'mean';
    const CONTRAST_EXPONENT = 2;

    const waveforms = [];
    const srcIndexMap = new Map();
    let resizeObserver = null;
    let waveformWorker = null;

    if (window.Worker) {
        try {
            waveformWorker = new Worker('/js/list/waveform-worker.js');
            waveformWorker.onmessage = handleWorkerMessage;
            waveformWorker.onerror = (err) => console.error('Waveform worker error:', err);
        } catch (e) {
            console.error('Failed to create waveform worker.', e);
        }
    } else {
        console.error('Web Workers not supported.');
    }

    function getWaveformColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            gray: style.getPropertyValue('--waveform-gray').trim() || '#777777',
            progress: style.getPropertyValue('--waveform-progress').trim() || '#87ffff'
        };
    }

    function handleWorkerMessage(e) {
        const { index, grayBitmap, progressBitmap } = e.data;
        const w = waveforms[index];
        if (!w) return;

        w.bitmapGray = grayBitmap;
        w.bitmapProgress = progressBitmap;

        w.bgCtx.clearRect(0, 0, w.bgCanvas.width, w.bgCanvas.height);
        w.bgCtx.drawImage(grayBitmap, 0, 0);

        w.fgCtx.clearRect(0, 0, w.fgCanvas.width, w.fgCanvas.height);
        w.fgCtx.drawImage(progressBitmap, 0, 0);

        if (pAudio.src === w.src && pAudio.duration) {
            updateProgressForWaveform(w);
        }
    }

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

    function initWaveforms() {
        if (!waveformWorker) return;

        const rows = document.querySelectorAll('.row');
        for (let i = 0; i < rows.length; i++) {
            const trackAudio = rows[i].querySelector('.TrackAudio');
            const bgCanvas = rows[i].querySelector('.waveform-bg');
            const fgCanvas = rows[i].querySelector('.waveform-progress');
            if (!trackAudio || !bgCanvas || !fgCanvas) continue;

            const container = bgCanvas.parentElement;
            const width = container.clientWidth;
            const height = container.clientHeight;

            bgCanvas.width = width;
            bgCanvas.height = height;
            fgCanvas.width = width;
            fgCanvas.height = height;

            const barCount = Math.max(1, Math.floor(width / (BAR_WIDTH + BAR_SPACING)));
            waveforms[i] = {
                bgCanvas,
                bgCtx: bgCanvas.getContext('2d'),
                fgCanvas,
                fgCtx: fgCanvas.getContext('2d'),
                src: trackAudio.src,
                waveformData: null,
                bitmapGray: null,
                bitmapProgress: null,
                barCount
            };
            bgCanvas.dataset.waveformIndex = i;
            srcIndexMap.set(trackAudio.src, i);

            // Send initial message to worker
            const { gray, progress } = getWaveformColors();
            waveformWorker.postMessage({
                audioSrc: trackAudio.src,
                dstLen: barCount,
                method: RESAMPLE_METHOD,
                width, height,
                barWidth: BAR_WIDTH,
                barSpacing: BAR_SPACING,
                contrastExp: CONTRAST_EXPONENT,
                maxBarHeightFrac: MAX_BAR_HEIGHT_FRAC,
                index: i,
                grayColor: gray,
                progressColor: progress
            });
        }

        // ResizeObserver on containers
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(handleResizeEntries);
            waveforms.forEach(w => resizeObserver.observe(w.bgCanvas.parentElement));
        }

        // Timeupdate listener
        if (pAudio) {
            pAudio.addEventListener('timeupdate', () => {
                const index = srcIndexMap.get(pAudio.src);
                if (index !== undefined) {
                    updateProgressForWaveform(waveforms[index]);
                }
                updateTimeDisplay();
            });
        } else {
            console.warn('pAudio not available yet');
        }
    }

    function handleResizeEntries(entries) {
        requestAnimationFrame(() => {
            for (const entry of entries) {
                const container = entry.target;
                const bgCanvas = container.querySelector('.waveform-bg');
                if (!bgCanvas) continue;
                const index = bgCanvas.dataset.waveformIndex;
                const w = waveforms[index];
                if (!w) continue;

                const { width, height } = entry.contentRect;
                if (w.bgCanvas.width !== width || w.bgCanvas.height !== height) {
                    w.bgCanvas.width = w.fgCanvas.width = width;
                    w.bgCanvas.height = w.fgCanvas.height = height;

                    w.barCount = Math.max(1, Math.floor(width / (BAR_WIDTH + BAR_SPACING)));

                    if (waveformWorker) {
                        const { gray, progress } = getWaveformColors();
                        waveformWorker.postMessage({
                            audioSrc: w.src,
                            dstLen: w.barCount,
                            method: RESAMPLE_METHOD,
                            width, height,
                            barWidth: BAR_WIDTH,
                            barSpacing: BAR_SPACING,
                            contrastExp: CONTRAST_EXPONENT,
                            maxBarHeightFrac: MAX_BAR_HEIGHT_FRAC,
                            index,
                            grayColor: gray,
                            progressColor: progress
                        });
                    }
                }
            }
        });
    }

    document.addEventListener('click', function(e) {
        const bgCanvas = e.target.closest('.waveform-bg');
        if (!bgCanvas) return;
        handleSeek(e, bgCanvas);
    });

    function handleSeek(e, bgCanvas) {
        if (!pAudio.duration) return;
        const index = bgCanvas.dataset.waveformIndex;
        if (index === undefined) return;
        const w = waveforms[index];
        if (w.src !== pAudio.src) return;
        const rect = bgCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const seekPercent = Math.max(0, Math.min(1, clickX / bgCanvas.width));
        pAudio.currentTime = seekPercent * pAudio.duration;
        updateProgressForWaveform(w);
    }

    function updateProgressForWaveform(w) {
        if (!w.fgCanvas) return;
        const progress = pAudio.currentTime / pAudio.duration;
        const clipPercent = (1 - progress) * 100;
        w.fgCanvas.style.clipPath = `inset(0 ${clipPercent}% 0 0)`;
    }

    window.addEventListener("beforeunload", () => {
        waveformWorker && waveformWorker.terminate();
        resizeObserver && resizeObserver.disconnect();
    });

    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", initWaveforms);
    } else {
        initWaveforms();
    }
})();