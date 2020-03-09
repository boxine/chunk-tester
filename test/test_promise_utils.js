const assert = require('assert');

const {retry} = require('../promise_utils.js');

describe('promise_utils', () => {
    it('retry', async () => {
        let callCount = 0;
        async function testFunc() {
            if (++callCount <= 3) {
                throw new Error('ephemeral error');
            }
            return 'success';
        }

        assert.strictEqual(await retry(3, testFunc), 'success');
        assert.strictEqual(callCount, 4);

        callCount = 0;
        await assert.rejects(retry(2, testFunc), {message: 'ephemeral error'});
    });
});
