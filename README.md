# Chunk tester

A Single Page Application (SPA) serves the same (or very similar) HTML for all URLs. The served HTML is just a very minimal page without content, and references JavaScript files.

For performance reasons, the whole JavaScript code of an SPA is usually split into multiple *chunks*. Upon load, only the minimum necessary chunks are loaded. When the user navigates to a page or view which requires additional chunks, these chunks are loaded only then.

This speeds up initial load times, but introduces a different problem: When we deploy a new version of the SPA, users who had the old chunk data.


