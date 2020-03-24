const express = require('express');
const path = require('path');

const staticDir = path.join(__dirname, 'static');

async function launch(args, state) {
    const app = express();

    app.get('/', (req, res, next) => res.sendFile('index.html', {root: staticDir}, next));
    app.get('/favicon.ico', (req, res, next) => res.sendFile('favicon.png', {root: staticDir}, next));
    app.use('/static', express.static(staticDir));
    app.get('/state', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Expires', '0');
        res.send({
            runs: state.runs,
            versions: state.versions,
            url: args.URL,
        });
    });

    await new Promise(resolve => {
        app.listen(args.port, resolve);
    });
    console.log(`Server listening on port ${args.port}`);
}

module.exports = {
    launch,
};
