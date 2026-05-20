## ADDED Requirements

### Requirement: Command registration from GitHub
The system SHALL allow developers to register commands by providing a GitHub repository URL.

#### Scenario: Register new command
- **WHEN** a developer submits a GitHub repo URL with a valid command export
- **THEN** the system SHALL fetch the repository, validate the command structure, and add it to the marketplace

### Requirement: Command ID model
The system SHALL identify commands by developer-username/slug (e.g., `alice/remind-me`). Slugs are freeform and trimmed of trailing spaces.

#### Scenario: Command registered
- **WHEN** a command is successfully registered
- **THEN** the system SHALL store: developer-username/slug, name, description, usage string, GitHub URL, entry point, developer ID, creation timestamp

#### Scenario: Freeform slug
- **WHEN** a developer registers a command with slug "remind me"
- **THEN** the system SHALL accept it and trim trailing spaces to "remind me"

### Requirement: Command code caching
The system SHALL cache fetched command code locally to avoid repeated GitHub fetches.

#### Scenario: Command code cached
- **WHEN** a command is executed for the first time
- **THEN** the system SHALL fetch from GitHub and cache locally
- **THEN** subsequent executions SHALL use the cached version

### Requirement: Cache refresh
The system SHALL periodically refresh cached command code from GitHub.

#### Scenario: Periodic refresh
- **WHEN** 1 hour has passed since last fetch
- **THEN** the system SHALL re-fetch the command code from GitHub and update the cache

### Requirement: Command validation
The system SHALL validate that a fetched command exports the expected structure before registering it.

#### Scenario: Valid command export
- **WHEN** the fetched code exports an object with `name`, `description`, `usage`, and `handle` function
- **THEN** the system SHALL accept the command

#### Scenario: Invalid command export
- **WHEN** the fetched code does not export a valid command structure
- **THEN** the system SHALL reject registration with an error message

### Requirement: Slug uniqueness per developer
The system SHALL enforce that command slugs are unique per developer (not globally). Multiple developers CAN have commands with the same slug.

#### Scenario: Duplicate slug from same developer
- **WHEN** a developer tries to register a command with a slug they already own
- **THEN** the system SHALL reject the registration

#### Scenario: Same slug from different developers
- **WHEN** developer Alice registers "say" and developer Bob also registers "say"
- **THEN** both commands SHALL exist in the marketplace as `alice/say` and `bob/say`
