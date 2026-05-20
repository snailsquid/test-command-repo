## ADDED Requirements

### Requirement: Marketplace showPage returns paginated command list
The system SHALL return a paginated list of active commands when showPage is called.

#### Scenario: Returns first page with commands
- **WHEN** showPage is called with userId and contactId
- **THEN** the returned text includes the first page of commands (up to 5)
- **AND** includes navigation instructions

#### Scenario: Empty marketplace shows appropriate message
- **WHEN** showPage is called when no commands exist
- **THEN** the returned text indicates no commands are available

#### Scenario: Pagination calculates correct page count
- **WHEN** showPage is called with 12 commands (5 per page)
- **THEN** the totalPages is calculated as 3

#### Scenario: Marks installed commands
- **WHEN** showPage is called for a user who has installed commands
- **THEN** installed commands are marked with "✅" in the output

### Requirement: Marketplace handleResponse processes navigation
The system SHALL handle navigation commands ("n" for next, "p" for previous) in marketplace flow.

#### Scenario: "n" navigates to next page
- **WHEN** handleResponse receives "n" input
- **THEN** returns the next page of commands
- **AND** updates the state with new page number

#### Scenario: "n" on last page shows message
- **WHEN** handleResponse receives "n" input when on last page
- **THEN** returns message indicating user is on last page

#### Scenario: "p" navigates to previous page
- **WHEN** handleResponse receives "p" input
- **THEN** returns the previous page of commands
- **AND** updates the state with new page number

#### Scenario: "p" on first page shows message
- **WHEN** handleResponse receives "p" input when on first page
- **THEN** returns message indicating user is on first page

### Requirement: Marketplace handleResponse processes command installation
The system SHALL handle numeric input to select and install commands from marketplace.

#### Scenario: Number selects and installs command
- **WHEN** handleResponse receives a valid number (e.g., "1")
- **THEN** the corresponding command is installed for the user
- **AND** returns completion message with usage instructions

#### Scenario: Number for already installed command shows message
- **WHEN** handleResponse receives number for already installed command
- **THEN** returns message indicating command is already installed

#### Scenario: Invalid number shows error
- **WHEN** handleResponse receives an invalid number (e.g., "99")
- **THEN** returns error message about invalid selection

### Requirement: Marketplace handleResponse handles slug collision
The system SHALL handle the case where installing a command would conflict with an existing slug.

#### Scenario: Collision shows replacement options
- **WHEN** user selects command with slug that conflicts with installed command
- **THEN** returns message asking to "replace" or use "new" slug

#### Scenario: "replace" option uninstalls old and installs new
- **WHEN** user responds with "replace" during collision
- **THEN** old command is uninstalled
- **AND** new command is installed with same slug

#### Scenario: "new" option installs with incremented slug
- **WHEN** user responds with "new" during collision
- **THEN** new command is installed with incremented slug (e.g., "cmd1")

#### Scenario: Invalid collision response shows error
- **WHEN** user responds with neither "replace" nor "new"
- **THEN** returns error asking for valid response

### Requirement: Marketplace buildInitialState creates correct state
The system SHALL create the initial marketplace state with commands and installation status.

#### Scenario: Creates state with first page of commands
- **WHEN** buildInitialState is called
- **THEN** returns state with page 1, totalPages, and first page of commands

#### Scenario: Marks commands as installed or not
- **WHEN** buildInitialState is called for user with installations
- **THEN** commands in user's installations have installed: true
- **AND** other commands have installed: false