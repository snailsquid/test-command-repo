## ADDED Requirements

### Requirement: Developer can register a command via REST API
The system SHALL allow developers to register commands via POST /developer/commands endpoint.

#### Scenario: Successful command registration
- **WHEN** developer sends POST /developer/commands with valid slug, name, description, usage, and repoUrl
- **THEN** the command is created in the database with status "active"
- **AND** the response includes the created command object

#### Scenario: Registration with duplicate slug fails
- **WHEN** developer sends POST /developer/commands with a slug that already exists for that developer
- **THEN** the response returns 400 error with message about duplicate slug

#### Scenario: Registration with invalid repo URL fails
- **WHEN** developer sends POST /developer/commands with an invalid GitHub repository URL
- **THEN** the response returns 400 error with message about invalid repository

#### Scenario: Registration with missing required fields fails
- **WHEN** developer sends POST /developer/commands with missing required fields
- **THEN** the response returns 400 error listing missing fields

### Requirement: Developer can list their commands via REST API
The system SHALL allow developers to list their registered commands via GET /developer/commands endpoint.

#### Scenario: List commands returns developer's commands
- **WHEN** authenticated developer sends GET /developer/commands
- **THEN** the response includes only that developer's commands

#### Scenario: List commands returns empty for new developer
- **WHEN** new developer (no commands) sends GET /developer/commands
- **THEN** the response returns an empty commands array

### Requirement: Marketplace API exposes all active commands
The system SHALL expose all active commands via GET /api/commands endpoint for public marketplace access.

#### Scenario: Marketplace API returns all active commands
- **WHEN** unauthenticated user sends GET /api/commands
- **THEN** the response includes all commands with status "active"
- **AND** each command includes developer username

#### Scenario: Marketplace API supports search
- **WHEN** user sends GET /api/commands?q=searchterm
- **THEN** the response includes only commands matching the search term in name, description, or slug

#### Scenario: Marketplace API returns single command by ID
- **WHEN** user sends GET /api/commands/:fullId
- **THEN** the response includes the command details if found
- **AND** returns 404 if command not found

### Requirement: Developer can update their command via REST API
The system SHALL allow developers to update their command details via PUT /developer/commands/:id endpoint.

#### Scenario: Successful command update
- **WHEN** developer sends PUT /developer/commands/:id with valid updates
- **THEN** the command is updated in the database
- **AND** the response includes the updated command

#### Scenario: Update command for another developer fails
- **WHEN** developer A tries to update developer B's command
- **THEN** the command is not found (returns 404 for security)

### Requirement: Developer can enable/disable their command via REST API
The system SHALL allow developers to toggle command status via POST /commands/:id/disable and /commands/:id/enable endpoints.

#### Scenario: Disable command
- **WHEN** developer sends POST /commands/:id/disable
- **THEN** the command status is set to "disabled"
- **AND** command no longer appears in marketplace API

#### Scenario: Enable command
- **WHEN** developer sends POST /commands/:id/enable
- **THEN** the command status is set to "active"
- **AND** command appears in marketplace API