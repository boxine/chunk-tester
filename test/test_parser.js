const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {promisify} = require('util');

const {extractChunks} = require('../parser.js');

describe('chunk parsing', () => {
    it('extractChunks', async () => {
        const html = await promisify(fs.readFile)(
            path.join(__dirname, 'spa-index.html'), {encoding: 'utf-8'});
        const found = extractChunks(html);

        assert.deepStrictEqual(
            found,
            [
                '/static/js/0.7ca609b5.chunk.js',
                '/static/js/10.da8f7a1c.chunk.js',
                '/static/js/11.5eaa3d8d.chunk.js',
                '/static/js/12.e208bfe1.chunk.js',
                '/static/js/13.6c6e094d.chunk.js',
                '/static/js/3.8317c198.chunk.js',
                '/static/js/4.491c4537.chunk.js',
                '/static/js/5.2973f30f.chunk.js',
                '/static/js/6.20df1d7d.chunk.js',
                '/static/js/7.f3d9fbd6.chunk.js',
                '/static/js/8.c663e037.chunk.js',
                '/static/js/9.6546ed6f.chunk.js',
                '/static/js/main.be1e8479.chunk.js',
            ]
        );
    });

    it('extractChunks against local', async () => {
        const html = await promisify(fs.readFile)(
            path.join(__dirname, 'spa-index_local.html'), {encoding: 'utf-8'});
        const found = extractChunks(html);

        assert.deepStrictEqual(
            found,
            [
                '/static/js/1.chunk.js',
                '/static/js/bundle.js',
                '/static/js/main.chunk.js',
            ]
        );
    });
});
