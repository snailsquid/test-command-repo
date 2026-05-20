## ADDED Requirements

### Requirement: Delayed task scheduling
The system SHALL support scheduling tasks for future execution with a specified delay.

#### Scenario: Schedule task
- **WHEN** a command handler calls `ctx.schedule("10m", callback)`
- **THEN** the system SHALL store the task in SQLite with an execution time of now + 10 minutes

### Requirement: Task execution
The system SHALL execute scheduled tasks when their execution time arrives.

#### Scenario: Task becomes due
- **WHEN** the scheduler checks and finds a task with `executeAt <= now`
- **THEN** the system SHALL execute the task callback and mark it as executed

### Requirement: Scheduler polling
The system SHALL poll for due tasks at regular intervals.

#### Scenario: Poll interval
- **WHEN** the platform is running
- **THEN** the scheduler SHALL check for due tasks every 30 seconds

### Requirement: Persistence across restarts
The system SHALL persist scheduled tasks in SQLite so they survive server restarts.

#### Scenario: Server restarts
- **WHEN** the server restarts with pending scheduled tasks in the database
- **THEN** the scheduler SHALL resume and execute any tasks that are now due

### Requirement: Task failure handling
The system SHALL handle task execution failures without crashing the scheduler.

#### Scenario: Task callback throws
- **WHEN** a scheduled task callback throws an error
- **THEN** the system SHALL log the error and mark the task as failed
- **THEN** the scheduler SHALL continue processing other tasks

### Requirement: Duration parsing
The system SHALL parse human-readable duration strings for scheduling.

#### Scenario: Parse duration formats
- **WHEN** `ctx.schedule("10m", callback)` is called
- **THEN** the system SHALL interpret "10m" as 10 minutes
- **WHEN** `ctx.schedule("2h", callback)` is called
- **THEN** the system SHALL interpret "2h" as 2 hours
- **WHEN** `ctx.schedule("30s", callback)` is called
- **THEN** the system SHALL interpret "30s" as 30 seconds
