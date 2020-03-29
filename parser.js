const assert = require('assert');

function js2json(nearlyJSON) {
    return nearlyJSON.replace(/(?<=[{,])([0-9]+)(?=:)/g, '"$1"');
}

function extractChunks(html) {
    const m = /"([^"]+)"\+\((\{[^}]*\})[^)]+\)+\+"\."\+(\{[^}]*\}).*?\+"(\.chunk\.js)"/.exec(html);
    const res = [];
    if (m) {
        const [, prefix, namesNearlyJSON, chunksNearlyJSON, suffix] = m;
        const names = JSON.parse(js2json(namesNearlyJSON));
        const chunks = JSON.parse(js2json(chunksNearlyJSON));
        res.push(... Object.entries(chunks).map(
            ([chunkNum, chunkHash]) => (
                '/' + prefix + (names[chunkNum] || chunkNum) + '.' + chunkHash + suffix)));
    }
    res.push(... Array.from(html.matchAll(/<script src="([^"]+)"/g), m => m[1]));

    assert(res.length > 0, `Could not find any chunks in ${html}`);
    res.sort();
    return res;
}

module.exports = {
    extractChunks,
};
