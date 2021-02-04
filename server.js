const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const server = express();

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

server.use('/public', express.static(path.join('public')))


function respondWithFileStream(pathArgs, req, res,) {
    try {
        const [file = "404.html", folder = "html"] = pathArgs || [];
        const requestFileName = /(\.ico|\.html)/.test(req.path) && req.path;
        const requestHtmlFile = !requestFileName && `${req.path}.html`;
        const requestFilePath = requestFileName && path.join(folder, requestFileName) || requestHtmlFile && path.join(folder, requestHtmlFile);
        const requestFileExists = requestFilePath && fs.existsSync(requestFilePath);
        const responseFilePath = requestFileExists && path.join(requestFilePath) || path.join(folder, file);
        const stream = fs.createReadStream(responseFilePath);
        stream.pipe(res);
        stream.on('end', () => {
            res.end();
        })
    } catch (err) {
        console.log(err)
        res.end('Unexpected error')
    }
}

server.get('/', respondWithFileStream.bind(null, ['index.html']))
server.use(respondWithFileStream.bind(null, null))

https.createServer(options, server).listen(8443);
http.createServer(server).listen(9090);