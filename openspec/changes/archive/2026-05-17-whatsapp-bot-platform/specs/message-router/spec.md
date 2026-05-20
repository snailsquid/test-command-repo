## ADDED Requirements

### Requirement: Contact identification
The system SHALL identify which contact received a message based on the Waha session that delivered the webhook.

#### Scenario: Message on contact A
- **WHEN** a message arrives via Waha session for contact A
- **THEN** the router SHALL tag the message with contact A's ID

### Requirement: User identification
The system SHALL identify the sender by their WhatsApp JID and create a user record if one does not exist.

#### Scenario: Known user sends message
- **WHEN** a message arrives from a JID that exists in the users table
- **THEN** the router SHALL look up the existing user record

#### Scenario: New user sends message
- **WHEN** a message arrives from a JID not in the users table
- **THEN** the router SHALL create a new user record with an anonymized ID

### Requirement: Command parsing
The system SHALL detect commands by checking if the message starts with a period (`.`) followed by the command slug. Slugs are freeform and may contain spaces.

#### Scenario: Valid command syntax
- **WHEN** a user sends `.remind me 10m study`
- **THEN** the router SHALL parse command slug as `remind me` with args `["10m", "study"]`

#### Scenario: Single word slug
- **WHEN** a user sends `.echo hello world`
- **THEN** the router SHALL parse command slug as `echo` with args `["hello", "world"]`

#### Scenario: Non-command message
- **WHEN** a user sends `hello world` (no period prefix)
- **THEN** the router SHALL NOT treat it as a command

### Requirement: Installation check
The system SHALL check if the parsed command is installed for the user on the receiving contact before executing.

#### Scenario: Command installed
- **WHEN** user sends `.remind 10m study` to contact A and `remind` is installed for this user on contact A
- **THEN** the router SHALL proceed to command execution

#### Scenario: Command not installed
- **WHEN** user sends `.remind 10m study` to contact A and `remind` is NOT installed for this user on contact A
- **THEN** the router SHALL react with ❌ and send an error message indicating the command is not installed

### Requirement: System command routing
The system SHALL route system commands (`.help`, `.marketplace`, `.uninstall`) directly without installation checks.

#### Scenario: System command
- **WHEN** user sends `.help`
- **THEN** the router SHALL execute the system help command regardless of installations

### Requirement: Processing feedback
The system SHALL react with ⏳ while processing a command and remove it after completion.

#### Scenario: Command processing
- **WHEN** a valid command is being executed
- **THEN** the system SHALL react with ⏳ on the user's message within 1 second
- **THEN** the system SHALL remove the ⏳ reaction after execution completes

### Requirement: Flow interruption protection
The system SHALL pause command processing when the user is in a conversation flow (e.g., answering a marketplace prompt).

#### Scenario: User in flow receives command-like text
- **WHEN** a user is in a marketplace flow (answering "which command to install?") and sends "1"
- **THEN** the system SHALL treat "1" as the flow response, NOT as a command

#### Scenario: Flow ends
- **WHEN** the conversation flow completes or times out (60 seconds)
- **THEN** the system SHALL resume normal command processing
