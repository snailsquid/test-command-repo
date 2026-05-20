## Context

### Background
Currently, developers register commands one at a time via `POST /developer/commands` with fields: `slug`, `name`, `description`, `usage`, `repoUrl`, `entryPoint`. Each command fetches a single file from the repository.

### Current State
- `src/developer/routes.ts:45-64` - Single command registration endpoint
- `src/commands/registry.ts:160-209` - `registerCommand()` fetches one entryPoint file
- `src/db/schema.ts:52-67` - Commands table with `slug` unique per developerId

### Constraints
- GitHub API rate limits apply to manifest fetching
- All commands in a manifest must be valid - partial insertion not allowed
- Slug uniqueness changes from per-developer to per-repository

### Stakeholders
- Developers publishing commands to marketplace
- End users installing commands from marketplace

## Goals / Non-Goals

**Goals:**
- Enable developers to publish multiple commands from a single repository
- Use `akka.yaml` manifest file format (YAML, Option B with full metadata)
- Auto-disable commands removed from manifest on refresh
- Update marketplace display to show repository info
- Add repository name to marketplace search

**Non-Goals:**
- Support old single-command API (backward compatibility)
- Support non-YAML manifest formats
- Support commands without manifest (single entryPoint registration)

## Decisions

### 1. Manifest Format: akka.yaml with Full Metadata (Option B)

**Decision:** Use `akka.yaml` in repository root with full command metadata in the manifest.

**Rationale:** Option B puts all metadata in the manifest, so the system only needs to fetch one file to get all command info. Each command's `entryPoint` points to the code to execute.

**Alternative Considered:**
- Option A (simple array): Required fetching each entryPoint file to get metadata - more API calls
- Option C (hybrid): More complex - manifest has slugs but files have metadata

### 2. All-or-Nothing Validation

**Decision:** If any command in the manifest is invalid (missing entryPoint, invalid slug, etc.), reject the entire repository registration.

**Rationale:** Prevents partial state where some commands are registered and others aren't. Developer must fix all issues before any commands appear in marketplace.

**Alternative Considered:**
- Insert valid commands, report errors for invalid ones: Rejected - leads to inconsistent state

### 3. Slug Uniqueness: Per Repository

**Decision:** Slug must be unique within a repository, not across the entire developer account.

**Rationale:** Multiple commands from same repo share the manifest - having unique slugs per repo makes sense. Two different repos can have the same slug (e.g., `weather` in both `user/utils` and `org/tools`).

**Alternative Considered:**
- Global uniqueness: Would force developers to use unique slugs across all their repos - unnecessary constraint

### 4. Auto-Disable on Refresh

**Decision:** When refreshing a repository, commands in the database but not in the manifest are disabled (not deleted).

**Rationale:** Preserves installation data for removed commands. Developer can manually delete if needed.

**Alternative Considered:**
- Delete removed commands: Too destructive, breaks user installations
- Leave as-is: Commands that no longer exist would remain active - confusing

### 5. Caching to Avoid Rate Limits

**Decision:** Cache the manifest fetch with a reasonable TTL to avoid hitting GitHub API limits.

**Rationale:** GitHub API has rate limits (60 requests/hour for unauthenticated). Caching prevents repeated fetches during development.

**Alternative Considered:**
- No caching: Would hit rate limits quickly during development

## Risks / Trade-offs

- **[Risk] GitHub API rate limits** → Mitigation: Cache manifests with 1-hour TTL, use GitHub token if available
- **[Risk] Invalid manifest format** → Mitigation: Validate YAML structure before processing, clear error messages
- **[Risk] Large manifest with many commands** → Mitigation: No explicit limit, but warn if >50 commands
- **[Risk] Marketplace display gets cluttered** → Mitigation: Keep second line small/secondary text

## Migration Plan

1. **Deploy new backend** with schema changes and new API endpoints
2. **Wipe existing commands** from database (acceptable per requirements)
3. **Deploy new developer UI** with repository-based command management
4. **Deploy marketplace changes** with updated display format
5. **Monitor** for any issues with manifest parsing or GitHub API calls

## Open Questions

- Should we support a GitHub token for higher API rate limits? (Not in initial scope)
- How to handle manifest version comparison - string equality or semantic versioning? (String equality for v1)