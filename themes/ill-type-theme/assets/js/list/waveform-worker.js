// waveform-worker.js

let waveformCache = new Map();

async function loadWaveformData(src) {
    if (waveformCache.has(src)) {
        return waveformCache.get(src);
    }

    // Build JSON URL
    const jsonUrl = src
        .replace('/mp3/', '/waveforms/')
        .replace(/\.opus$/, '.json.gz');

    try {
        const response = await fetch(jsonUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        let jsonText;

        const isGzipped = arrayBuffer.byteLength >= 2 &&
            new Uint8Array(arrayBuffer, 0, 2)[0] === 0x1F &&
            new Uint8Array(arrayBuffer, 0, 2)[1] === 0x8B;

        if (isGzipped) {
            if (!('DecompressionStream' in self)) {
                throw new Error('DecompressionStream not supported.');
            }
            const stream = new Response(arrayBuffer).body
                .pipeThrough(new DecompressionStream('gzip'));
            const decompressedBuffer = await new Response(stream).arrayBuffer();
            jsonText = new TextDecoder('utf-8').decode(decompressedBuffer);
        } else {
            jsonText = new TextDecoder('utf-8').decode(arrayBuffer);
        }

        const json = JSON.parse(jsonText);

        let peaks;
        if (json.peaks) {
            peaks = json.peaks;
        } else if (json.data) {
            peaks = json.data.map(v => Math.abs(v - 128) / 128);
        } else {
            throw new Error('Unknown JSON format');
        }

        const amplitudes = Float32Array.from(peaks);
        waveformCache.set(src, amplitudes);
        return amplitudes;
    } catch (err) {
        console.warn('Failed to load waveform JSON:', jsonUrl, err);
        return null;
    }
}

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

self.onmessage = async function(e) {
    const {
        audioSrc,       // new: URL of the audio track
        dstLen,
        method,
        width,
        height,
        barWidth,
        barSpacing,
        contrastExp,
        maxBarHeightFrac,
        index,
        grayColor = '#777777',
        progressColor = '#87ffff'
    } = e.data;

	if (width <= 0 || height <= 0) {
		return;
	}

    // 1. Fetch and decompress the waveform data
    const amplitudes = await loadWaveformData(audioSrc);
    if (!amplitudes) {
        // Could send an error message back if needed
        return;
    }

    // 2. Resample
    const amps = resampleArray(amplitudes, dstLen, method);

    // 3. Scale and contrast
    let maxAmp = 0;
    for (let i = 0; i < amps.length; i++) {
        if (amps[i] > maxAmp) maxAmp = amps[i];
    }
    if (maxAmp === 0) maxAmp = 1;

    const exp = contrastExp;
    const maxAmpExp = Math.pow(maxAmp, exp);
    const scale = maxBarHeightFrac / maxAmpExp;

    const N = amps.length;
    let spacing = (N > 1) ? (width - N * barWidth) / (N - 1) : 0;
    const totalStep = barWidth + spacing;

    // 4. Draw on offscreen canvases
    const offGray = new OffscreenCanvas(width, height);
    const offProgress = new OffscreenCanvas(width, height);
    const gctx = offGray.getContext('2d');
    const pctx = offProgress.getContext('2d');

    for (let i = 0; i < N; i++) {
        const val = amps[i];
        const transformed = Math.pow(val, exp);
        const barH = transformed * height * scale;
        const x = (N > 1) ? i * totalStep : (width - barWidth) / 2;
        const y = (height - barH) / 2;

        gctx.fillStyle = grayColor;
        gctx.fillRect(x, y, barWidth, barH);

        pctx.fillStyle = progressColor;
        pctx.fillRect(x, y, barWidth, barH);
    }

    // 5. Transfer bitmaps
    const grayBitmap = offGray.transferToImageBitmap();
    const progressBitmap = offProgress.transferToImageBitmap();

    self.postMessage({
        index,
        grayBitmap,
        progressBitmap
    }, [grayBitmap, progressBitmap]);
};
