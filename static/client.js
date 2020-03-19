'use strict';

function empty(node) {
    let last;
    while ((last = node.lastChild)) {
        node.removeChild(last);
    }
}

function el(parent, tagName, attrs, text) {
    const doc = parent ? parent.ownerDocument : document;
    const el = doc.createElement(tagName);
    if (attrs) {
        for (const k in attrs) {
            el.setAttribute(k, attrs[k]);
        }
    }
    if ((text !== undefined) && (text !== null)) {
        el.appendChild(doc.createTextNode(text));
    }
    if (parent) {
        parent.appendChild(el);
    }
    return el;
}

function formatTime(timestamp) {
    const pad = n => ('' + n).padStart(2, '0');

    const date = new Date(timestamp);
    return (
        `${date.getFullYear()}-${pad(date.getMonth())}-${pad(date.getDate())}` +
        ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
}

function formatHash(hash) {
    return hash.slice(0, 4);
}

function render(state) {
    const main = document.querySelector('main');
    empty(main);

    const allServers = [];
    for (const run of state.runs) {
        for (const server of Object.keys(run.results)) {
            if (!allServers.includes(server)) {
                allServers.push(server);
            }
        }
    }

    const table = el(main, 'table');
    const thead = el(table, 'thead');
    const theadTr = el(thead, 'tr');
    el(theadTr, 'th');
    for (const s of allServers) {
        el(theadTr, 'th', {}, s);
    }

    const tbody = el(table, 'tbody');
    for (const run of state.runs) {
        const tr = el(tbody, 'tr');
        el(tr, 'td', {
            style: 'vertical-align: top;color:#888;',
        }, formatTime(run.finished));

        for (const s of allServers) {
            const serverResult = run.results[s];
            const td = el(tr, 'td');
            if (! serverResult) {
                continue;
            }

            if (serverResult.htmlError) {
                el(td, 'div', {'class': 'error'}, serverResult.htmlError);
            } else {
                el(td, 'div', {}, `HTML ${formatHash(serverResult.htmlHash)}`);
            }
        }

        // JavaScript versions per server
        for (const v of state.versions) {
            const tr = el(tbody, 'tr');
            el(tr, 'td', {style: 'text-align: right'}, formatHash(v.htmlHash));

            for (const s of allServers) {
                const serverResult = run.results[s];
                const td = el(tr, 'td');
                if (! serverResult) {
                    continue;
                }

                const versionOk = v.jsURLs.every(jsURL => {
                    const fileResult = serverResult.jsStatus[jsURL];
                    return fileResult && !fileResult.errcode;
                });

                el(td, 'div', {
                    style: `color: ${versionOk ? '#004400' : '#cc0000'}`,
                }, versionOk ? '✔' : 'X');
                // TODO more info if !versionOk
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/state');
    if (res.status !== 200) {
        alert(`Failed retrieving data with ${res.status} - check server`);
        return;
    }
    render(await res.json());
});
