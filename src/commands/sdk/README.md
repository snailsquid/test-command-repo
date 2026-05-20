# @akka/sdk

Akka WhatsApp Command Platform SDK — build commands for the Akka marketplace.

## Installation

```bash
npm install @akka/sdk
# or
bun add @akka/sdk
```

## Quick Start

```typescript
import { command } from "@akka/sdk";

export default command({
  name: "Echo",
  description: "Echoes back your message",
  usage: ".echo [text]",
  async handle(ctx) {
    await ctx.send(ctx.args.join(" ") || "Hello from Akka!");
  }
});
```

Deploy by linking your GitHub repository in the Akka Developer Portal.

## API Reference

### `command(definition)`

Validates and returns a command definition object.

```typescript
import { command } from "@akka/sdk";

export default command({
  name: "My Command",
  description: "What it does",
  usage: ".mycmd [args]",
  async handle(ctx) { /* ... */ }
});
```

### `CommandContext`

Injected into your `handle(ctx)` function:

| Property | Type | Description |
|---|---|---|
| `ctx.send(text)` | `(text: string) => Promise<void>` | Send a WhatsApp message |
| `ctx.react(emoji)` | `(emoji: string) => Promise<void>` | React to the user's message |
| `ctx.schedule(dur, fn)` | `(duration: string, callback: () => Promise<void>) => Promise<void>` | Schedule delayed execution |
| `ctx.fetch(url, options?)` | `(url: string, options?: RequestInit) => Promise<Response>` | Make HTTP requests to external servers |
| `ctx.userId` | `string` | Anonymized user ID |
| `ctx.args` | `string[]` | Parsed command arguments |
| `ctx.message` | `string` | Full message text |
| `ctx.contactId` | `number` | Contact that received the command |

### Duration Format

`ctx.schedule()` accepts human-readable durations: `10m` (minutes), `2h` (hours), `30s` (seconds), `1d` (days).

## Examples

### Reminder Command

```typescript
export default command({
  name: "Remind Me",
  description: "Set a reminder",
  usage: ".remind me 10m check email",
  async handle(ctx) {
    const [duration, ...msg] = ctx.args;
    const message = msg.join(" ");
    
    await ctx.schedule(duration, async () => {
      await ctx.send(`⏰ Reminder: ${message}`);
    });
    await ctx.send(`✅ I'll remind you in ${duration}`);
  }
});
```

### API Call

```typescript
export default command({
  name: "Weather",
  description: "Get weather for a city",
  usage: ".weather [city]",
  async handle(ctx) {
    const city = ctx.args[0] || "London";
    const res = await ctx.fetch(`https://api.weather.example/${city}`);
    const data = await res.json();
    await ctx.send(`Weather in ${city}: ${data.temperature}°C`);
  }
});
```

## License

MIT
