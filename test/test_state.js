const assert = require('assert').strict;

const {initState, integrateCheckResult} = require('../state.js');

describe('state', () => {
    it('run compression', async () => {
        const state = initState();
        integrateCheckResult(state, {
            foo: 1,
        }, 1580000000001);
        assert.deepStrictEqual(state.runs, [{
            knownVersions: [],
            firstFinished: 1580000000001,
            lastFinished: 1580000000001,
            results: {foo: 1},
        }]);

        integrateCheckResult(state, {
            foo: 1,
        }, 1580000000002);
        assert.deepStrictEqual(state.runs, [{
            knownVersions: [],
            firstFinished: 1580000000001,
            lastFinished: 1580000000002,
            results: {foo: 1},
        }]);

        integrateCheckResult(state, {
            foo: 2,
        }, 1580000000003);
        assert.deepStrictEqual(state.runs, [{
            knownVersions: [],
            firstFinished: 1580000000001,
            lastFinished: 1580000000002,
            results: {foo: 1},
        }, {
            knownVersions: [],
            firstFinished: 1580000000003,
            lastFinished: 1580000000003,
            results: {foo: 2},
        }]);

        integrateCheckResult(state, {
            foo: 1,
        }, 1580000000004);
        assert.deepStrictEqual(state.runs, [{
            knownVersions: [],
            firstFinished: 1580000000001,
            lastFinished: 1580000000002,
            results: {foo: 1},
        }, {
            knownVersions: [],
            firstFinished: 1580000000003,
            lastFinished: 1580000000003,
            results: {foo: 2},
        }, {
            knownVersions: [],
            firstFinished: 1580000000004,
            lastFinished: 1580000000004,
            results: {foo: 1},
        }]);
    });
});
