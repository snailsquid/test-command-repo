## Why

Currently, developers must create a separate GitHub repository for each command they want to publish to the marketplace. This creates friction - developers with multiple related commands (e.g., a utility library with weather, news, and reminders) must manage multiple repos just to publish commands. This change enables developers to publish multiple commands from a single repository using a manifest file.

## What Changes

- Add support for `akka.yaml` manifest file in developer repositories
- Replace single-command registration with repository-based registration
- Update command schema to include `repoUrl` and `manifestVersion`
- Change slug uniqueness from per-developer to per-repository
- Update marketplace display to show command slug, description, and repository info
- Add repository refresh endpoint to sync commands from manifest
- Auto-disable commands that are removed from the manifest
- Add repo name to marketplace search

## Capabilities

### New Capabilities

- `repo-manifest-commands`: Enable developers to publish multiple commands from a single repository using `akka.yaml` manifest file

### Modified Capabilities

- `marketplace-display`: Update marketplace to show repository info alongside each command
- `command-registration`: Replace single-command registration API with repository-based registration

## Impact

- **Backend**: `src/commands/registry.ts`, `src/developer/routes.ts`, `src/db/schema.ts`
- **Frontend**: `developer-ui/src/pages/Dashboard.tsx`, `developer-ui/src/components/CommandList.tsx`
- **Database**: Add `repoUrl` and `manifestVersion` columns to commands table, add unique index on `(repoUrl, slug)`
- **Breaking**: Wipe existing commands on migration; old API with `entryPoint` no longer supported