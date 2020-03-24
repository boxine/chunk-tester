const assert = require('assert').strict;
const fs = require('fs');
const {promisify} = require('util');

const {deepEqual} = require('./data_utils.js');


async function initState(stateFile) {
    if (stateFile) {
        try {
            const json = await promisify(fs.readFile)(stateFile, {encoding: 'utf-8'});
            const res = JSON.parse(json);
            assert(res.versions);
            assert(res.runs);
            return res;
        } catch(e) {
            if (e.code !== 'ENOENT') {
                throw e;
            }
        }
    }

    return {
        // Array of HTML versions {htmlHash, html, jsURLs: Array of URLs, firstSeen, lastSeen}
        versions: [],
        // Array of objects:
        //    results: Array of runData (see check function),
        //    knownVersions: Array of htmlHash values of all known versions at the time of run
        runs: [],
        // Object, JavaScript URL => {hash, content}
        referenceContent: {},
    };
}

async function writeState(stateFile, state) {
    if (!stateFile) return;

    // Write atomically to avoid data corruption
    const tmpFile = stateFile + '.tmp';
    await promisify(fs.writeFile)(tmpFile, JSON.stringify(state), {encoding: 'utf-8'});
    await promisify(fs.rename)(tmpFile, stateFile);
}

function integrateCheckResult(state, results, finishedTimestamp) {
    assert.strictEqual(typeof finishedTimestamp, 'number');
    const knownVersions = state.versions.map(v => v.htmlHash);

    const lastRun = (state.runs.length > 0) && state.runs[state.runs.length - 1];
    if (lastRun && deepEqual(lastRun.results, results)) {
        lastRun.lastFinished = finishedTimestamp;
        lastRun.knownVersions = knownVersions;
        return;
    }

    state.runs.push({
        firstFinished: finishedTimestamp,
        lastFinished: finishedTimestamp,
        results,
        knownVersions,
    });
}

module.exports = {
    initState,
    integrateCheckResult,
    writeState,
};
