(function() {

	// pAudio (#PlayerAudio) is defined in music.js
	if (!pAudio) {
		console.error('Waveform: PlayerAudio not found');
		return;
	}

/*-------CONFIG-------*/

	const 
		TARGET_POINTS = 2000,
		BAR_WIDTH = 2,
		BAR_SPACING = 2,
		CONCURRENT_DECODES = 3;

/*-------STATE-------*/

	const 
		waveforms = [],
		waveformCache = new Map(),
		srcIndexMap = new Map(),
		decodeQueue = [];

	let activeDecodes = 0;
	let rafPlaying = false;

/*-------AUDIO CONTEXT-------*/

	let audioContext = null;

	function getAudioContext() {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
    	}
    	return audioContext;
	}

	function closeAudioContext() {

	    if (audioContext && audioContext.state !== 'closed'){
			audioContext.close().catch(() => {});
			audioContext = null;
    	}
	}

/*-------TIME DISPLAY-------*/

	// sDuration & eDuration (#StartDuration & #EndDuration) is defined in progress.js
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

	        waveforms.push ({
				canvas:canvas,
				ctx:canvas.getContext('2d'),
				src:trackAudio.src,
				waveformData:null,
				bitmapGray:null,
				bitmapProgress:null,
				barCount:barCount
        	});

	        canvas.dataset.waveformIndex = i;

	        srcIndexMap.set(trackAudio.src,i);

	    }

	    drawPlaceholders();

		prepareDecodeQueue();
		processDecodeQueue();

	    if (pAudio.readyState >= 1) {
        	updateTimeDisplay();
    	}
	}

/*-------EVENT DELEGATION-------*/

	document.addEventListener('click',function(e) {
		const canvas = e.target.closest('.track-waveform');
    	if(!canvas) return;
    	handleSeek(e,canvas);
	});

/*-------PLACEHOLDER WAVEFORMS-------*/

	function drawPlaceholders() {
		for (let w of waveforms) {

        const 
			ctx = w.ctx,
			canvas = w.canvas,
			total = BAR_WIDTH + BAR_SPACING,
			seed = w.src.length;

			for (let i = 0; i < w.barCount; i++) {
   	        	const 
					value = (Math.sin(i * 0.1 + seed) * 0.5 + 0.5) * 0.5 + 0.3,
					h = value * canvas.height * 0.8,
   	        		x = i * total,
   	        		y = (canvas.height - h) / 2;

				ctx.fillStyle = '#bbbbbb';
				ctx.fillRect(x,y,BAR_WIDTH,h);
			}
    	}
	}

/*-------DECODE QUEUE-------*/

	function prepareDecodeQueue() {

	    const srcs = [...new Set(waveforms.map(w => w.src))];

	    for(let i = 0; i < srcs.length; i++) {
			decodeQueue.push(srcs[i]);
    	}
	}

	function processDecodeQueue() {
		while(activeDecodes<CONCURRENT_DECODES && decodeQueue.length){
	        const src = decodeQueue.shift();
	        activeDecodes++;
	        decodeWaveform(src).finally(() => {
				activeDecodes--;
            	processDecodeQueue();
				if (activeDecodes === 0 && decodeQueue.length === 0) {
					closeAudioContext();
				}
        	});
    	}
	}

/*-------WAVEFORM DECODING-------*/

	async function decodeWaveform(src) {

		const context = getAudioContext();

		try {
			const 
				response = await fetch(src),
				buffer = await response.arrayBuffer(),
				audioBuffer = await context.decodeAudioData(buffer),
				channels = audioBuffer.numberOfChannels,
				length = audioBuffer.length,
				blockSize = Math.floor(length / TARGET_POINTS),
				amplitudes = new Float32Array(TARGET_POINTS);

			for (let ch = 0; ch < channels; ch++) {

				const data = audioBuffer.getChannelData(ch);

				for (let i = 0; i < TARGET_POINTS; i++) {

					const 
						start = i*blockSize,
						end = Math.min(start + blockSize,length);

					let max = 0;
	
					for (let j = start; j < end; j++) {
						const abs = Math.abs(data[j]);
						if (abs > max) max = abs;
					}
				amplitudes[i] += max;
				}
			}
			for (let i = 0; i < TARGET_POINTS; i++) {
				amplitudes[i] /= channels;
			}

			waveformCache.set(src,amplitudes);

			for(let w of waveforms) {
				if(w.src === src){
					w.waveformData = amplitudes;
					await prerenderWaveformBitmaps(w);
					drawBitmapWaveform(w);
				}
			}

		} catch(e) {
			console.warn('Waveform decode failed:',src,e);
		}
	}

