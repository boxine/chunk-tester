async function wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(retryCount, asyncFunction, errorTestFunction=undefined) {
    while (retryCount-- > 0) {
        try {
            return await asyncFunction();
        } catch(e) {
            if (errorTestFunction && !errorTestFunction(e)) {
                throw e;
            }
            // Otherwise: ignored
        }
    }
    return await asyncFunction();
}

module.exports = {
    retry,
    wait,
};
