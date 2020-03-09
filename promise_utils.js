async function wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(retryCount, asyncFunction) {
    while (retryCount-- > 0) {
        try {
            return await asyncFunction();
        } catch(e) { /* error ignored */ }
    }
    return await asyncFunction();
}

module.exports = {
    retry,
    wait,
};
