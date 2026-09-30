/**
 * WHICH PLATFORM OUR SERVER ANSWERS FROM (F5 Task 3): vite.config.ts defines it from our
 * server's MANIFEST_APP_MODE, in the same process. Anything but 'mock', or nothing (Vitest,
 * which does not read that file), is edge: the banner is mock mode's alone. In our dev server
 * Vite sets it as a global (`/@vite/env`, loaded by `/@vite/client` before the page); a build
 * writes it in place.
 */
export type Mode = 'mock' | 'edge'

export const mode: Mode =
  typeof __MANIFEST_APP_MODE__ !== 'undefined' && __MANIFEST_APP_MODE__ === 'mock'
    ? 'mock'
    : 'edge'
