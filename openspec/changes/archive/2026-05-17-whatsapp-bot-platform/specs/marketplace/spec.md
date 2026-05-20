## ADDED Requirements

### Requirement: Marketplace browsing
The system SHALL allow users to browse available commands via the `.marketplace` command in WhatsApp.

#### Scenario: View marketplace
- **WHEN** a user sends `.marketplace`
- **THEN** the system SHALL display a paginated list of available commands with numbered entries

### Requirement: Command installation via text response
The system SHALL allow users to install commands by sending the corresponding number (e.g., "1", "2").

#### Scenario: Install by text
- **WHEN** a marketplace listing shows `1. alice/translate` and the user sends "1"
- **THEN** the system SHALL install `alice/translate` for the user on the current contact
- **THEN** the system SHALL send confirmation with usage info

### Requirement: Marketplace pagination
The system SHALL paginate marketplace listings when there are more commands than fit on one page.

#### Scenario: Multiple pages
- **WHEN** there are 15 commands and page size is 5
- **THEN** the first page SHALL show commands 1-5 with hints for "n" (next) and "p" (previous)
- **THEN** sending "n" SHALL show commands 6-10
- **THEN** sending "p" SHALL go back to commands 1-5

### Requirement: Already-installed indication
The system SHALL indicate which commands are already installed by the user on the current contact.

#### Scenario: Installed command in listing
- **WHEN** a user views the marketplace and has `alice/remind` installed on this contact
- **THEN** the `alice/remind` entry SHALL show an installed indicator (e.g., ✅)

### Requirement: Install confirmation
The system SHALL confirm successful installation with the command's usage string.

#### Scenario: Successful install
- **WHEN** a user installs a command by sending "1"
- **THEN** the system SHALL send: `✅ alice/translate installed! Usage: .translate <text> <language>`

### Requirement: Slug collision handling
The system SHALL handle slug collisions when a user installs a command whose slug matches an existing installation.

#### Scenario: Slug collision — replace option
- **WHEN** a user installs `bob/say` but already has `alice/say` installed (same slug "say")
- **THEN** the system SHALL ask: "You already have `.say` installed (alice/say). Replace with bob/say, or install as `.say1`? Reply 'replace' or 'new'"

#### Scenario: User chooses replace
- **WHEN** the user replies "replace"
- **THEN** the system SHALL replace the existing `.say` installation with `bob/say`

#### Scenario: User chooses new
- **WHEN** the user replies "new"
- **THEN** the system SHALL install `bob/say` as `.say1`

### Requirement: Slug renaming
The system SHALL allow users to rename their installed command slugs.

#### Scenario: Rename slug
- **WHEN** a user sends `.rename say my-reminder`
- **THEN** the system SHALL update the user's installation slug from "say" to "my-reminder"

#### Scenario: Rename conflict
- **WHEN** a user tries to rename a slug to one that already exists in their installations
- **THEN** the system SHALL inform the user that the slug is already in use

### Requirement: Flow interruption
The system SHALL treat text responses during a marketplace flow as flow responses, NOT as commands.

#### Scenario: User in marketplace flow
- **WHEN** a user is viewing the marketplace and sends "1"
- **THEN** the system SHALL treat "1" as a command selection, not as a command

#### Scenario: Flow timeout
- **WHEN** 60 seconds pass without a response in a flow
- **THEN** the system SHALL cancel the flow and resume normal command processing
