const { streamName } = params;
const video = document.getElementById('video');
const codec = 'video/webm;codecs="vp9,opus"'

const once = (eventName, eventTarget) => new Promise((resolve) => {
    eventTarget[eventName] = resolve;
})

const videoSource = new MediaSource();
const videoUrl = URL.createObjectURL(videoSource);

videoSource.addEventListener('sourceopen', async () => {
    const sourceBuffer = videoSource.addSourceBuffer(codec);

    const response = await fetch(`/stream/${streamName}/index.json`);
    const { files = [] } = await response.json();

    for (const file of files) {
        const url = `/stream/${streamName}/${file}`;
        const response = await fetch(url, { headers: { 'Content-Type': 'application/octet-stream' } });

        const reader = response.body.getReader()

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sourceBuffer.appendBuffer(value);
            await once('onupdateend', sourceBuffer);
        }

    }

    videoSource.endOfStream();

})
video.src = videoUrl;
