const assert = require('assert');

function extractChunks(html) {
    const m = /"([^"]+)"\+\([^)]+\)+\+"\."\+(\{[^}]*\}).*?\+"(\.chunk\.js)"/.exec(html);
    const res = [];
    if (m) {
        const [, prefix, chunksNearlyJSON, suffix] = m;
        const chunksJSON = chunksNearlyJSON.replace(/(?<=[{,])([0-9]+)(?=:)/g, '"$1"');
        const chunks = JSON.parse(chunksJSON);
        res.push(... Object.entries(chunks).map(
            ([chunkNum, chunkHash]) => '/' + prefix + chunkNum + '.' + chunkHash + suffix));
    }
    res.push(... Array.from(html.matchAll(/<script src="([^"]+)"/g), m => m[1]));

    assert(res.length > 0, `Could not find any chunks in ${html}`);
    res.sort();
    return res;
}

module.exports = {
    extractChunks,
};
