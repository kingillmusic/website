// waveform-worker.js
self.onmessage = function(e) {
    const { srcArray, dstLen, method, width, height, barWidth, barSpacing, contrastExp, maxBarHeightFrac, index } = e.data;

    // --- Resample function (copied from main script) ---
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

    // --- Resample the data ---
    const amps = resampleArray(srcArray, dstLen, method);

    // --- Find max amplitude after resampling (for scaling) ---
    let maxAmp = 0;
    for (let i = 0; i < amps.length; i++) {
        if (amps[i] > maxAmp) maxAmp = amps[i];
    }
    if (maxAmp === 0) maxAmp = 1;

    const exp = contrastExp;
    const maxAmpExp = Math.pow(maxAmp, exp);
    const scale = maxBarHeightFrac / maxAmpExp;

    const N = amps.length; // should equal dstLen

    // --- Compute bar positions (same logic as main) ---
    let spacing = (N > 1) ? (width - N * barWidth) / (N - 1) : 0;
    const totalStep = barWidth + spacing;

    // --- Create two offscreen canvases ---
    const offGray = new OffscreenCanvas(width, height);
    const offProgress = new OffscreenCanvas(width, height);
    const gctx = offGray.getContext('2d');
    const pctx = offProgress.getContext('2d');

    // --- Draw gray bars ---
    for (let i = 0; i < N; i++) {
        const val = amps[i];
        const transformed = Math.pow(val, exp);
        const barH = transformed * height * scale;
        const x = (N > 1) ? i * totalStep : (width - barWidth) / 2;
        const y = (height - barH) / 2;

        gctx.fillStyle = '#aaaaaa';
        gctx.fillRect(x, y, barWidth, barH);

        pctx.fillStyle = '#87ffff';
        pctx.fillRect(x, y, barWidth, barH);
    }

    // --- Convert canvases to ImageBitmaps (transferable) ---
    const grayBitmap = offGray.transferToImageBitmap();
    const progressBitmap = offProgress.transferToImageBitmap();

    // --- Send both bitmaps back to main thread ---
    self.postMessage({
        index,
        grayBitmap,
        progressBitmap
    }, [grayBitmap, progressBitmap]); // transfer ownership
};