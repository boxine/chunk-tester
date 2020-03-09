const assert = require('assert');

function extractChunks(html) {
    const m = /"([^"]+)"\+\([^)]+\)+\+"\."\+(\{[^}]*\}).*?\+"(\.chunk\.js)"/.exec(html);
    assert(m, `Could not find chunks in ${html}`);
    const [, prefix, chunksNearlyJSON, suffix] = m;
    const chunksJSON = chunksNearlyJSON.replace(/(?<=[{,])([0-9]+)(?=:)/g, '"$1"');
    const chunks = JSON.parse(chunksJSON);
    const res = Object.entries(chunks).map(
        ([chunkNum, chunkHash]) => '/' + prefix + chunkNum + '.' + chunkHash + suffix);

    res.push(... Array.from(html.matchAll(/<script src="([^"]+)"/g), m => m[1]));
    res.sort();
    return res;
}

module.exports = {
    extractChunks,
};
