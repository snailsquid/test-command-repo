## MODIFIED Requirements

### Requirement: Developer can authenticate to dashboard
The system SHALL allow developers to log in to the developer dashboard via WhatsApp confirmation, replacing the previous username-only login.

#### Scenario: Successful login via WhatsApp
- **WHEN** developer enters username on the login page and clicks "Login with WhatsApp"
- **THEN** system generates a token, displays a wa.me link with pre-filled `.login <token>` message, and polls for confirmation

#### Scenario: WhatsApp confirmation received
- **WHEN** the developer sends `.login <token>` from WhatsApp and the token is valid
- **THEN** the dashboard poll detects completion, stores the session token, and redirects to the dashboard

#### Scenario: Token expired
- **WHEN** the authentication token expires (10 minutes) before WhatsApp confirmation
- **THEN** system displays "Token expired" message with option to generate a new token

#### Scenario: Username taken
- **WHEN** developer enters a username that belongs to a developer with a linked WhatsApp number
- **THEN** system displays error "Username is already taken"

### Requirement: Developer can register WhatsApp command
The system SHALL allow developers to register commands by providing a GitHub repository URL. All command metadata (slug, name, description, usage, entryPoint) is read from the repository's `akka.yaml` manifest file.

#### Scenario: Successful command registration
- **WHEN** developer submits a GitHub repository URL containing a valid `akka.yaml`
- **THEN** all commands defined in the manifest are registered and displayed in the dashboard

#### Scenario: Repository without akka.yaml
- **WHEN** developer submits a repository URL that does not contain an `akka.yaml` file
- **THEN** system displays an error indicating the manifest file is missing

#### Scenario: Duplicate repository
- **WHEN** developer submits a repository URL that is already registered to their account
- **THEN** system displays an error indicating the repository is already registered

## ADDED Requirements

### Requirement: Dashboard uses developer-centric language
The system SHALL use developer-facing terminology throughout the dashboard UI.

#### Scenario: Command registration button
- **WHEN** developer views the dashboard
- **THEN** the primary action button SHALL display "Register WhatsApp Command" instead of "Add Repository"

#### Scenario: Commands section label
- **WHEN** developer views the dashboard navigation
- **THEN** the section label SHALL display "Commands" instead of "Repositories"

### Requirement: Registration form accepts only repository URL
The system SHALL provide a single-field registration form that accepts only a GitHub repository URL.

#### Scenario: Form displays single URL field
- **WHEN** developer opens the registration form
- **THEN** the form SHALL display a single input field for the GitHub repository URL with a hint that the repository must contain an `akka.yaml` file

#### Scenario: Form does not display individual command fields
- **WHEN** developer opens the registration form
- **THEN** the form SHALL NOT display fields for slug, name, description, usage, or entryPoint