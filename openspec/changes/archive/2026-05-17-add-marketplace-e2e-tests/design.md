## Context

The marketplace is the core feature connecting developers who create commands with users who discover and install them via WhatsApp. The current test coverage includes:
- E2E tests for admin and developer dashboard UIs
- Unit tests for individual components (registry, system commands, scheduler)

Missing:
- E2E tests for marketplace REST API
- Integration tests for marketplace conversation flow handler
- Integration tests for router (command parsing, flow management)

## Goals / Non-Goals

**Goals:**
- Add E2E tests for marketplace REST API endpoints
- Add integration tests for marketplace handler (showPage, handleResponse)
- Add integration tests for router (parseCommand, flow management)
- Ensure tests cover the full user journey: developer registers → appears in marketplace → user installs → user runs

**Non-Goals:**
- Frontend component tests (separate initiative)
- Security penetration testing
- Performance/load testing
- Visual regression testing

## Decisions

### 1. Test Strategy: Split REST API + Unit Tests

**Decision:** Test the marketplace user journey through two layers:
- E2E (Playwright): REST API endpoints and DB verification
- Integration (bun:test): Direct function calls with mocked dependencies

**Rationale:** Full WhatsApp webhook simulation is complex because messages go to WAHA (external). The split approach covers the same user journey but is more maintainable.

**Alternative considered:** Full webhook simulation - would require mocking WahaClient at server level, adds complexity with limited additional coverage.

### 2. Test File Organization

**Decision:** Create separate test files:
- `e2e/marketplace-api.spec.ts` - Playwright E2E tests
- `test/integration/marketplace-handler.test.ts` - bun:test for handler
- `test/integration/router.test.ts` - bun:test for router

**Rationale:** Follows existing pattern (e2e/ for Playwright, test/ for bun:test). Separation of concerns between E2E and unit tests.

### 3. Test Data Approach

**Decision:** Use existing test utilities (test-db.ts, mocks.ts) and create test data inline in each test file.

**Rationale:** Existing utilities handle test DB creation/cleanup. Inline data makes tests self-documenting and easier to understand.

### 4. Mocking Strategy

**Decision:** Use MockWahaClient for router tests, direct function calls for handler tests.

**Rationale:** MockWahaClient already exists and works well. Handler tests don't need WahaClient since they test the logic layer only.

## Risks / Trade-offs

- [Risk] Tests may break when DB schema changes → [Mitigation] Use migrations for schema changes, update tests in same PR
- [Risk] Handler tests may drift from actual behavior if implementation changes → [Mitigation] Keep handler tests focused on pure logic, not implementation details
- [Risk] E2E tests may be slow → [Mitigation] Keep tests independent, use parallel execution where possible