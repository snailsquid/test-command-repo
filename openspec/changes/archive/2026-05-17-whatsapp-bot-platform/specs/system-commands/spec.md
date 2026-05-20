## ADDED Requirements

### Requirement: System commands bypass installation
The system SHALL execute system commands (`.help`, `.marketplace`, `.uninstall`) without checking user installations.

#### Scenario: System command available to all
- **WHEN** any user sends `.help` to any contact
- **THEN** the system SHALL execute the help command regardless of what the user has installed

### Requirement: Help command
The system SHALL provide a `.help` command that shows commands installed on the current contact for the user.

#### Scenario: Show installed commands
- **WHEN** a user sends `.help`
- **THEN** the system SHALL list commands the user has installed on this contact with their descriptions
- **THEN** the system SHALL include a hint to send `.marketplace` for more commands

#### Scenario: No commands installed
- **WHEN** a user sends `.help` and has no commands installed on this contact
- **THEN** the system SHALL show a message suggesting to browse the marketplace

### Requirement: Marketplace command
The system SHALL provide a `.marketplace` command that shows available commands for installation with text-based selection.

#### Scenario: Open marketplace
- **WHEN** a user sends `.marketplace`
- **THEN** the system SHALL show a paginated list of available commands with numbered entries
- **THEN** the user SHALL reply with a number to install, or "n"/"p" for pages

### Requirement: Uninstall command
The system SHALL provide an `.uninstall` command that allows users to remove installed commands.

#### Scenario: Uninstall by slug
- **WHEN** a user sends `.uninstall remind`
- **THEN** the system SHALL remove the `remind` installation for the user on the current contact
- **THEN** the system SHALL confirm with a reaction and message

#### Scenario: Uninstall non-installed command
- **WHEN** a user sends `.uninstall remind` but `remind` is not installed on this contact
- **THEN** the system SHALL inform the user that the command is not installed

### Requirement: Rename command
The system SHALL provide a `.rename` command that allows users to rename their installed command slugs.

#### Scenario: Rename slug
- **WHEN** a user sends `.rename say my-command`
- **THEN** the system SHALL update the installation slug from "say" to "my-command"
- **THEN** the system SHALL confirm the rename

#### Scenario: Rename conflict
- **WHEN** a user sends `.rename say remind` but "remind" is already in use on this contact
- **THEN** the system SHALL inform the user that the slug is already in use

### Requirement: Error feedback
The system SHALL provide clear error messages when commands fail or are not found.

#### Scenario: Unknown command
- **WHEN** a user sends `.foo` and no installed command matches "foo"
- **THEN** the system SHALL react with ❌ and send a message that the command was not found

#### Scenario: Command not installed
- **WHEN** a user sends `.remind 10m study` but `remind` is not installed on this contact
- **THEN** the system SHALL react with ❌ and send a message indicating the command needs to be installed first
