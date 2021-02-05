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

    const response = await fetch(`/stream/${streamName}/index.txt`);
    if(!response.ok) return;
    const files = (await response.text()).split('\n');
    console.log(files)

    for (const file of files) {
        const url = `/stream/${streamName}/${file}`;
        const response = await fetch(url, { headers: { 'Content-Type': 'application/octet-stream' } });
        const buffer = await response.arrayBuffer();
        sourceBuffer.appendBuffer(buffer);
        await once('onupdateend', sourceBuffer);
    }

    videoSource.endOfStream();

})
video.src = videoUrl;
