const assert = require('assert').strict;

const {deepEqual} = require('./data_utils.js');


function initState() {
    return {
        // Array of HTML versions {htmlHash, html, jsURLs: Array of URLs, firstSeen, lastSeen}
        versions: [],
        // Array of objects:
        //    results: Array of runData (see check function),
        //    knownVersions: Array of htmlHash values of all known versions at the time of run
        runs: [],
    };
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
};