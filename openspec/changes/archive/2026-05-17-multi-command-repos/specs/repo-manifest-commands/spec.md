## ADDED Requirements

### Requirement: Developer can register a repository with multiple commands

The system SHALL allow developers to register a GitHub repository by providing only the repository URL. The system SHALL fetch the `akka.yaml` manifest file from the repository root and register all commands defined in the manifest.

#### Scenario: Successful repository registration with valid manifest
- **WHEN** developer calls `POST /developer/repos` with `{ "repoUrl": "https://github.com/user/repo" }`
- **AND** the repository contains a valid `akka.yaml` with 3 commands
- **THEN** system SHALL create 3 command records in the database
- **AND** system SHALL store the manifest version in each command record
- **AND** system SHALL return `{ "success": true, "commands": [...] }` with all 3 commands

#### Scenario: Repository registration fails due to invalid manifest
- **WHEN** developer calls `POST /developer/repos` with a valid repoUrl
- **AND** the repository contains an `akka.yaml` but one command has a missing entryPoint
- **THEN** system SHALL reject the entire registration
- **AND** system SHALL NOT create any command records
- **AND** system SHALL return an error describing which command(s) failed validation

#### Scenario: Repository registration fails due to missing manifest
- **WHEN** developer calls `POST /developer/repos` with a repoUrl
- **AND** the repository does not contain an `akka.yaml` file
- **THEN** system SHALL return an error "Manifest file 'akka.yaml' not found in repository"

### Requirement: Developer can refresh a registered repository

The system SHALL allow developers to refresh a registered repository to sync commands from an updated manifest. The refresh SHALL add new commands, update changed commands, and disable removed commands.

#### Scenario: Refresh adds new commands from manifest
- **WHEN** developer calls `POST /developer/repos/{repoUrl}/refresh`
- **AND** the current manifest has 5 commands but database has 3
- **THEN** system SHALL add the 2 new commands to the database
- **AND** system SHALL update the manifestVersion for all commands

#### Scenario: Refresh updates changed commands
- **WHEN** developer calls `POST /developer/repos/{repoUrl}/refresh`
- **AND** a command's metadata (name, description, usage) has changed in the manifest
- **THEN** system SHALL update the command's metadata in the database

#### Scenario: Refresh disables removed commands
- **WHEN** developer calls `POST /developer/repos/{repoUrl}/refresh`
- **AND** the current manifest has 2 commands but database has 5
- **THEN** system SHALL disable the 3 commands that are no longer in the manifest
- **AND** system SHALL NOT delete the command records

### Requirement: Developer can view repositories and their commands

The system SHALL provide an endpoint to list all registered repositories with their commands grouped by repository.

#### Scenario: List all repositories with commands
- **WHEN** developer calls `GET /developer/repos`
- **THEN** system SHALL return a list of repositories
- **AND** each repository SHALL include its commands

### Requirement: Developer can delete a repository

The system SHALL allow developers to delete a repository, which removes all associated commands from the database.

#### Scenario: Delete repository removes all its commands
- **WHEN** developer calls `DELETE /developer/repos/{repoUrl}`
- **THEN** system SHALL delete all commands associated with that repository
- **AND** system SHALL return `{ "success": true }`

### Requirement: Slug uniqueness is per-repository

The system SHALL allow the same slug to exist in different repositories. Slug uniqueness is enforced within a single repository.

#### Scenario: Same slug in different repositories is allowed
- **WHEN** developer registers repo A with command slug "weather"
- **AND** developer registers a different repo B with command slug "weather"
- **THEN** system SHALL allow both commands to exist

#### Scenario: Duplicate slug within same repository is rejected
- **WHEN** developer registers a repository with manifest containing two commands with the same slug
- **THEN** system SHALL reject the registration with error "Duplicate slug '{slug}' in manifest"

### Requirement: Marketplace displays repository info for each command

The system SHALL display each command in the marketplace with its slug, description, and the repository it belongs to.

#### Scenario: Marketplace shows command with repository
- **WHEN** user views the marketplace
- **THEN** each command SHALL be displayed as "{slug} | {description}" on the first line
- **AND** "{developer}/{repository}" on the second line

### Requirement: Marketplace search includes repository name

The system SHALL allow users to search for commands by repository name in addition to command name and slug.

#### Scenario: Search by repository name
- **WHEN** user searches for "awesome-utils" in the marketplace
- **THEN** system SHALL return commands from repositories containing "awesome-utils" in the name