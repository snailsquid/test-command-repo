## ADDED Requirements

### Requirement: Sandboxed execution
The system SHALL execute command handlers in an isolated V8 sandbox with no access to filesystem or process APIs.

#### Scenario: Command runs in sandbox
- **WHEN** a command handler is executed
- **THEN** it SHALL run in an isolated-vm context
- **THEN** it SHALL NOT have access to `fs`, `process`, `env`, or `require`

### Requirement: Network access via ctx.fetch
The system SHALL allow developers to make HTTP requests to external servers via `ctx.fetch`. Direct network access (raw `fetch`, `http`, `net` modules) SHALL be blocked.

#### Scenario: Command uses ctx.fetch
- **WHEN** a command handler calls `ctx.fetch("https://api.example.com", { method: "POST", body: "..." })`
- **THEN** the system SHALL proxy the request and return the response

#### Scenario: Direct network blocked
- **WHEN** a command handler attempts to use raw `fetch`, `http`, or `net` modules directly
- **THEN** the sandbox SHALL block the attempt

### Requirement: Execution timeout
The system SHALL enforce a 5-second timeout on command execution.

#### Scenario: Command completes within timeout
- **WHEN** a command handler completes within 5 seconds
- **THEN** the system SHALL return the result normally

#### Scenario: Command exceeds timeout
- **WHEN** a command handler takes longer than 5 seconds
- **THEN** the system SHALL terminate execution and send an error message to the user

### Requirement: Error handling
The system SHALL catch and handle errors from command execution without crashing the platform.

#### Scenario: Command throws error
- **WHEN** a command handler throws an exception
- **THEN** the system SHALL react with ❌ and send a generic error message to the user
- **THEN** the system SHALL log the error for debugging

### Requirement: Context injection
The system SHALL inject a `ctx` object into the sandbox with the platform API surface.

#### Scenario: Context available in handler
- **WHEN** a command handler runs
- **THEN** it SHALL receive `ctx` with: `send`, `react`, `schedule`, `fetch`, `userId`, `args`, `message`, `contactId`
