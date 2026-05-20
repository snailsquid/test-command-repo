## ADDED Requirements

### Requirement: Admin can authenticate to dashboard
The system SHALL allow platform admins to log in to the admin dashboard using username and password credentials.

#### Scenario: Successful login
- **WHEN** admin enters valid username "admin" and password "admin"
- **THEN** system returns an auth token and redirects to dashboard

#### Scenario: Failed login
- **WHEN** admin enters invalid credentials
- **THEN** system displays error message and remains on login page

### Requirement: Admin can view all contacts and sessions
The system SHALL display a list of all WhatsApp contacts with their associated session IDs and health status.

#### Scenario: View session list
- **WHEN** admin navigates to dashboard
- **THEN** system displays table with contact name, phone number, session ID, and health status

#### Scenario: Empty session list
- **WHEN** no contacts exist in database
- **THEN** system displays message indicating no sessions configured

### Requirement: Admin can view session health status
The system SHALL show visual indicators for session connection status (connected/disconnected).

#### Scenario: Healthy session display
- **WHEN** session is connected to WAHA
- **THEN** system shows green indicator with "Connected" status

#### Scenario: Unhealthy session display
- **WHEN** session is disconnected from WAHA
- **THEN** system shows red indicator with "Disconnected" status

### Requirement: Admin can add new contact/session
The system SHALL allow admins to add new WhatsApp contacts by providing name, phone number, and WAHA session ID.

#### Scenario: Successful contact creation
- **WHEN** admin fills form with valid name, phone number, and session ID
- **THEN** contact is created, added to session manager, and appears in session list

#### Scenario: Duplicate session ID
- **WHEN** admin enters a session ID that already exists
- **THEN** system displays error "Session already configured"

#### Scenario: Missing required fields
- **WHEN** admin submits form with empty required fields
- **THEN** system displays validation error and prevents submission

### Requirement: Admin can remove contact/session
The system SHALL allow admins to delete contacts and their associated sessions.

#### Scenario: Successful session removal
- **WHEN** admin clicks delete button on a session
- **THEN** contact is removed from database and session is removed from session manager

#### Scenario: Delete confirmation
- **WHEN** admin clicks delete button
- **THEN** system shows confirmation dialog before deleting

### Requirement: Admin can refresh session health
The system SHALL allow admins to manually refresh session health status.

#### Scenario: Manual refresh
- **WHEN** admin clicks refresh button
- **THEN** system re-fetches session health from backend and updates display
