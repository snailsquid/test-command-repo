## 1. Repository Setup

- [x] 1.1 Delete `index.ts` from test-command-repo (old hello-world command)
- [x] 1.2 Create `commands/` directory in test-command-repo

## 2. Command Implementation

- [x] 2.1 Create `commands/dice.js` — dice roll command with NdS notation parsing, ctx.react, ctx.send
- [x] 2.2 Create `commands/quote.js` — random quote from quotable.io with ctx.fetch and error fallback
- [x] 2.3 Create `commands/define.js` — word definition from dictionaryapi.dev with ctx.fetch, ctx.args, and error fallback
- [x] 2.4 Create `commands/8ball.js` — Magic 8-Ball with ctx.react, ctx.args, random response selection
- [x] 2.5 Create `commands/flip.js` — coin flip with ctx.react, ctx.send, random heads/tails

## 3. Manifest Update

- [x] 3.1 Update `akka.yaml` to list all 5 commands with slugs, names, descriptions, usage strings, and entry points pointing to `commands/<slug>.js`

## 4. Verification

- [x] 4.1 Push all changes to test-command-repo on GitHub
- [x] 4.2 Verify manifest fetch and command registration works via the Akka platform