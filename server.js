const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const server = express();
const stream = require('stream');
const readline = require('readline');

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
                    console.log('HEAD')
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
        const transform = fileStreamTransform(`<script>const params = ${JSON.stringify(req.params|| {})}</script>`);
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

const increments = new Map()

function saveStreamBlob(req, res) {
    const { params: { streamName } } = req;

    const exists = fs.existsSync(path.join('streams',streamName));
    if(!exists){
        fs.mkdirSync(path.join('streams', streamName))
    }

    let increment = increments.get(streamName) || 0;

    const fileStream = fs.createWriteStream(path.join('streams', streamName, `${streamName}-${increment}.webm`));
    req.pipe(fileStream);

    increment++
    increments.set(streamName, increment)

    req.on('end', () => {
        res.status(200).send({ message: 'ok' })
    })

}

function getStreamData(req,res){
    const { params: { streamName, fileName } } = req;

    let filePath = path.join(path.join('streams', streamName, fileName));

    const fileExists = fs.existsSync(filePath);
    if(!fileExists){
        res.send({message:"requested file does not exist"});
        return;
    }


    const indexFile = fs.createReadStream(path.join('streams', streamName, fileName));

    indexFile.pipe(res);
    indexFile.on('end', () => {
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