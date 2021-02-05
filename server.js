const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const server = express();
const stream = require('stream');
const STREAM_DIR = 'streams';

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

server.use('/public', express.static(path.join('public')))

function resolveResponseFilePath(pathArgs, requestPath) {
    const [file = "404.html", folder = "html"] = pathArgs || [];
    const requestFileName = /(\.ico|\.html)/.test(requestPath) && requestPath;
    const requestHtmlFile = !requestFileName && `${requestPath}.html`;
    const requestFilePath = requestFileName && path.join(folder, requestFileName) || requestHtmlFile && path.join(folder, requestHtmlFile);
    const requestFileExists = requestFilePath && fs.existsSync(requestFilePath);
    const responseFilePath = requestFileExists && path.join(requestFilePath) || path.join(folder, file);
    return responseFilePath;
}

const fileStreamTransform = (appendToHead = '') =>
    new stream.Transform({
        transform(buffer, enc, done) {
            const str = buffer.toString()
            const lines = str.split('\n');
            const formatted = lines.map(line => {
                if (/\<\/head\>/.test(line)) {
                    return [appendToHead, line].join('\n');
                }
                return line;
            }).join('\n');
            const buf = Buffer.from(formatted);
            this.push(buf);
            done();
        },
    });

function respondWithFileStream(pathArgs, req, res) {
    try {
        const responseFilePath = resolveResponseFilePath(pathArgs, req.path)
        const stream = fs.createReadStream(responseFilePath);
        // inject params to end of the head
        const transform = fileStreamTransform(`<script>const params = ${JSON.stringify(req.params || {})}</script>`);
        stream.pipe(transform).pipe(res);
        transform.on('end', () => {
            res.end();
        })
    } catch (err) {
        console.log(err)
        res.end('Unexpected error')
    }
}

function respondToStreamView(req, res) {
    const { path } = req;
    const [, file] = path.split('/');
    respondWithFileStream([`${file}.html`], req, res);
}

function respondToCastView(req, res) {
    const { path } = req;
    const [, file] = path.split('/');
    respondWithFileStream([`${file}.html`], req, res);
}

async function saveStreamBlob(req, res) {
    try {
        const { params: { streamName } } = req;

        const dirPath = path.join(STREAM_DIR, streamName)

        const result = await fs.promises.stat(dirPath).catch(err => err);
        if (result instanceof Error && result.code === 'ENOENT') {
            await fs.promises.mkdir(dirPath);
        }

        const fileHandle = await fs.promises.open(path.join(dirPath, 'index.txt'), 'a+');
        const text = (await fileHandle.readFile()).toString();
        const lines = text && text.split('\n') || [];
        const increment = lines.length;

        const fileName = `${streamName}-${increment}.webm`;
        const textToAppend = increment ? `\n${fileName}` : fileName;
        await fileHandle.appendFile(textToAppend);
        fileHandle.close();

        const fileStream = fs.createWriteStream(path.join('streams', streamName, fileName));
        req.pipe(fileStream);
        req.on('end', () => {
            res.status(200).send({ message: 'ok' });
        })
    } catch (err) {
    }
}

function getStreamData(req, res) {
    const { params: { streamName, fileName } } = req;

    let filePath = path.join(path.join('streams', streamName, fileName));

    const fileExists = fs.existsSync(filePath);
    if (!fileExists) {
        res.status(404).send({ message: "requested file does not exist" });
        return;
    }
    const fileStream = fs.createReadStream(path.join('streams', streamName, fileName));
    fileStream.pipe(res);
    fileStream.on('end', () => {
        res.end();
    })
}

server.get('/', respondWithFileStream.bind(null, ['index.html']))
server.get('/cast/:streamName', respondToCastView)
server.post('/cast/:streamName', saveStreamBlob)
server.get('/view/:streamName', respondToStreamView)
server.get('/stream/:streamName/:fileName', getStreamData)
server.use(respondWithFileStream.bind(null, null))

https.createServer(options, server).listen(8443);
http.createServer(server).listen(9090);


// Create directory for streams if doesn't exist
fs.promises.stat(STREAM_DIR).catch(({ code }) => {
    if (code === 'ENOENT') {
        fs.promises.mkdir(STREAM_DIR);
    }
});
