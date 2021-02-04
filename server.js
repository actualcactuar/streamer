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


function respondWithFileStream(pathArgs, req, res) {
    const filePath = path.join(...pathArgs);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('end', () => {
        res.end();
    })
}

server.get('/', respondWithFileStream.bind(null, ['html','index.html']))
server.use(respondWithFileStream.bind(null, ['html', '404.html']))

https.createServer(options, server).listen(8443);
http.createServer(server).listen(9090);