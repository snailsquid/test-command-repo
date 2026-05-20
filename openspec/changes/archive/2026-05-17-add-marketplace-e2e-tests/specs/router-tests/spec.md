## ADDED Requirements

### Requirement: Router parses command from message body
The system SHALL parse commands from WhatsApp message bodies that start with ".".

#### Scenario: Parses basic command
- **WHEN** message body is ".mycmd"
- **THEN** parseCommand returns { slug: "mycmd", args: [], userSlug: "mycmd" }

#### Scenario: Parses command with arguments
- **WHEN** message body is ".mycmd arg1 arg2"
- **THEN** parseCommand returns { slug: "mycmd", args: ["arg1", "arg2"], userSlug: "mycmd" }

#### Scenario: Returns null for non-command message
- **WHEN** message body is "hello world" (no leading dot)
- **THEN** parseCommand returns null

#### Scenario: Returns null for empty command
- **WHEN** message body is "." or ".   "
- **THEN** parseCommand returns null

#### Scenario: Matches longest slug first
- **WHEN** user has slugs "test" and "test-cmd", message is ".test-cmd arg"
- **THEN** parseCommand matches "test-cmd" (longer match) not "test"

#### Scenario: Case insensitive matching
- **WHEN** user has slug "mycmd", message is ".MYCMD"
- **THEN** parseCommand matches the slug (case insensitive)

### Requirement: Router manages conversation flows
The system SHALL create, retrieve, update, and delete conversation flows for marketplace interactions.

#### Scenario: startFlow creates flow in database
- **WHEN** startFlow is called with userId, contactId, flowType
- **THEN** a new row is created in conversationFlows table
- **AND** returns a ConversationFlow object with the flow ID

#### Scenario: getActiveFlow returns current flow
- **WHEN** getActiveFlow is called for user in active flow
- **THEN** returns the ConversationFlow object with current state

#### Scenario: getActiveFlow returns null for no active flow
- **WHEN** getActiveFlow is called for user with no active flow
- **THEN** returns null

#### Scenario: updateFlow modifies flow state and data
- **WHEN** updateFlow is called with flowId, new state, and data
- **THEN** the flow's state and data are updated in database
- **AND** expiresAt is extended

#### Scenario: endFlow deletes flow
- **WHEN** endFlow is called with flowId
- **THEN** the flow is deleted from database
- **AND** returns true

#### Scenario: isInFlow checks if user in active flow
- **WHEN** isInFlow is called for user in active flow
- **THEN** returns true

#### Scenario: isInFlow returns false for no flow
- **WHEN** isInFlow is called for user not in flow
- **THEN** returns false

### Requirement: Router routes messages to appropriate handlers
The system SHALL route incoming messages to system commands, installed commands, or show "not installed" message.

#### Scenario: Routes to system command
- **WHEN** message is ".help" (system command)
- **THEN** routes to handleSystemCommand

#### Scenario: Routes to installed command
- **WHEN** message is ".installed-cmd" and command is installed
- **THEN** routes to command executor

#### Scenario: Shows "not installed" for unknown command
- **WHEN** message is ".unknown-cmd" and command is not installed
- **THEN** sends "Command not installed" message to user

#### Scenario: Handles errors gracefully
- **WHEN** command execution throws an error
- **THEN** sends "Something went wrong" message to user
- **AND** logs the error