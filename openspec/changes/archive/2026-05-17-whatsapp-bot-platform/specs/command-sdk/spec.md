## ADDED Requirements

### Requirement: SDK package structure
The system SHALL provide an `@akka/sdk` npm package that developers install in their command repositories.

#### Scenario: Developer installs SDK
- **WHEN** a developer runs `npm install @akka/sdk`
- **THEN** they SHALL be able to import `command` helper and `CommandContext` types

### Requirement: Command definition helper
The SDK SHALL provide a `command()` helper function that validates and returns a command definition.

#### Scenario: Define a command
- **WHEN** a developer calls `command({ name, description, usage, handle })`
- **THEN** the SDK SHALL return a validated command definition object

### Requirement: Send API
The SDK SHALL provide `ctx.send(text)` to send a message to the user.

#### Scenario: Send message
- **WHEN** command handler calls `ctx.send("hello")`
- **THEN** the message SHALL be delivered to the user via WhatsApp

### Requirement: React API
The SDK SHALL provide `ctx.react(emoji)` to add an emoji reaction to the user's message.

#### Scenario: Add reaction
- **WHEN** command handler calls `ctx.react("👍")`
- **THEN** the reaction SHALL appear on the user's message

### Requirement: Schedule API
The SDK SHALL provide `ctx.schedule(duration, callback)` to schedule delayed execution.

#### Scenario: Schedule reminder
- **WHEN** command handler calls `ctx.schedule("10m", async () => { await ctx.send("⏰ Reminder") })`
- **THEN** the system SHALL execute the callback after 10 minutes and send the message

### Requirement: Fetch API
The SDK SHALL provide `ctx.fetch(url, options)` to make HTTP requests to external servers. Developers have full network access to their own servers, databases, and APIs.

#### Scenario: Call external API
- **WHEN** command handler calls `ctx.fetch("https://api.example.com", { method: "POST", body: "..." })`
- **THEN** the system SHALL proxy the request and return the response

#### Scenario: Call developer's database
- **WHEN** command handler calls `ctx.fetch("https://my-db.example.com/query", { ... })`
- **THEN** the system SHALL allow the request (developers can access their own infrastructure)

### Requirement: Context properties
The SDK SHALL expose `ctx.userId`, `ctx.args`, `ctx.message`, and `ctx.contactId` as read-only properties.

#### Scenario: Access context properties
- **WHEN** command handler accesses `ctx.userId`
- **THEN** it SHALL receive an anonymized string ID (not the phone number)

#### Scenario: Access args
- **WHEN** user sends `.remind 10m study` and command handler accesses `ctx.args`
- **THEN** it SHALL receive `["10m", "study"]`

### Requirement: TypeScript types
The SDK SHALL export TypeScript interfaces for `CommandContext` and `CommandDefinition`.

#### Scenario: TypeScript usage
- **WHEN** a developer uses the SDK in a TypeScript project
- **THEN** they SHALL get full type inference and autocompletion
