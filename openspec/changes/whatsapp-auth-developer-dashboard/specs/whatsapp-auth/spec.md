## ADDED Requirements

### Requirement: Developer can authenticate via WhatsApp .login command
The system SHALL provide a `.login <token>` system command that validates a registration token and links the sender's WhatsApp identity to a developer account.

#### Scenario: Successful login with valid token
- **WHEN** a WhatsApp user sends `.login tk_abc123xyz` and the token exists, is unused, and has not expired
- **THEN** the system SHALL link the sender's WhatsApp JID to the developer associated with the token, mark the token as used, create a session token, and reply with a confirmation message including the developer's username

#### Scenario: Token already used
- **WHEN** a WhatsApp user sends `.login <token>` and the token has already been used
- **THEN** the system SHALL reply with an error message indicating the token has already been used and suggest generating a new one from the dashboard

#### Scenario: Token expired
- **WHEN** a WhatsApp user sends `.login <token>` and the token was created more than 10 minutes ago
- **THEN** the system SHALL reply with an error message indicating the token has expired and suggest generating a new one from the dashboard

#### Scenario: Invalid token
- **WHEN** a WhatsApp user sends `.login <token>` and no token with that value exists
- **THEN** the system SHALL reply with an error message indicating the token is invalid

#### Scenario: WhatsApp number already linked to different developer
- **WHEN** a WhatsApp user sends `.login <token>` and their WhatsApp JID is already linked to a different developer account
- **THEN** the system SHALL reply with an error message indicating the number is already linked to a different developer and show that developer's username

### Requirement: System generates authentication tokens
The system SHALL provide an endpoint to generate authentication tokens for the WhatsApp login flow.

#### Scenario: Generate token for existing developer
- **WHEN** `POST /developer/auth/init` is called with a valid username that already exists
- **THEN** the system SHALL create a registration token linked to that developer and return the token along with a `wa.me` URL pre-filled with the `.login <token>` message

#### Scenario: Generate token for new developer
- **WHEN** `POST /developer/auth/init` is called with a username that does not exist
- **THEN** the system SHALL create a new developer account with that username, create a registration token linked to the developer, and return the token along with a `wa.me` URL

#### Scenario: Username already taken
- **WHEN** `POST /developer/auth/init` is called with a username that already exists and belongs to a different developer whose WhatsApp JID is already linked
- **THEN** the system SHALL return an error indicating the username is taken

### Requirement: Dashboard can poll for authentication status
The system SHALL provide an endpoint to check whether a WhatsApp login has been confirmed.

#### Scenario: Token pending confirmation
- **WHEN** `GET /developer/auth/status?token=<token>` is called and the token has not yet been used
- **THEN** the system SHALL return `{ status: "pending" }`

#### Scenario: Token confirmed
- **WHEN** `GET /developer/auth/status?token=<token>` is called and the token has been used (WhatsApp login confirmed)
- **THEN** the system SHALL return `{ status: "complete", sessionToken: "<session_token>", developerId: <id>, username: "<username>" }`

#### Scenario: Token expired
- **WHEN** `GET /developer/auth/status?token=<token>` is called and the token has expired (older than 10 minutes)
- **THEN** the system SHALL return `{ status: "expired" }`

### Requirement: Session tokens replace dev-username format
The system SHALL use random session tokens for authenticated API requests instead of the `dev-{username}` format.

#### Scenario: Valid session token
- **WHEN** an API request includes `Authorization: Bearer sess_<random>` and the session token exists in the database
- **THEN** the system SHALL authenticate the request as the developer associated with that session

#### Scenario: Invalid session token
- **WHEN** an API request includes an invalid or non-existent session token
- **THEN** the system SHALL return 401 Unauthorized

#### Scenario: Session persistence
- **WHEN** a session token is created
- **THEN** the session SHALL persist indefinitely until the developer explicitly logs out from the dashboard

### Requirement: .login is recognized as a system command
The system SHALL recognize `.login` as a system command alongside `.help`, `.marketplace`, `.uninstall`, and `.rename`.

#### Scenario: .login in system command set
- **WHEN** the router processes an incoming message starting with `.login`
- **THEN** the system SHALL route it to the `.login` handler before checking installed commands