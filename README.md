### Prototype app for sending and viewing livestreams & recorded content

run project
```
npm i && npm start
```

### Routes
- [/cast/:streamName](https://localhost:8443/cast/exampleStreamName) to send stream
- [/view/:streamName](https://localhost:8443/cast/exampleStreamName) to view any ongoing stream

### How it works
In `cast/:streamName` view [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) sends blobs of video every 4 seconds to server, which stores `buffer` as files to streams directory and writes an `index.txt` file where video files are listed in order of presentation.
<br/><br/>
In `view/:streamName` view client requests and parses `index.txt` file and starts loading videos in correct order, and appending them  to [SourceBuffer](https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer) of the video player