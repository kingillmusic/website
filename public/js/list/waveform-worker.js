self.addEventListener('message', async (e) => {
    const { src, targetPoints } = e.data;
    try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new OfflineAudioContext(1, 1, 44100);
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const points = targetPoints;
        const blockSize = Math.floor(length / points);
        const amplitudes = new Float32Array(points);

        for (let ch = 0; ch < numChannels; ch++) {
            const channelData = audioBuffer.getChannelData(ch);
            for (let i = 0; i < points; i++) {
                const start = i * blockSize;
                const end = Math.min(start + blockSize, length);
                let max = 0;
                for (let j = start; j < end; j++) {
                    const abs = Math.abs(channelData[j]);
                    if (abs > max) max = abs;
                }
                amplitudes[i] += max;
            }
        }

        for (let i = 0; i < points; i++) {
            amplitudes[i] = amplitudes[i] / numChannels;
        }

        self.postMessage({ src, amplitudes: Array.from(amplitudes) });
    } catch (error) {
        self.postMessage({ src, error: error.message });
    }
});