/*-------OFFSCREEN BITMAP RENDER-------*/

	async function prerenderWaveformBitmaps(w){

		const 
			width = w.canvas.width,
			height = w.canvas.height,
			offGray = new OffscreenCanvas(width,height),
			offProgress = new OffscreenCanvas(width,height),
			gctx = offGray.getContext('2d'),
			pctx = offProgress.getContext('2d'),
			total = BAR_WIDTH + BAR_SPACING;

		let	amps = w.waveformData;
		if (w.barCount !== TARGET_POINTS) {
			amps = interpolateArray(w.waveformData, w.barCount);
		}

		for (let i = 0; i < w.barCount; i++) {

			const 
				val = amps[i],
				barH = val * height * 0.8,
				x = i * total,
				y = (height - barH) / 2;

			gctx.fillStyle = '#bbbbbb';
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
		w.ctx.clearRect(0,0,w.canvas.width,w.canvas.height);
		w.ctx.drawImage(w.bitmapGray,0,0);
	}

/*-------INTERPOLATION-------*/

	function interpolateArray(src,dstLen) {

		const 
			step = (src.length - 1) / (dstLen - 1),
			dst = new Float32Array(dstLen);

		for (let i = 0; i < dstLen; i++) {

		const
			pos = i * step,
			idx1 = Math.floor(pos),
			idx2 = Math.min(idx1 + 1, src.length - 1),
			frac = pos -idx1;

			dst[i] = src[idx1] * (1 - frac) + src[idx2] * frac;
		}
		return dst;
	}

/*-------SEEK-------*/

	function handleSeek(e, canvas) {

	    if (!pAudio.duration) return;

		// Get the waveform object associated with the clicked canvas
		const index = canvas.dataset.waveformIndex;

		if (index === undefined) return;

		const w = waveforms[index];

		// Only allow seeking if this is the currently playing track
		if (w.src !== pAudio.src) return;

		// Calculate click position
		const 
			rect = canvas.getBoundingClientRect(),
			clickX = e.clientX - rect.left,
			seekPercent = Math.max(0, Math.min(1, clickX / canvas.width));

		pAudio.currentTime = seekPercent * pAudio.duration;

		// Immediately update waveform progress
		updateProgress();
	}

/*-------PROGRESS-------*/

	function updateProgress() {

		if(!pAudio.duration) return;

		const index = srcIndexMap.get(pAudio.src);

		if(index === undefined) return;

		const 
			w = waveforms[index],
			ctx = w.ctx;

		// If waveform bitmap not ready yet, skip progress rendering
		if(!w.bitmapGray){
			return;
		}

		ctx.clearRect(0,0,w.canvas.width,w.canvas.height);
		ctx.drawImage(w.bitmapGray,0,0);

		// If progress bitmap not ready yet, stop here
		if(!w.bitmapProgress){
			return;
		}

		const 
			progress = pAudio.currentTime / pAudio.duration,
			width = w.canvas.width * progress;

		ctx.save();
		ctx.beginPath();
		ctx.rect(0,0,width,w.canvas.height);
		ctx.clip();

		ctx.drawImage(w.bitmapProgress,0,0);

		ctx.restore();

	}

/*-------PLAYBACK LOOP-------*/

	function playbackLoop() {

		if (!rafPlaying) return;

		updateTimeDisplay();
		updateProgress();

		requestAnimationFrame(playbackLoop);
	}

	pAudio.addEventListener('play',() => {
		rafPlaying = true;
		playbackLoop();
	});

	pAudio.addEventListener('pause',() => {
		rafPlaying = false;
	});

	pAudio.addEventListener('ended',() => {
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

				// Update canvas size
				w.canvas.width = container.clientWidth;
				w.canvas.height = container.clientHeight;

				// Recalculate barCount based on new width
				w.barCount = Math.max(1, Math.floor(w.canvas.width / (BAR_WIDTH + BAR_SPACING)));

				// Only rerender if waveformData exists
					if (w.waveformData) {
						await prerenderWaveformBitmaps(w); // regenerate bitmaps for new size
						drawBitmapWaveform(w);             // redraw waveform
						updateProgress();                  // update progress overlay if playing
					}
			}
		}, 120);
	});

	window.addEventListener('beforeunload',closeAudioContext);

/* -------------------------------------------------- */

	if(document.readyState === 'loading'){
		document.addEventListener('DOMContentLoaded',initWaveforms);
	} else {
		initWaveforms();
	}

})();
