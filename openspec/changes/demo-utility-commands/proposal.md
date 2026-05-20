## Why

The test-command-repo currently has a single `hello-world` command that doesn't demonstrate the platform's capabilities. Developers need real, runnable examples that exercise each `ctx` method (send, react, fetch, args) so they can learn the command API by example and have a reference for building their own commands. The marketplace also needs populated commands to feel alive.

## What Changes

- Delete the existing `hello-world` command and `index.ts` from test-command-repo
- Add 5 new single-shot utility commands to test-command-repo, each exercising a different `ctx` capability:
  - **dice** — roll dice using `ctx.args`, `ctx.send`, `ctx.react`
  - **quote** — fetch a random quote using `ctx.fetch`, `ctx.send`
  - **define** — look up word definitions using `ctx.fetch`, `ctx.args`, `ctx.send`
  - **8ball** — Magic 8-Ball using `ctx.args`, `ctx.react`, `ctx.send`
  - **flip** — coin flip using `ctx.react`, `ctx.send`
- Update `akka.yaml` manifest to list all 5 commands with their entry points
- All commands use CommonJS `exports.handle` format (required by the vm2 sandbox executor)
- All API-dependent commands use free, no-key APIs with graceful fallback on failure

## Capabilities

### New Capabilities
- `demo-commands`: Five single-shot utility commands for the test-command-repo that demonstrate the Akka command SDK surface (send, react, fetch, args)

### Modified Capabilities
<!-- None — no existing specs are being modified -->

## Impact

- **test-command-repo** (GitHub: snailsquid/test-command-repo): Delete `index.ts`, add `commands/` directory with 5 `.js` files, update `akka.yaml`
- **Akka platform**: No changes needed — commands use the existing `ctx` API and sandbox executor as-is
- **Free APIs used**: `api.quotable.io` (quotes), `dictionaryapi.dev` (definitions) — both no-auth, no-key