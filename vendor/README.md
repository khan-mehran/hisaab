# Vendored packages

## braces 3.0.3-patched.1

`braces` <= 3.0.3 is affected by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
(stack exhaustion from deeply nested patterns) and no fixed release exists.
It reaches this project only through dev tooling:
`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`.

- `braces/` is braces 3.0.3 with one change in `lib/parse.js`: patterns nested
  deeper than 100 levels throw a `SyntaxError` while parsing, before the
  recursive walkers run. Normal patterns expand exactly as before.
- `braces-3.0.3-patched.1.tgz` is that folder packed with `npm pack`. It is
  what gets installed.
- `package.json` lists the tarball as a dev dependency and overrides every
  `braces` with it (`"overrides": { "braces": "$braces" }`). npm resolves a
  relative `file:` path in `overrides` from the dependent package's folder, so
  the `$braces` reference is needed.

To change the patch: edit `braces/`, run `npm pack --pack-destination ..`
inside it, then `npm install`.

Remove this folder, the dev dependency and the override once an official fixed
version of braces is published.
