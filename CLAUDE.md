# deja-vu — repo card

> A map, not a manual. Keep it ~1 screen; point to detail, don't inline it.

## What it is

`@mixmaxhq/deja-vu` — a small Redis-backed dedup library that filters out duplicate event receipts. You register per-type handlers (prefix, id/timestamp/val extractors, timeLimit, ttl); `inspectEvent(type, eve)` returns `true` the first time an event is seen (marking it in Redis with `SETEX`) and `false` for duplicates or events older than the timeLimit.

## serves

role: Redis dedup / dup-event filter — `DejaVu` class with `registerHandler(type, handler)` and `async inspectEvent(type, eve)`; caller supplies the `redisConnection`.
referenced-by: [rule-distribution]

## Code map

- Library (single file) -> index.js
- Tests -> spec/indexSpec.js
- Jasmine config -> spec/support/jasmine.json

## Conventions

- Package manager: npm (package-lock.json, lockfileVersion 2). No `packageManager` field.
- Test framework: Jasmine (`npm test` -> `jasmine`).
- Lint: ESLint (`npm run lint`; `npm run ci` runs lint only, no tests in CI).
- Build: none (plain CommonJS, `main: index.js`).
- CI/publish: Jenkins `npmModulePipeline` (Jenkinsfile) — publishes `@mixmaxhq/deja-vu` to npm.

## Run / test

- `npm install`
- `npm test` — Jasmine specs
- `npm run lint` — ESLint

## Load the matching domain card

- Cross-cutting library — load the consuming capability's card, not a domain-* for this repo.
