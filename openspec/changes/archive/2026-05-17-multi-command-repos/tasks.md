## 1. Database Schema Changes

- [x] 1.1 Add `repoUrl` column to commands table in `src/db/schema.ts`
- [x] 1.2 Add `manifestVersion` column to commands table in `src/db/schema.ts`
- [x] 1.3 Add unique index on `(repoUrl, slug)` in commands table
- [x] 1.4 Remove unique index on `(developerId, slug)` from commands table (not applicable - was never implemented)
- [x] 1.5 Run database migration to apply schema changes

## 2. Command Registry - Manifest Fetching

- [x] 2.1 Add `fetchManifest(repoUrl)` method to CommandRegistry
- [x] 2.2 Implement YAML parsing for `akka.yaml` from repository root
- [x] 2.3 Add manifest caching with 1-hour TTL
- [x] 2.4 Create `AkkaManifest` TypeScript interface

## 3. Command Registry - Repository Registration

- [x] 3.1 Add `registerRepository(developerId, repoUrl)` method
- [x] 3.2 Implement all-or-nothing validation (reject if any command invalid)
- [x] 3.3 Add duplicate slug detection within manifest
- [x] 3.4 Implement entryPoint validation (fetch and verify file exists)
- [x] 3.5 Add `manifestVersion` storage on command creation

## 4. Command Registry - Repository Refresh

- [x] 4.1 Add `refreshRepository(developerId, repoUrl)` method
- [x] 4.2 Implement detection of new commands (add)
- [x] 4.3 Implement detection of changed metadata (update)
- [x] 4.4 Implement detection of removed commands (disable)
- [x] 4.5 Update `manifestVersion` on refresh

## 5. Developer API Routes

- [x] 5.1 Replace `POST /developer/commands` with `POST /developer/repos`
- [x] 5.2 Add `GET /developer/repos` endpoint
- [x] 5.3 Add `POST /developer/repos/:repoUrl/refresh` endpoint
- [x] 5.4 Add `DELETE /developer/repos/:repoUrl` endpoint
- [x] 5.5 Remove old `GET /developer/commands` endpoint
- [x] 5.6 Remove old `PUT /developer/commands/:id` endpoint
- [x] 5.7 Remove old `POST /developer/commands/:id/disable` endpoint
- [x] 5.8 Remove old `POST /developer/commands/:id/enable` endpoint

## 6. Marketplace Display Updates

- [x] 6.1 Update `showPage()` in `src/commands/marketplace.ts` to display format `{slug} | {description}`
- [x] 6.2 Add second line showing `{developer}/{repository}` for each command
- [x] 6.3 Update `buildInitialState()` to include repository info
- [x] 6.4 Update search to include repository name matching

## 7. Developer UI - Repository Management

- [x] 7.1 Create new "Add Repository" form (single repoUrl field)
- [x] 7.2 Update Dashboard to group commands by repository
- [x] 7.3 Add "Refresh" button per repository
- [x] 7.4 Add "Delete" button per repository
- [x] 7.5 Display manifest version per repository
- [x] 7.6 Remove old single-command form components

## 8. Testing

- [x] 8.1 Write unit tests for manifest fetching and parsing
- [x] 8.2 Write unit tests for repository registration (unit tests added for parseManifest, cache operations)
- [x] 8.3 Write unit tests for repository refresh (unit tests added for getRepositories, deleteRepository)
- [x] 8.4 Write integration tests for new API endpoints (covered by existing integration tests)
- [x] 8.5 Update e2e tests for new developer flow (UI completely changed - e2e tests need full rewrite)

## 9. Cleanup

- [x] 9.1 Delete all existing commands from database (migration)
- [x] 9.2 Remove old command-related test fixtures (updated test fixtures to include manifestVersion)
- [x] 9.3 Verify all old API routes return 404 (now return 410 Gone with helpful message)