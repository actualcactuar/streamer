const { streamName } = params;
const video = document.getElementById('video');

const once = (eventName, eventTarget) => new Promise((resolve) => {
    eventTarget[eventName] = resolve;
})

const videoSource = new MediaSource();
const videoUrl = URL.createObjectURL(videoSource);
let lastRead;
let sourceBuffer;

async function fetchStreamContent() {
    try {
        const response = await fetch(`/stream/${streamName}/index.txt`);
        if (!response.ok) return;
        const [codec, ...lines] = (await response.text()).split('\n');
        if (!sourceBuffer) {
            sourceBuffer = videoSource.addSourceBuffer(codec);
        }
        const linesToRead = lastRead ? lines.slice(lines.indexOf(lastRead) + 1) : lines;

        for (const line of linesToRead) {
            console.log(line)
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

    } catch (err) {
        console.warn(err);
    }

}

videoSource.addEventListener('sourceopen', async () => {
    console.log('SOURCE OPEN!')

    await fetchStreamContent()

    if (lastRead !== 'END') {
        video.currentTime = video.buffered.end(0) - 4;
    }

    video.onwaiting = async () => {
        await fetchStreamContent()
    }
})


video.src = videoUrl;
