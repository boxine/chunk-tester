#!/usr/bin/env node
const argparse = require('argparse');
const http = require('http');
const https = require('https');
const url = require('url');

function main() {
    const parser = argparse.ArgumentParser({
        description: 'Simple reverse proxy (to quickly test switching)',
    });
    parser.addArgument(['-p', '--port'], {
        type: Number,
        defaultValue: 3006,
        help: 'Port to run on (default: %(defaultValue)s)',
    });
    parser.addArgument('BACKEND_URL', {
        help: 'Backend website',
    });
    const args = parser.parseArgs();

    const backend = url.parse(args.BACKEND_URL);
    const backendPort = backend.port || (backend.protocol === 'https:' ? 443 : 80);

    const srv = http.createServer((req, res) => {
        const request = url.parse(req.url);

        const options = {
            host: backend.hostname,
            port: backendPort,
            path: request.path,
            method: req.method,
            headers: req.headers,
            rejectUnauthorized: false,
        };
        options.headers['host'] = backend.host;
        console.log(
            `${options.method} ${backend.protocol}//${options.host}:${options.port}${options.path}`);

        const requestFunc = backend.protocol === 'https:' ? https.request : http.request;
        const backendRequest = requestFunc(options, backendResponse => {
            res.writeHead(backendResponse.statusCode, backendResponse.headers);

            backendResponse.on('data', chunk => {
                res.write(chunk);
            });

            backendResponse.on('end', () => {
                res.end();
            });
        });
        req.on('data', chunk => {
            backendRequest.write(chunk);
        });
        req.on('end', () => {
            backendRequest.end();
        });
    });
    srv.listen(args.port);
}

main();
