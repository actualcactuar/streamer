export function getPreferredCodec() {
    const codecs = [
        'video/webm; codecs="vp8,vorbis"',
        'video/webm; codecs="vp9,opus"',
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    ]
    const [preferredCodec] = codecs.filter(c => MediaSource.isTypeSupported(c) && MediaRecorder.isTypeSupported(c));
    return preferredCodec;
}