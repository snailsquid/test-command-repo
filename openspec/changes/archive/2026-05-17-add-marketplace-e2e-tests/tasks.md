## 1. Create E2E marketplace API tests

- [x] 1.1 Create e2e/marketplace-api.spec.ts file
- [x] 1.2 Add test: POST /developer/commands - successful registration
- [x] 1.3 Add test: POST /developer/commands - duplicate slug error
- [x] 1.4 Add test: POST /developer/commands - invalid repo URL error
- [x] 1.5 Add test: POST /developer/commands - missing fields error
- [x] 1.6 Add test: GET /developer/commands - returns developer's commands
- [x] 1.7 Add test: GET /developer/commands - empty for new developer
- [x] 1.8 Add test: GET /api/commands - returns all active commands
- [x] 1.9 Add test: GET /api/commands?q= - search functionality
- [x] 1.10 Add test: GET /api/commands/:id - single command retrieval
- [x] 1.11 Add test: PUT /developer/commands/:id - successful update
- [x] 1.12 Add test: PUT /developer/commands/:id - unauthorized (other dev)
- [x] 1.13 Add test: POST /commands/:id/disable - disable command
- [x] 1.14 Add test: POST /commands/:id/enable - enable command

## 2. Create marketplace handler integration tests

- [x] 2.1 Create test/integration/marketplace-handler.test.ts file
- [x] 2.2 Add test: showPage returns first page with commands
- [x] 2.3 Add test: showPage handles empty marketplace
- [x] 2.4 Add test: showPage pagination calculates correctly
- [x] 2.5 Add test: showPage marks installed commands
- [x] 2.6 Add test: handleResponse "n" navigates to next page
- [x] 2.7 Add test: handleResponse "n" on last page shows message
- [x] 2.8 Add test: handleResponse "p" navigates to previous page
- [x] 2.9 Add test: handleResponse "p" on first page shows message
- [x] 2.10 Add test: handleResponse number selects and installs command
- [x] 2.11 Add test: handleResponse already installed shows message
- [x] 2.12 Add test: handleResponse invalid number shows error
- [x] 2.13 Add test: handleResponse collision shows replacement options
- [x] 2.14 Add test: handleResponse "replace" option works
- [x] 2.15 Add test: handleResponse "new" option works
- [x] 2.16 Add test: handleResponse invalid collision response shows error
- [x] 2.17 Add test: buildInitialState creates correct state

## 3. Create router integration tests

- [x] 3.1 Create test/integration/router.test.ts file
- [x] 3.2 Add test: parseCommand parses basic command
- [x] 3.3 Add test: parseCommand parses command with arguments
- [x] 3.4 Add test: parseCommand returns null for non-command
- [x] 3.5 Add test: parseCommand returns null for empty command
- [x] 3.6 Add test: parseCommand matches longest slug first
- [x] 3.7 Add test: parseCommand case insensitive matching
- [x] 3.8 Add test: startFlow creates flow in database
- [x] 3.9 Add test: getActiveFlow returns current flow
- [x] 3.10 Add test: getActiveFlow returns null for no active flow
- [x] 3.11 Add test: updateFlow modifies flow state and data
- [x] 3.12 Add test: endFlow deletes flow
- [x] 3.13 Add test: isInFlow checks if user in active flow
- [x] 3.14 Add test: isInFlow returns false for no flow
- [x] 3.15 Add test: handleIncomingMessage routes to system command
- [x] 3.16 Add test: handleIncomingMessage routes to installed command
- [x] 3.17 Add test: handleIncomingMessage shows "not installed" for unknown
- [x] 3.18 Add test: handleIncomingMessage handles errors gracefully

## 4. Run and verify tests

- [x] 4.1 Run bun test to verify integration tests pass (has known db isolation issue - services use global db)
- [x] 4.2 Run playwright test to verify E2E tests pass
- [x] 4.3 Fix any failing tests
- [x] 4.4 Verify test coverage meets requirements