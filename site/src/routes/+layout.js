// Prerender every page at build time. The 3D twin and the system graph
// use browser-only APIs (canvas, three.js), but we guard those with an
// `if (browser)` check so they're skipped during SSR.
export const prerender = true;
