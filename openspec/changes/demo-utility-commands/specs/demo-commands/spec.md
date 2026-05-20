## ADDED Requirements

### Requirement: Dice roll command
The system SHALL provide a `dice` command that rolls dice based on user arguments and returns the result. The command SHALL react to the user's message with 🎲 and send the roll result.

The command SHALL accept arguments in `NdS` notation (e.g., `2d6` for 2 six-sided dice). If no arguments are provided, the command SHALL default to rolling 1d6. If the argument format is invalid, the command SHALL default to 1d6.

#### Scenario: Roll with valid notation
- **WHEN** user sends `.dice 3d6`
- **THEN** the command reacts with 🎲 and sends a message showing 3 individual dice results and their sum (e.g., "🎲 You rolled 3d6: [2, 5, 4] = 11")

#### Scenario: Roll with no arguments
- **WHEN** user sends `.dice`
- **THEN** the command reacts with 🎲 and sends a message showing 1d6 result (e.g., "🎲 You rolled 1d6: [4] = 4")

#### Scenario: Roll with invalid notation
- **WHEN** user sends `.dice abc`
- **THEN** the command reacts with 🎲 and sends a message showing 1d6 result (default fallback)

### Requirement: Quote command
The system SHALL provide a `quote` command that fetches a random inspirational quote from the quotable.io API and sends it to the user.

#### Scenario: Successful quote fetch
- **WHEN** user sends `.quote`
- **THEN** the command fetches from `https://api.quotable.io/random` and sends a formatted message with the quote and author (e.g., '"The only way to do great work is to love what you do." — Steve Jobs')

#### Scenario: API failure
- **WHEN** user sends `.quote` and the API request fails
- **THEN** the command sends a fallback message: "Could not fetch a quote right now. Try again later."

### Requirement: Define command
The system SHALL provide a `define` command that looks up word definitions using the Free Dictionary API and sends the result to the user.

#### Scenario: Successful definition lookup
- **WHEN** user sends `.define serendipity`
- **THEN** the command fetches from `https://api.dictionaryapi.dev/api/v2/entries/en/serendipity` and sends the word, part of speech, and first definition (e.g., "📖 *serendipity* (noun)\nThe occurrence of events by chance in a happy way.")

#### Scenario: Word not found
- **WHEN** user sends `.define xyzabc` and the API returns a 404 or empty result
- **THEN** the command sends "No definition found for 'xyzabc'."

#### Scenario: No arguments provided
- **WHEN** user sends `.define` with no arguments
- **THEN** the command sends "Usage: *.define <word>*\nExample: _.define serendipity_"

#### Scenario: API failure
- **WHEN** user sends `.define hello` and the API request fails
- **THEN** the command sends "Could not look up that word right now. Try again later."

### Requirement: Magic 8-Ball command
The system SHALL provide an `8ball` command that returns a random Magic 8-Ball response. The command SHALL react to the user's message with 🔮.

#### Scenario: Ask a question
- **WHEN** user sends `.8ball will I win the lottery?`
- **THEN** the command reacts with 🔮 and sends a random 8-ball response (e.g., "🔮 *Without a doubt.*")

#### Scenario: No question provided
- **WHEN** user sends `.8ball` with no arguments
- **THEN** the command reacts with 🔮 and sends "🔮 Ask me a question! Usage: *.8ball <your question>*"

### Requirement: Coin flip command
The system SHALL provide a `flip` command that simulates a coin flip. The command SHALL react to the user's message with 🪙.

#### Scenario: Flip a coin
- **WHEN** user sends `.flip`
- **THEN** the command reacts with 🪙 and sends either "🪙 *Heads!*" or "🪙 *Tails!*" with equal probability

### Requirement: Manifest lists all five commands
The `akka.yaml` manifest SHALL list all five commands (dice, quote, define, 8ball, flip) with their slugs, names, descriptions, usage strings, and entry points pointing to `commands/<slug>.js`.

#### Scenario: Manifest validation
- **WHEN** the Akka registry fetches the manifest from the repository
- **THEN** it SHALL find 5 commands with unique slugs, each pointing to a valid entry point file

### Requirement: Commands use CommonJS exports format
All command files SHALL use `exports.handle = async function(ctx) { ... }` format. ESM `export` syntax SHALL NOT be used, as the vm2 sandbox executor resolves handlers via `exports.handle`.

#### Scenario: Sandbox execution
- **WHEN** the Akka executor loads a command source file
- **THEN** it SHALL resolve the `handle` function from `exports.handle` and execute it with the `ctx` object