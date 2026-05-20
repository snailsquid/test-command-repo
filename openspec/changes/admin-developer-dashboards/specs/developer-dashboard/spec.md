## ADDED Requirements

### Requirement: Developer can authenticate to dashboard
The system SHALL allow developers to log in to the developer dashboard using their username.

#### Scenario: Successful login
- **WHEN** developer enters valid username
- **THEN** system returns auth token and redirects to dashboard

#### Scenario: New developer auto-registration
- **WHEN** developer logs in with username that doesn't exist
- **THEN** system creates developer account and returns auth token

### Requirement: Developer can view their commands
The system SHALL display a list of all commands owned by the developer or their groups.

#### Scenario: View command list
- **WHEN** developer navigates to dashboard
- **THEN** system displays table with command slug, name, description, status, and installation count

#### Scenario: Empty command list
- **WHEN** developer has no registered commands
- **THEN** system displays message with link to register new command

### Requirement: Developer can register new command
The system SHALL allow developers to register commands by providing GitHub repository details.

#### Scenario: Successful command registration
- **WHEN** developer fills form with slug, name, description, usage, and repo URL
- **THEN** command is registered and appears in command list

#### Scenario: Duplicate slug
- **WHEN** developer registers a command with slug that already exists for their account
- **THEN** system displays error "Command with this slug already exists"

#### Scenario: Missing required fields
- **WHEN** developer submits form with empty required fields
- **THEN** system displays validation error and prevents submission

### Requirement: Developer can update command details
The system SHALL allow developers to edit command metadata.

#### Scenario: Update command
- **WHEN** developer edits name, description, usage, or repo URL
- **THEN** command is updated and changes reflected in command list

### Requirement: Developer can enable/disable command
The system SHALL allow developers to toggle command status between active and disabled.

#### Scenario: Disable command
- **WHEN** developer clicks "Disable" on an active command
- **THEN** command status changes to disabled and is hidden from marketplace

#### Scenario: Enable command
- **WHEN** developer clicks "Enable" on a disabled command
- **THEN** command status changes to active and appears in marketplace

### Requirement: Developer can view command analytics
The system SHALL display installation and usage statistics for each command.

#### Scenario: View analytics
- **WHEN** developer views command analytics
- **THEN** system displays install count, unique contacts, and usage count
