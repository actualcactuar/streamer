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
                if (/^\<\/head\>$/.test(line)) {
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
        const transform = fileStreamTransform(`<script>const params = ${JSON.stringify(req.params)}</script>`);
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
    const { params: { streamName }, path } = req;
    console.log({ streamName, path })
    const [, file] = path.split('/');
    respondWithFileStream([`${file}.html`], req, res);
}

server.get('/', respondWithFileStream.bind(null, ['index.html']))
server.get('/cast/:streamName', respondToStreamView)
server.get('/view/:streamName', respondToStreamView)
server.use(respondWithFileStream.bind(null, null))

https.createServer(options, server).listen(8443);
http.createServer(server).listen(9090);