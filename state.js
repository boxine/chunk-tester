const assert = require('assert').strict;

const {deepEqual} = require('./data_utils.js');


function initState() {
    return {
        // Array of HTML versions {htmlHash, html, jsURLs: Array of URLs, firstSeen, lastSeen}
        versions: [],
        // {results: Array of runData (see check function)}
        runs: [],
    };
}

function integrateCheckResult(state, results, finishedTimestamp) {
    assert.strictEqual(typeof finishedTimestamp, 'number');

    if (state.runs.length > 0 && deepEqual(state.runs[state.runs.length - 1].results, results)) {
        state.runs[state.runs.length - 1].lastFinished = finishedTimestamp;
        return;
    }

    state.runs.push({
        firstFinished: finishedTimestamp,
        lastFinished: finishedTimestamp,
        results,
    });
}

module.exports = {
    initState,
    integrateCheckResult,
};