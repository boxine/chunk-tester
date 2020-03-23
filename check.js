const urlModule = require('url');

const {retry} = require('./promise_utils');
const {resolveIPs, downloadURL} = require('./net_utils');
const {extractChunks} = require('./parser');
const {cmpKeys, sha2} = require('./data_utils');

// Returns an object mapping the serverIPs to {htmlHash, htmlError, jsStatus}
// One of htmlHash and htmlError is set
// If an error occurs, error is set with {code, messge}
// jsStatus is an object mapping JavaScript URLs to {errcode, hash} where errcode is only set if the download failed
// Mutates versions to reflect the current state of available SPA versions
async function check(htmlURL, versions, ipv4Only) {
    let ips;
    try {
        ips = await retry(3, () => resolveIPs(htmlURL, ipv4Only));
    } catch(e) {
        return {
            error: {
                code: e.code,
                message: e.message,
            },
        };
    }
    const results = {};

    // Download HTML from every IP
    let htmlResults;
    try {
        htmlResults = await Promise.all(ips.map(ip => downloadURL(htmlURL, ip)));
    } catch(e) {
        return {
            error: e.code,
            message: 'Download error ' + e.code,
        };
    }
    const now = Date.now();
    for (const res of htmlResults) {
        const serverResult = {
            jsStatus: {},
        };
        if (res.statusCode !== 200) {
            serverResult.htmlError = res.statusCode;
        } else {
            const htmlHash = sha2(res.content);
            serverResult.htmlHash = htmlHash;

            // Did we find a new version?
            const version = versions.find(v => v.htmlHash === htmlHash);
            if (version) {
                version.lastSeen = now;
            } else {
                versions.push({
                    htmlHash,
                    html: res.content,
                    firstSeen: now,
                    lastSeen: now,
                    jsURLs: extractChunks(res.content).map(path => urlModule.resolve(htmlURL, path)),
                });
            }
        }
        results[res.serverIP] = serverResult;
    }

    // Collect all JavaScript URLs to download
    versions.sort(cmpKeys(['lastSeen', 'htmlHash']));
    // TODO maybe don't download all versions here at a later time, only last 3 or so
    const jsURLSet = new Set();
    for (const version of versions) {
        for (const jsURL of version.jsURLs) {
            jsURLSet.add(jsURL);
        }
    }
    const jsURLs = Array.from(jsURLSet);
    jsURLs.sort();

    async function downloadOne(jsURL, serverIP) {
        const response = await downloadURL(jsURL, serverIP);
        let runResult;
        if (response.statusCode !== 200) {
            runResult = {errcode: response.statusCode};
        } else if(/^\s+</.test(response.content)) {
            runResult = {errcode: 'soft-404'};
        } else {
            runResult = {hash: sha2(response.content)};
        }
        results[serverIP].jsStatus[jsURL] = runResult;
    }

    await Promise.all(jsURLs.map(jsURL => ips.map(ip => downloadOne(jsURL, ip))).flat());

    return results;
}

module.exports = {
    check,
};
