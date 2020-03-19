#!/usr/bin/env node

const argparse = require('argparse');
const crypto = require('crypto');
const urlModule = require('url');

const webserver = require('./webserver');
const {wait, retry} = require('./promise_utils');
const {resolveIPs, downloadURL} = require('./net_utils');
const {extractChunks} = require('./parser');

function cmp(a, b) {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    } else {
        return 0;
    }
}

function cmpKeys(keys) {
    return (a, b) => {
        for (const k of keys) {
            const res = cmp(a[k], b[k]);
            if (res !== 0) return res;
        }
        return 0;
    };
}

function sha2(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

// Returns an object mapping the serverIPs to {htmlHash, jsStatus}
// jsStatus is an object mapping JavaScript URLs to {errcode, hash} where errcode is only set if the download failed
// Mutates versions to reflect the current state of available SPA versions
async function check(htmlURL, versions, ipv4Only) {
    const ips = await retry(3, () => resolveIPs(htmlURL, ipv4Only));
    const results = {};

    // Download HTML from every IP
    const htmlResults = await Promise.all(ips.map(ip => downloadURL(htmlURL, ip)));
    const now = Date.now();
    for (const res of htmlResults) {
        const htmlHash = sha2(res.content);
        results[res.serverIP] = {
            htmlHash,
            jsStatus: {},
        };

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

async function main() {
    const parser = argparse.ArgumentParser({
        description: 'Monitor chunk status in an SPA',
    });
    parser.addArgument('--interval', {
        defaultValue: 60000,
        metavar: 'MS',
        help: 'Milliseconds between runs',
    });
    parser.addArgument(['-4', '--ipv4-only'], {
        action: 'storeTrue',
        help: 'Only request IPv4 addresses',
    });
    parser.addArgument(['-p', '--port'], {
        metavar: 'PORT',
        defaultValue: 3005,
        help: 'Port for the server to run on (default: %(defaultValue)s)',
    });
    parser.addArgument('URL', {
        help: 'Website to check',
    });
    const args = parser.parseArgs();

    const state = {
        versions: [], // Array of HTML versions {htmlHash, html, jsURLs: Array of URLs, firstSeen, lastSeen}
        runs: [], // {started, finished, results: Array of runData (see check function)}
    };

    await webserver.launch(args, state);
    // TODO relay info via webserver?

    while (true) { // eslint-disable-line no-constant-condition
        const started = Date.now();
        const results = await check(args.URL, state.versions, args.ipv4_only);
        console.log(JSON.stringify(results, undefined, 2));

        // TODO better integration of data
        state.runs.push({
            started,
            finished: Date.now(),
            results,
        });
        await wait(args.interval);
    }
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e.stack);  // eslint-disable-line no-console
        process.exit(2);
    }
})();
