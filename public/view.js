const { streamName } = params;
const video = document.getElementById('video');
const codec = 'video/webm;codecs="vp9,opus"'

const once = (eventName, eventTarget) => new Promise((resolve) => {
    eventTarget[eventName] = resolve;
})

const videoSource = new MediaSource();
const videoUrl = URL.createObjectURL(videoSource);
let lastRead;

async function fetchStreamContent(sourceBuffer) {
    const response = await fetch(`/stream/${streamName}/index.txt`);
    if (!response.ok) return;
    const lines = (await response.text()).split('\n');
    const linesToRead = lastRead ? lines.slice(lines.indexOf(lastRead)+1): lines;

    for (const line of linesToRead) {
        lastRead = line;
        if (line === 'END') {
            videoSource.endOfStream()
            return;
        }
        const url = `/stream/${streamName}/${line}`;
        const response = await fetch(url, { headers: { 'Content-Type': 'application/octet-stream' } });
        const buffer = await response.arrayBuffer();
        sourceBuffer.appendBuffer(buffer);
        await once('onupdateend', sourceBuffer);
    }
}

videoSource.addEventListener('sourceopen', async () => {
    console.log('SOURCE OPEN!')
    const sourceBuffer = videoSource.addSourceBuffer(codec);
    await fetchStreamContent(sourceBuffer);

    if(lastRead !== 'END'){
        video.currentTime = video.buffered.end(0) - 4;
    }

    video.onwaiting = async () => {
        await fetchStreamContent(sourceBuffer)
    }
})


video.src = videoUrl;
