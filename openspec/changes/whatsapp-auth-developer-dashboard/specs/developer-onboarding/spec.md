## ADDED Requirements

### Requirement: Developer can initiate login from the website
The system SHALL provide a two-step onboarding flow where developers enter their username on the website and confirm via WhatsApp.

#### Scenario: New developer initiates login
- **WHEN** a developer enters a username on the login page and clicks "Login with WhatsApp"
- **THEN** the system SHALL create a developer account (if the username is new), generate an authentication token, and display a `wa.me` link with pre-filled `.login <token>` message plus fallback text for manual copy-paste

#### Scenario: Returning developer initiates login
- **WHEN** an existing developer enters their username and clicks "Login with WhatsApp"
- **THEN** the system SHALL generate a new authentication token linked to their existing account and display the `wa.me` link with fallback text

#### Scenario: Username already taken by linked developer
- **WHEN** a user enters a username that belongs to a developer whose WhatsApp JID is already linked
- **THEN** the system SHALL return an error indicating the username is taken

### Requirement: Dashboard polls for WhatsApp confirmation
The system SHALL poll the authentication status endpoint while the user completes the WhatsApp login.

#### Scenario: Polling while pending
- **WHEN** the login page is showing the WhatsApp link
- **THEN** the dashboard SHALL poll `GET /developer/auth/status?token=<token>` every 2 seconds

#### Scenario: Confirmation received
- **WHEN** the poll returns `{ status: "complete" }`
- **THEN** the dashboard SHALL store the session token in localStorage, redirect to the dashboard, and stop polling

#### Scenario: Token expired during polling
- **WHEN** the poll returns `{ status: "expired" }`
- **THEN** the dashboard SHALL show a "Token expired" message with a button to generate a new token

#### Scenario: User navigates away
- **WHEN** the user closes the browser or navigates away during polling
- **THEN** the dashboard SHALL stop polling and the token remains in its current state (pending or expired)

### Requirement: wa.me link includes pre-filled message
The system SHALL generate a `wa.me` URL that pre-fills the `.login <token>` message.

#### Scenario: wa.me URL format
- **WHEN** the system generates the authentication URL
- **THEN** the URL SHALL be in the format `https://wa.me/682128383086?text=.login%20<token>`

#### Scenario: Fallback text displayed
- **WHEN** the login page displays the WhatsApp link
- **THEN** the page SHALL also display the token and phone number as plain text for manual copy-paste in case the wa.me link does not work