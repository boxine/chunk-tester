const assert = require('assert');
const dnsPromises = require('dns').promises;
const http = require('http');
const https = require('https');
const urlModule = require('url');

// Convert DNS error NODATA to empty array
async function _orEmpty(dnsPromise) {
    try {
        return await dnsPromise;
    } catch (e) {
        if (e.code === 'ENODATA') {
            return [];
        }
        throw e;
    }
}

async function resolveIPs(url, ipv4Only) {
    const {hostname} = urlModule.parse(url);
    if (ipv4Only) {
        return await dnsPromises.resolve4(hostname);
    }

    const [v4ips, v6ips] = await Promise.all([
        _orEmpty(dnsPromises.resolve4(hostname)),
        _orEmpty(dnsPromises.resolve6(hostname)),
    ]);
    const res = [...v4ips, ...v6ips];
    if (res.length === 0) {
        throw new Error(`Could not find any IP addresses for ${hostname}`);
    }
    return res;
}

// async function, returns a promise of the response.
// Sets the additional properties on the response:
// - content (whole response content)
// - serverIP the ip address of the server, as specified
async function downloadURL(url, serverIP) {
    assert(/^https?:\/\//.test(url), `Invalid URL ${url}`);
    assert.strictEqual(typeof serverIP, 'string');
    const requestFunc = url.startsWith('https://') ? https.request : http.request;

    try {
        return await new Promise((resolve, reject) => {
            const request = requestFunc(url, {
                lookup: (_hostname, {all}, callback) => {
                    assert(!all, '"all" option not implemented');
                    callback(null, serverIP, serverIP.includes(':') ? 6 : 4);
                },
                timeout: 10000,
            }, res => {
                res.setEncoding('utf8');
                res.content = '';
                res.serverIP = serverIP;
                res.on('data', chunk => {
                    res.content += chunk;
                });
                res.on('end', () => {
                    resolve(res);
                });
            });
            request.on('error', e => {
                reject(e);
            });
            request.end();
        });
    } catch(e) {
        return {
            statusCode: `error ${e.code}`,
            serverIP: serverIP,
        };
    }
}

module.exports = {
    downloadURL,
    resolveIPs,
};
