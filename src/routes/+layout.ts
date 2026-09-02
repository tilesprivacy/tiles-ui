// Client-rendered only. Several dependencies (pdf.js among them) touch browser
// globals at import time, and there is no server to render against anyway.
export const ssr = false;
