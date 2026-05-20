## ADDED Requirements

### Requirement: Waha session management
The system SHALL maintain one or more Waha WhatsApp sessions, one per contact number.

#### Scenario: Session starts successfully
- **WHEN** the platform starts
- **THEN** all configured Waha sessions connect and report "connected" status

#### Scenario: Session disconnects
- **WHEN** a Waha session disconnects unexpectedly
- **THEN** the system SHALL attempt automatic reconnection within 60 seconds

### Requirement: Inbound webhook processing
The system SHALL receive incoming WhatsApp messages via Waha webhook and route them to the message router.

#### Scenario: Message received from user
- **WHEN** Waha delivers a webhook for an incoming message
- **THEN** the system SHALL extract the sender JID, contact JID, message body, and message ID
- **THEN** the system SHALL pass this data to the message router

### Requirement: Outbound message sending
The system SHALL send text messages to users via the Waha REST API.

#### Scenario: Send text message
- **WHEN** a command handler calls `ctx.send("hello")`
- **THEN** the system SHALL send the message via Waha to the user's WhatsApp JID

### Requirement: Reaction support
The system SHALL support adding and removing emoji reactions to messages via Waha.

#### Scenario: Add reaction
- **WHEN** the platform reacts with ⏳ to a user's message
- **THEN** the reaction SHALL appear on the user's message within 2 seconds

#### Scenario: Remove reaction
- **WHEN** the platform removes the ⏳ reaction
- **THEN** the reaction SHALL disappear from the user's message

### Requirement: Multi-contact support
The system SHALL support multiple WhatsApp contacts (numbers), each with its own Waha session.

#### Scenario: _akka admin adds new contact
- **WHEN** an _akka admin configures a new contact with phone number and Waha session ID via the admin portal
- **THEN** the system SHALL create a new Waha session and register its webhook

### Requirement: _akka admin portal
The system SHALL provide a web portal for _akka admins to manage WhatsApp contacts and sessions.

#### Scenario: Admin login
- **WHEN** an _akka admin provides valid credentials
- **THEN** the system SHALL grant access to the admin dashboard

#### Scenario: Add contact
- **WHEN** an _akka admin adds a new WhatsApp contact (phone number, display name)
- **THEN** the system SHALL create a Waha session and register the webhook

#### Scenario: View session status
- **WHEN** an _akka admin views the dashboard
- **THEN** the system SHALL show all contacts with their session status (connected/disconnected)
