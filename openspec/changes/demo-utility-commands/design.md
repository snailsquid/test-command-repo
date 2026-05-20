## Context

The Akka platform executes community-submitted commands in a vm2 sandbox. Commands are fetched from GitHub repos via `akka.yaml` manifests and executed with a frozen `CommandContext` (`ctx`) object. The test-command-repo (`snailsquid/test-command-repo`) currently has one trivial `hello-world` command that doesn't demonstrate the platform's capabilities.

The sandbox executor wraps source code as CommonJS:
```javascript
const exports = {};
new Function('exports', 'module', 'ctx', source)(exports, module, ctx);
const handler = exports.handle || module.exports?.handle;
await handler(ctx);
```

Commands must use `exports.handle = async function(ctx) { ... }` — ESM `export` syntax will not work.

The `ctx` API surface available to commands:
- `ctx.send(text)` — Send a WhatsApp message
- `ctx.react(emoji)` — React to the user's message
- `ctx.fetch(url, options?)` — HTTP requests (proxied through Bun's fetch)
- `ctx.schedule(duration, callback)` — **Currently stubbed** (no-op)
- `ctx.userId` — Anonymized user ID
- `ctx.args` — Parsed arguments after the command slug
- `ctx.message` — Full message text
- `ctx.contactId` — Contact ID

## Goals / Non-Goals

**Goals:**
- Provide 5 single-shot utility commands that each exercise a distinct `ctx` capability
- Use only free, no-auth, no-key APIs so commands work out of the box
- Follow the CommonJS `exports.handle` format required by the sandbox
- Serve as reference implementations for developers building their own commands
- Keep each command self-contained in a single `.js` file with no dependencies

**Non-Goals:**
- Multi-turn conversation flows (sandbox commands cannot access the flow system)
- `ctx.schedule()` demonstrations (currently stubbed in the platform)
- API-key-requiring services
- TypeScript source files (the sandbox executes raw JS)
- Changes to the Akka platform itself

## Decisions

### 1. CommonJS `exports.handle` format
**Decision**: All commands use `exports.handle = async function(ctx) { ... }`  
**Rationale**: The vm2 sandbox executor resolves handlers via `exports.handle || module.exports?.handle`. ESM `export` syntax is not supported. Plain `.js` files avoid any build step.

### 2. Separate files per command under `commands/` directory
**Decision**: Each command gets its own file: `commands/dice.js`, `commands/quote.js`, etc.  
**Rationale**: The `akka.yaml` manifest maps each command to an `entryPoint` path. Separate files keep commands isolated, easy to understand, and individually fetchable. A `commands/` subdirectory keeps the repo root clean.

### 3. Free API selection
**Decision**:  
- **quote**: `https://api.quotable.io/random` — returns `{ content, author }`  
- **define**: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}` — returns array with definitions  
**Rationale**: Both are free, no-auth, CORS-friendly, and have been stable for years. No API keys needed.

### 4. Graceful error handling in every command
**Decision**: Every command wraps `ctx.fetch` calls in try/catch and sends a user-friendly fallback message on failure.  
**Rationale**: External APIs can fail. The sandbox has a 5-second timeout. A command that crashes silently or throws an unhelpful error is worse than one that says "Could not fetch a quote right now. Try again later."

### 5. Delete `index.ts` and old `hello-world` command
**Decision**: Remove the existing single-command setup entirely.  
**Rationale**: The old `index.ts` uses `export const command = { ... }` which doesn't match the sandbox's CommonJS resolution. Starting fresh with the correct format avoids confusion.

## Risks / Trade-offs

- **[API availability]** → quotable.io or dictionaryapi.dev could go down or change response format. Mitigation: try/catch with fallback messages. Commands degrade gracefully rather than crashing.
- **[Sandbox timeout]** → The executor has a 5-second timeout. API calls that take longer will be killed. Mitigation: both APIs are typically fast (<1s). The `fetch` proxy goes through Bun's native fetch which is efficient.
- **[No rate limiting]** → Free APIs may rate-limit heavy usage. Mitigation: these are demo commands, not production tools. Acceptable trade-off for zero-config.