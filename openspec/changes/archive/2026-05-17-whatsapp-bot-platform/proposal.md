## Why

WhatsApp is the dominant messaging platform in many regions, but building interactive bot experiences on it requires significant infrastructure. There's no easy way for average users to extend WhatsApp with custom commands, and no marketplace for community-built functionality. Akka solves this by providing a WhatsApp-native command platform where users interact entirely through WhatsApp — no app, no website, no login. Developers build commands via an SDK, and users browse and install them per-contact.

## What Changes

- New platform: WhatsApp bot command runtime with developer marketplace
- WhatsApp integration via Waha (self-hosted WhatsApp gateway)
- Multiple "contacts" (our WhatsApp numbers), each acting as a command container
- Users install commands per-contact; commands only work where installed
- Commands fetched from developer GitHub repos, sandboxed, executed
- Command ID model: developer-username/slug (like GitHub). Slugs are freeform (e.g. "remind me"), trimmed of trailing spaces
- `@akka/sdk` npm package for developers (minimal API: send, react, schedule, fetch)
- Developer model: developers register via WhatsApp (`.register <token>`), manage commands via web portal
- Developers can form groups; all group members have equal access to group commands
- _akka admins manage platform (contacts, sessions) via separate admin dashboard
- User experience is 100% WhatsApp-native; text-based marketplace selection (no number reactions)
- Group chat support in v1
- System commands: `.help`, `.marketplace`, `.uninstall`
- SQLite-backed scheduler for delayed execution (reminders, timers)

## Capabilities

### New Capabilities
- `whatsapp-gateway`: Waha integration for receiving/sending WhatsApp messages across multiple contact sessions. _akka admins manage contacts via admin portal
- `message-router`: Inbound message processing — identify user, identify contact, parse commands, check installations, route to handler, handle conversation flow interruption
- `command-registry`: Command lifecycle management — fetch from GitHub, validate, cache, register in marketplace. Command ID is developer-username/slug
- `command-executor`: Sandboxed command execution with timeout protection. Developers CAN access external servers via ctx.fetch
- `command-sdk`: `@akka/sdk` npm package providing developer-facing API (send, react, schedule, fetch, args, userId)
- `user-management`: User identification by WhatsApp JID, anonymized ID generation, installation tracking with slug collision handling
- `marketplace`: WhatsApp-native command browsing via `.marketplace` with text-based selection ("1", "2", "n", "p"). Flow interruption: commands paused when user is answering a prompt
- `scheduler`: SQLite-backed delayed task execution for commands like `.remind`
- `developer-portal`: Web interface for developers to register commands, view analytics, manage their catalog. Developers register via WhatsApp `.register <token>`
- `admin-portal`: Web interface for _akka admins to manage WhatsApp contacts and sessions
- `system-commands`: Built-in commands (`.help`, `.marketplace`, `.uninstall`) that don't require installation

### Modified Capabilities
<!-- None — this is a greenfield project -->

## Impact

- New dependencies: `hono`, `drizzle-orm`, `better-sqlite3` (or Bun SQLite), `isolated-vm`, `waha`
- New infrastructure: Waha Docker container, at least one WhatsApp number for v1
- New npm package: `@akka/sdk`
- New web portal for developers (command management)
- New web portal for _akka admins (contact/session management)
- No existing code affected (greenfield)
