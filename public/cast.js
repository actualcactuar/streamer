const video = document.getElementById('video');
const btn = document.getElementById('btn');
const stop = document.getElementById('stop');
const range = document.getElementById('range');
const codec = 'video/webm;codecs="vp9,opus"'

const chunks = [];

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

    recorder.ondataavailable = (event) => {
        console.log(event)
        const { data: blob } = event;
        chunks.push(blob);

        blob.arrayBuffer().then(buffer => {
            const uInt8Buffer = new Uint8Array(buffer);
            fetch(`/cast/${params.streamName}`, {
                method: 'POST',
                body: uInt8Buffer,
                headers: { 'Content-Type': 'application/octet-stream' }
            })
            .then(result => console.log(result))
            .catch(err => console.warn(err))
        })
    }

    stop.onclick = () => {
        recorder.stop();
        for (const track of mediaStream.getTracks()) {
            track.stop();
        }
        ctx.close();
    }
}

btn.onclick = stream;