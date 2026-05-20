## Why

The codebase has E2E tests for admin and developer dashboards, but lacks comprehensive tests for the marketplace user journey. The marketplace is the core feature where users discover, install, and run commands via WhatsApp. Without tests, we risk breaking this critical flow during refactoring or new feature development.

## What Changes

- Add `e2e/marketplace-api.spec.ts` - REST API tests for marketplace (command registration, listing, search)
- Add `test/integration/marketplace-handler.test.ts` - Unit tests for marketplace conversation flow logic
- Add `test/integration/router.test.ts` - Unit tests for message routing and flow management
- Expand existing E2E tests with more user journey scenarios

## Capabilities

### New Capabilities
- `marketplace-api-tests`: E2E tests covering the REST API side of marketplace (developer registers command, command appears in marketplace API)
- `marketplace-handler-tests`: Integration tests for marketplace showPage and handleResponse functions
- `router-tests`: Integration tests for command parsing and conversation flow management

### Modified Capabilities
- (none - no existing spec-level behavior changes)

## Impact

- New test files in `e2e/` and `test/integration/` directories
- No changes to production code
- Uses existing test infrastructure (bun:test, Playwright)