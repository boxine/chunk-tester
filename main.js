#!/usr/bin/env node

const argparse = require('argparse');

const webserver = require('./webserver');
const {wait} = require('./promise_utils');
const {check} = require('./check');
const {initState, integrateCheckResult} = require('./state');

async function main() {
    process.on('SIGINT', () => {
        process.exit();
    });

    const parser = argparse.ArgumentParser({
        description: 'Monitor chunk status in an SPA',
    });
    parser.addArgument('--interval', {
        defaultValue: 60000,
        metavar: 'MS',
        help: 'Milliseconds between runs',
    });
    parser.addArgument(['-4', '--ipv4-only'], {
        action: 'storeTrue',
        help: 'Only request IPv4 addresses',
    });
    parser.addArgument(['-p', '--port'], {
        metavar: 'PORT',
        defaultValue: 3005,
        help: 'Port for the server to run on (default: %(defaultValue)s)',
    });
    parser.addArgument('URL', {
        help: 'Website to check',
    });
    const args = parser.parseArgs();

    const state = initState();

    await webserver.launch(args, state);

    while (true) { // eslint-disable-line no-constant-condition
        const results = await check(args.URL, state.versions, args.ipv4_only);

        integrateCheckResult(state, results, Date.now());
        await wait(args.interval);
    }
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.error(e.stack);  // eslint-disable-line no-console
        process.exit(2);
    }
})();
