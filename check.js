const assert = require('assert');
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
async function check(htmlURL, state, ipv4Only) {
    const {versions, referenceContent} = state;

    let ips;
    try {
        ips = await retry(3, () => resolveIPs(htmlURL, ipv4Only));
    } catch(e) {
        return {
            error: {
                code: e.code || e.message,
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
            error: {
                code: e.code || e.message,
                message: 'Download error ' + e.code,
            },
        };
    }
    const now = Date.now();
    for (const res of htmlResults) {
        const serverResult = {
            jsStatus: {},
        };
        if (res.statusCode !== 200) {
            if (typeof res.statusCode == 'number') {
                serverResult.htmlError = `HTTP ${res.statusCode}`;
            } else {
                serverResult.htmlError = res.statusCode;
            }
        } else {
            const htmlHash = sha2(res.content);
            serverResult.htmlHash = htmlHash;

            // Did we find a new version?
            const version = versions.find(v => v.htmlHash === htmlHash);
            if (version) {
                version.lastSeen = now;
            } else {
                let relativeURLs = null;
                try {
                    relativeURLs = extractChunks(res.content);
                } catch(e) {
                    serverResult.htmlError = e.message;
                }
                if (relativeURLs) { // No error occured
                    const jsURLs = relativeURLs.map(path => urlModule.resolve(htmlURL, path));
                    versions.push({
                        htmlHash,
                        html: res.content,
                        firstSeen: now,
                        lastSeen: now,
                        jsURLs,
                    });
                }
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
        } else {
            const contentType = response.headers['content-type'];
            if (!contentType) {
                runResult = {errcode: 'no-content-type'};
            } else if (! /javascript|ecmascript/.test(contentType)) {
                runResult = {errcode: 'soft-404'};
            } else {
                assert.equal(typeof response.content, 'string');
                const hash = sha2(response.content);
                runResult = {
                    hash,
                };

                // Check against stored reference content
                if (!referenceContent[jsURL]) { // never seen this URL, store it
                    referenceContent[jsURL] = {
                        hash,
                        content: response.content,
                    };
                } else {
                    const reference = referenceContent[jsURL];
                    if (hash !== reference.hash) {
                        runResult = {
                            errcode: 'changed-hash',
                            expectedHash: reference.hash,
                            gotHash: hash,
                            expectedContent: reference.content,
                            gotContent: response.content,
                        };
                    }
                }
            }
        }
        results[serverIP].jsStatus[jsURL] = runResult;
    }

    await Promise.all(jsURLs.map(jsURL => ips.map(ip => downloadOne(jsURL, ip))).flat());

    return results;
}

module.exports = {
    check,
};
