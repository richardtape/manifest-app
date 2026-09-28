Copied 2026-09-27 from manifest@3c38199 (docs/superpowers/design/system).

- `bundle.js` and `index.d.ts` are NEVER EDITED: `src/parity.test.tsx` renders `bundle.js` and
  requires our ports' markup to be the same.
- The stylesheets were here too. Since F1 sitting 5 (Rich: "fix it at source … we control
  the whole plane") they are ours, in `src/tokens.css` and `src/components.css`, and are
  changed there, each change with its reason.
