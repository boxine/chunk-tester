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

// From https://gist.github.com/egardner/efd34f270cc33db67c0246e837689cb9
function deepEqual(obj1, obj2) {
    if (obj1 === obj2) {
        return true;
    } else if (_isObject(obj1) && _isObject(obj2)) {
        if (Object.keys(obj1).length !== Object.keys(obj2).length) {
            return false;
        }
        for (const prop in obj1) {
            if (!deepEqual(obj1[prop], obj2[prop])) {
                return false;
            }
        }
        return true;
    }

    function _isObject(obj) {
        return typeof obj === 'object' && obj != null;
    }
}

function allEqual(ar) {
    if (ar.length <= 1) return false;

    return ar.every(el => deepEqual(el, ar[0]));
}

function copyContent(el) {
    const content = el.target.getAttribute('data-content');
    navigator.clipboard.writeText(content);
}

function chunkName(url) {
    // Chunk name as in https://example.com/foo/bar/main.1930af.chunk.js
    let m = /\/([0-9a-z]+)\.[^.]*\.chunk\.js/.exec(url);
    if (m) return m[1];

    // basename
    m = /\/([^/]+)(?:[?#]|$)/.exec(url);
    if (m) return m[1];

    return url;
}

function render(state) {
    const titleEl = document.querySelector('title');
    empty(titleEl);
    const hostname = (new URL(state.url)).hostname;
    titleEl.appendChild(document.createTextNode(`Chunk Tester ${hostname}`));

    const main = document.querySelector('main');
    empty(main);

    const h1 = el(main, 'h1', {}, 'Chunk tester for ');
    el(h1, 'a', {href: state.url}, hostname);

    const allServers = [];
    for (const run of state.runs) {
        for (const server of Object.keys(run.results)) {
            if (!allServers.includes(server) && server !== 'error') {
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
        const timeTd = el(tr, 'td', {
            style: 'vertical-align: top;color:#888;',
        });
        el(timeTd, 'div', {}, formatTime(run.firstFinished));
        if (run.firstFinished !== run.lastFinished) {
            el(timeTd, 'div', {}, formatTime(run.lastFinished));
        }

        if (run.results.error) {
            el(tr, 'td', {colspan: allServers.length, 'class': 'error'}, run.results.error.message);
            continue;
        }
        const runResults = Object.values(run.results);
        const allSame = runResults.length === allServers.length && allEqual(runResults);
        const usedServers = allSame ? [allServers[0]] : allServers;
        const serverAttrs = allSame ? {colspan: allServers.length, style: 'text-align:center;'} : {};

        for (const s of usedServers) {
            const serverResult = run.results[s];
            const td = el(tr, 'td', serverAttrs);
            if (! serverResult) {
                el(td, 'div', {style: 'color: #404;'}, 'IP not tested');
                continue;
            }

            if (serverResult.htmlError) {
                el(td, 'div', {'class': 'error'}, serverResult.htmlError);
            } else {
                el(td, 'div', {}, 'HTML ');
                el(
                    td, 'a', {href: `#version-${serverResult.htmlHash}`, 'class': 'invisible-link'},
                    formatHash(serverResult.htmlHash));
            }
        }

        // JavaScript versions per server
        for (const versionHash of run.knownVersions) {
            const v = state.versions.find(version => version.htmlHash === versionHash);

            const tr = el(tbody, 'tr');
            el(tr, 'td', {style: 'text-align: right'}, formatHash(v.htmlHash));

            for (const s of usedServers) {
                const serverResult = run.results[s];
                const td = el(tr, 'td', serverAttrs);
                if (! serverResult) {
                    continue;
                }

                const versionOk = v.jsURLs.every(jsURL => {
                    const fileResult = serverResult.jsStatus[jsURL];
                    return fileResult && !fileResult.errcode;
                });

                if (versionOk) {
                    el(td, 'div', {
                        style: 'color: #004400;',
                    }, '✔');
                } else if (allEqual(v.jsURLs.map(jsURL => serverResult.jsStatus[jsURL].errcode))) {
                    el(
                        td, 'div', {style: 'color: #cc0000;'},
                        `All chunks: ${serverResult.jsStatus[v.jsURLs[0]].errcode}`);
                } else {
                    const errorsContainer = el(td, 'div');
                    for (const jsURL of v.jsURLs) {
                        const fileResult = serverResult.jsStatus[jsURL];
                        const li = el(
                            errorsContainer, 'div', {style: 'display:inline-block; margin-right:.8em;'});
                        el(li, 'a', {href: jsURL, 'class': 'chunk-link'}, chunkName(jsURL));
                        const errCode = fileResult ? fileResult.errcode : 'not downloaded';
                        el(li, 'span', {
                            style: `color: ${errCode ? '#cc0000' : '#004400'}`,
                        }, errCode || '✔');
                        if (errCode === 'changed-hash') {
                            const expectedLink = el(
                                li, 'td',
                                {'data-content': fileResult.expectedContent, 'class': 'copy-link'},
                                '📋Expected');
                            expectedLink.addEventListener('click', copyContent);
                            const actualLink = el(
                                li, 'td',
                                {'data-content': fileResult.gotContent, 'class': 'copy-link'},
                                '📋Actual');
                            actualLink.addEventListener('click', copyContent);
                        }
                    }
                }
            }
        }
    }

    el(main, 'h2', {}, 'All Versions');
    const versionsTable = el(main, 'table');
    const versionsTbody = el(versionsTable, 'tbody');
    for (const v of state.versions) {
        const tr = el(versionsTbody, 'tr', {id: `version-${v.htmlHash}`});
        el(tr, 'th', {title: v.htmlHash}, formatHash(v.htmlHash));
        const copyLink = el(tr, 'td', {'data-content': v.html, 'class': 'copy-link'}, '📋Copy HTML');
        copyLink.addEventListener('click', copyContent);
        el(tr, 'td', {}, `${formatTime(v.firstSeen)} - ${formatTime(v.lastSeen)}`);
        const chunksTd = el(tr, 'td', {}, 'Chunks: ');
        for (const url of v.jsURLs) {
            el(chunksTd, 'a', {href: url, 'class': 'chunk-link'}, chunkName(url));
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch(window.location.pathname + 'state');
    if (res.status !== 200) {
        alert(`Failed retrieving data with ${res.status} - check server`);
        return;
    }
    render(await res.json());
});
