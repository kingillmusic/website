(function() {
    // pAudio (#PlayerAudio) is defined in music.js
	pAudio || console.error("Waveform: PlayerAudio not found");

    /*-------CONFIG-------*/
    const 
        BAR_WIDTH = 1,
        BAR_SPACING = 3,
        CONCURRENT_LOADS = 3,               // reduced for mobile
        MAX_BAR_HEIGHT_FRAC = 0.7,
        RESAMPLE_METHOD = 'mean',            // 'max', 'mean', or 'interpolate'
        CONTRAST_EXPONENT = 2;                // >1 sharpens distinctions

    /*-------STATE-------*/
    const waveforms = [], waveformCache = new Map(), srcIndexMap = new Map(), loadQueue = [];
    let activeLoads = 0;
    let resizeObserver = null;
   
    /*-------WEB WORKER (offload resampling & drawing)-------*/
    let waveformWorker = null;
    if (window.Worker) {
        try {
            waveformWorker = new Worker('/js/list/waveform-worker.js'); // adjust path as needed
            waveformWorker.onmessage = handleWorkerMessage;
            waveformWorker.onerror = (err) => console.error('Waveform worker error:', err);
        } catch (e) {
            console.error('Failed to create waveform worker.', e);
        }
    } else {
        console.error('Web Workers not supported.');
    }

	// Handle messages from the worker
	function handleWorkerMessage(e) {
        const { index, grayBitmap, progressBitmap } = e.data;
		const w = waveforms[index];
		w && (grayBitmap && (w.bitmapGray = grayBitmap),
		progressBitmap && (w.bitmapProgress = progressBitmap),
		w.bitmapGray && (w.ctx.clearRect(0, 0, w.canvas.width, w.canvas.height),
		w.ctx.drawImage (w.bitmapGray, 0, 0)),
		pAudio.src === w.src && pAudio.duration && updateProgressForWaveform(w))
	}

	/*-------TIME DISPLAY-------*/
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
        // If worker isn't available, skip waveform rendering entirely
        if (!waveformWorker) return;

		const rows = document.querySelectorAll('.row');
		const tempWaveforms = []; // temporary array to hold objects before pushing

		// First pass: collect data without writing to canvas
		for (let i = 0; i < rows.length; i++) {
			const trackAudio = rows[i].querySelector('.TrackAudio');
			const canvas = rows[i].querySelector('.track-waveform');
			if (!trackAudio || !canvas) continue;

			const container = canvas.parentElement;
			// Store container and needed info for later
			tempWaveforms.push({ canvas, container, trackAudio, index: i });
		}

		// Batch read container dimensions
		const dimensions = tempWaveforms.map(item => ({
			canvas: item.canvas,
			container: item.container,
			width: item.container ? item.container.clientWidth : 0,
			height: item.container ? item.container.clientHeight : 0,
			trackAudio: item.trackAudio,
			index: item.index
		}));

		// Batch write canvas sizes and populate waveforms array
		for (let d of dimensions) {
			const canvas = d.canvas;
			if (d.container) {
				canvas.width = d.width;
				canvas.height = d.height;
			}

			const barCount = Math.max(1, Math.floor(canvas.width / (BAR_WIDTH + BAR_SPACING)));
			waveforms[d.index] = {
				canvas: canvas,
				ctx: canvas.getContext('2d'),
				src: d.trackAudio.src,
				waveformData: null,
				bitmapGray: null,
				bitmapProgress: null,
				barCount: barCount
			};
			canvas.dataset.waveformIndex = d.index;
			srcIndexMap.set(d.trackAudio.src, d.index);
		}

		// Set up ResizeObserver
		if (window.ResizeObserver) {
			resizeObserver = new ResizeObserver(handleResizeEntries);
			waveforms.forEach(w => resizeObserver.observe(w.canvas));
		} else {
			console.warn('ResizeObserver not supported, falling back to window.resize');
			window.addEventListener('resize', handleWindowResize);
		}
		prepareLoadQueue();
		processLoadQueue();

		if (pAudio.readyState >= 1) {
			updateTimeDisplay();
		}
	}

    /*-------RESIZE HANDLING (ResizeObserver callback)-------*/
    function handleResizeEntries(entries) {
        // Use requestAnimationFrame to coalesce multiple entries in one frame
        requestAnimationFrame(() => {
            for (let entry of entries) {
                const canvas = entry.target;
                const index = canvas.dataset.waveformIndex;
                if (index === undefined) continue;
                const w = waveforms[index];
                if (!w) continue;

                const { width, height } = entry.contentRect;
                // Only update if dimensions actually changed (avoid infinite loops)
                if (w.canvas.width !== width || w.canvas.height !== height) {
                    w.canvas.width = width;
                    w.canvas.height = height;
                    w.barCount = Math.max(1, Math.floor(width / (BAR_WIDTH + BAR_SPACING)));

                    // Regenerate waveform with new dimensions – only if worker exists
                    if (w.waveformData && waveformWorker) {
                        waveformWorker.postMessage({
                            srcArray: w.waveformData,
                            dstLen: w.barCount,
                            method: RESAMPLE_METHOD,
                            width: width,
                            height: height,
                            barWidth: BAR_WIDTH,
                            barSpacing: BAR_SPACING,
                            contrastExp: CONTRAST_EXPONENT,
                            maxBarHeightFrac: MAX_BAR_HEIGHT_FRAC,
                            index: index
                        });
                    }
                }
            }
        });
    }

    /*-------EVENT DELEGATION-------*/
    document.addEventListener('click', function(e) {
        const canvas = e.target.closest('.track-waveform');
        if (!canvas) return;
        handleSeek(e, canvas);
    });

    /*-------LOAD QUEUE-------*/
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

    /*-------JSON LOADING & WORKER OFFLOAD (with automatic gzip decompression)-------*/
    function getJsonUrlFromAudioSrc(src) {	
        return src 
		.replace('/mp3/', '/waveforms/') 	// replace /mp3/ with /waveforms/
		.replace(/\.(mp3|ogg)$/, '.json.gz');	// and .mp3/.ogg with .json
	}

    async function loadWaveformJson(src) {
        const jsonUrl = getJsonUrlFromAudioSrc(src);

        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            let jsonText;

            // Check for gzip magic number (first two bytes: 0x1F 0x8B)
            const isGzipped = arrayBuffer.byteLength >= 2 &&
                new Uint8Array(arrayBuffer, 0, 2)[0] === 0x1F &&
                new Uint8Array(arrayBuffer, 0, 2)[1] === 0x8B;

            if (isGzipped) {
                // Decompress using native browser API
                if (!('DecompressionStream' in window)) {
                    throw new Error('DecompressionStream not supported. Please use a modern browser.');
                }
                const stream = new Response(arrayBuffer).body
                    .pipeThrough(new DecompressionStream('gzip'));
                const decompressedBuffer = await new Response(stream).arrayBuffer();
                jsonText = new TextDecoder('utf-8').decode(decompressedBuffer);
            }

            const json = JSON.parse(jsonText);

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

                    // Only send to worker if it exists
                    if (waveformWorker) {
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
                    }
                }
            }
        } catch (err) {
            console.warn('Failed to load waveform JSON:', jsonUrl, err);
        }
    }

    /*-------SEEK-------*/
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

    /*-------PROGRESS-------*/
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

    /*-------PLAYBACK LOOP-------*/
    let rafPlaying = false;
    function playbackLoop() {
        if (!rafPlaying) return;
        updateTimeDisplay();
        updateProgress();
        requestAnimationFrame(playbackLoop);
    }
    pAudio.addEventListener('play', () => { rafPlaying = true; playbackLoop(); });
    pAudio.addEventListener('pause', () => { rafPlaying = false; });
    pAudio.addEventListener('ended', () => { rafPlaying = false; });

    /*-------CLEANUP (optional)-------*/
	window.addEventListener("beforeunload", () => {
		waveformWorker && waveformWorker.terminate(), resizeObserver && resizeObserver.disconnect() 
	});

    /*-------START-------*/
	"loading" === document.readyState ?
	document.addEventListener("DOMContentLoaded", initWaveforms) : initWaveforms();
})();
