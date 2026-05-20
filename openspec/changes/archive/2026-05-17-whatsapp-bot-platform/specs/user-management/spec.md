## ADDED Requirements

### Requirement: User identification by JID
The system SHALL identify users by their WhatsApp JID (phone number identifier).

#### Scenario: User identified
- **WHEN** a message arrives from a WhatsApp JID
- **THEN** the system SHALL look up or create a user record for that JID

### Requirement: Anonymized user ID
The system SHALL generate an anonymized user ID for exposure to command handlers. The raw phone number SHALL NOT be exposed.

#### Scenario: User ID exposed to commands
- **WHEN** a command handler accesses `ctx.userId`
- **THEN** it SHALL receive a hash-based ID, not the phone number

#### Scenario: Phone number protection
- **WHEN** a command handler attempts to access the user's phone number
- **THEN** the system SHALL NOT provide it through any SDK API

### Requirement: User creation
The system SHALL automatically create a user record when a message is received from a new JID.

#### Scenario: New user
- **WHEN** a message arrives from a JID not in the database
- **THEN** the system SHALL create a user record with the JID, anonymized ID, and creation timestamp

### Requirement: Installation tracking
The system SHALL track which commands each user has installed on which contacts, including the user's chosen slug.

#### Scenario: Install command
- **WHEN** a user installs `alice/remind` on contact A with slug "remind"
- **THEN** the system SHALL record: userId, contactId, commandId (alice/remind), userSlug ("remind"), installedAt

#### Scenario: Uninstall command
- **WHEN** a user uninstalls `.remind` from contact A
- **THEN** the system SHALL remove the installation record

### Requirement: Installation uniqueness per slug
The system SHALL prevent duplicate slugs for the same user on the same contact. If a slug collision occurs, the system SHALL offer replace or rename options.

#### Scenario: Slug collision
- **WHEN** a user installs `bob/say` on contact A and already has `alice/say` installed with slug "say"
- **THEN** the system SHALL ask the user to replace or install with a new slug

#### Scenario: Replace installation
- **WHEN** the user chooses "replace"
- **THEN** the system SHALL overwrite the existing "say" installation with `bob/say`

#### Scenario: New slug
- **WHEN** the user chooses "new"
- **THEN** the system SHALL install `bob/say` with slug "say1"
