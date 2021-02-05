const video = document.getElementById('video');
const btn = document.getElementById('btn');
const stop = document.getElementById('stop');
const range = document.getElementById('range');
const codec = 'video/webm;codecs="vp9,opus"'
const { streamName } = params;


async function sendBlob(blob) {
    const buffer = await blob.arrayBuffer()
    return fetch(`/cast/${streamName}`, {
        method: 'POST',
        body: buffer,
        headers: { 'Content-Type': 'application/octet-stream' }
    })
}

async function stream() {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const videoStream = new MediaStream(mediaStream.getVideoTracks());
    const audioStream = new MediaStream(mediaStream.getAudioTracks());

    video.srcObject = videoStream;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(audioStream);
    const master = ctx.createGain();
    master.gain.value = parseFloat(range.value)

    range.onchange = () => {
        master.gain.value = parseFloat(range.value)
    }

    source.connect(master).connect(ctx.destination);

    const recorder = new MediaRecorder(mediaStream, { mimeType: codec });
    recorder.start(4000);

    recorder.ondataavailable = async (event) => {
        const { data: blob } = event;

        console.log(event)
        await sendBlob(blob);

        if (recorder.state === 'inactive') {
            await fetch(`/streamend/${streamName}`, { method: 'PATCH' });
        }

    }

    stop.onclick = () => {
        recorder.stop();
        for (const track of mediaStream.getTracks()) {
            track.stop();
        }
        ctx.close();
    }
}

btn.disabled = !streamName;
range.disabled = !streamName;
stop.disabled = !streamName;
btn.onclick = stream;