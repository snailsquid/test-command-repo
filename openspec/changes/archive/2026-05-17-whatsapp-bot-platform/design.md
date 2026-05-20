## Context

Akka is a greenfield WhatsApp-native command platform. Users interact entirely via WhatsApp — no web UI, no app, no login. Developers build commands with an SDK and register via WhatsApp (`.register <token>`) then manage through a web portal. _akka admins manage the platform (contacts, sessions) through a separate admin portal. The platform owns WhatsApp contacts (numbers), and each contact acts as a command container. Users install commands per-contact from a marketplace.

The platform runs on Bun with Waha (self-hosted WhatsApp gateway) for WhatsApp integration. Commands are fetched from GitHub repos, sandboxed, and executed. A SQLite-backed scheduler handles delayed tasks like reminders.

**Timeline**: Working demo in 1 week, polished in 2 weeks. Solo developer.

## Goals / Non-Goals

**Goals:**
- WhatsApp-native user experience with text-based interactions
- Developer-friendly SDK with minimal boilerplate
- Per-contact command isolation
- Sandboxed execution of community commands
- Extensible architecture for adding more contacts
- Developer groups for command collaboration
- Group chat support

**Non-Goals (v1):**
- Command approval/review process (instant publish for demo)
- Revenue model or billing
- User authentication (users identified by WhatsApp JID)
- Media-heavy commands (text-focused, media is stretch)
- Multi-language support

## Decisions

### 1. Waha over WhatsApp Business API

**Decision**: Use Waha (unofficial WhatsApp web multi-device gateway) instead of Meta's official Cloud API.

**Why**:
- No Meta approval process or business verification needed
- Can operate immediately with a personal WhatsApp number
- Free (no per-conversation pricing)
- Supports all message types including reactions

**Alternatives considered**:
- WhatsApp Cloud API: Requires business verification, per-conversation costs, approval delays
- Baileys (direct library): More integration work, Waha wraps it with a clean REST API

**Risk**: Unofficial API can break if WhatsApp changes their protocol. → Mitigation: Waha has active community, protocol changes are usually patched quickly. Can migrate to Cloud API later if needed.

### 2. SQLite over Postgres/Redis

**Decision**: Use SQLite (via Bun's built-in driver) for all storage including scheduled tasks.

**Why**:
- Zero infrastructure setup (no Docker for DB)
- Bun has native SQLite support (fast)
- Sufficient for v1 scale (thousands of users, not millions)
- Single file backup/deploy
- Good enough for scheduler (poll every 30s for due tasks)

**Alternatives considered**:
- Postgres: Overkill for v1, adds infrastructure complexity
- Redis: Good for scheduler but adds dependency; SQLite scheduler is fine for demo scale

**Trade-off**: Won't handle high concurrency well. → For v1 demo scale this is acceptable. Can migrate to Postgres later.

### 3. isolated-vm for Sandbox

**Decision**: Use `isolated-vm` for sandboxed command execution.

**Why**:
- True V8 isolate separation (no shared state between commands)
- Memory and CPU limits enforceable
- No filesystem access by default
- Network access allowed via `ctx.fetch` (developers need to call external servers)
- We inject only the SDK context we want developers to have

**Alternatives considered**:
- Node `vm` module: Not a true sandbox, can escape
- `vm2`: Has had security vulnerabilities
- Docker containers: Too heavy for per-command execution

**Risk**: `isolated-vm` requires native compilation. → Mitigation: Bun compatibility should be verified early. Fallback to `vm2` with strict API surface if needed.

### 4. GitHub as Command Source

**Decision**: Commands are stored in GitHub repos; platform fetches and caches them.

**Why**:
- Developers already use GitHub
- Version control built-in
- Easy for platform to poll for updates
- No need to build a code editor or file hosting

**Flow**: Developer registers via WhatsApp `.register <token>` → verifies on web portal → submits GitHub repo URL → Platform fetches → Validates export structure → Caches locally → Periodic refresh

**Trade-off**: Requires developers to have GitHub accounts. → Acceptable for developer audience.

### 5. Text-Based Marketplace UX

**Decision**: Use text responses for marketplace interaction instead of reactions.

**Why**:
- WhatsApp only shows recent emojis — number reactions clutter the reaction picker for users who use reactions daily
- Text responses ("1", "2", "n", "p") are more reliable and accessible
- Reactions still used for processing feedback (⏳, ✅, ❌) — those are transient and don't pollute the picker

**Flow**: User sends `.marketplace` → Bot shows numbered list → User sends "1" to install → Bot confirms

**Flow interruption**: When the user is in a conversation flow (answering a marketplace prompt), incoming messages are treated as responses, NOT as commands. This prevents `.remind` from being interpreted when the user is trying to type "1" to select a command.

### 6. Developer Groups with Flat Permissions

**Decision**: Commands are owned by developer groups (or individual developers). All group members have equal access.

**Why**:
- Enables team collaboration on commands
- Simple permission model (no roles, no hierarchy)
- Matches how small dev teams actually work

**Data model**: `developer_groups` → `developer_group_members` → `commands.developer_id`

**Registration**: Developers register via WhatsApp by sending `.register <token>` to any contact. The token is generated by the web portal. This links their WhatsApp identity to their developer account.

### 7. Command ID: Developer/Slug (GitHub Model)

**Decision**: Command IDs are prefixed by developer username, like GitHub repos (e.g., `alice/remind-me`).

**Why**:
- Slugs are freeform and NOT globally unique — multiple developers can have a command called "remind me"
- The developer prefix makes commands globally unique
- Users can install multiple commands with the same slug from different developers

**Slug collision on install**: When a user installs a command whose slug matches an existing installation:
- System asks: "You already have `.say` installed. Replace with alice/say, or install as `.say1`?"
- Replace: overwrites the existing installation
- Create new: adds postfix (`.say` → `.say1`)
- Users can rename their slugs to anything they want

### 8. Single SDK Context Object

**Decision**: Developers receive a single `ctx` object with all platform APIs.

**Why**:
- Minimal API surface (easy to learn)
- Platform controls what developers can access
- Easy to extend later (add new ctx methods)

**API surface**:
```typescript
ctx.send(text)        // send message to user
ctx.react(emoji)      // react to user's message
ctx.schedule(dur, fn) // delayed execution
ctx.fetch(url, opts)  // call external servers (full network access)
ctx.userId            // anonymized user ID
ctx.args              // parsed arguments
ctx.message           // full message text
ctx.contactId         // which contact
```

### 9. Three Roles

**Decision**: Separate _akka admins, developers, and users with different access levels.

| Role | Access | Registration |
|------|--------|--------------|
| _akka Admin | Web portal (admin dashboard). Manages contacts, sessions. | Manual (platform owner) |
| Developer | Web portal (dev dashboard) + WhatsApp (.register). Manages commands. | Via WhatsApp + web portal |
| User | WhatsApp only. Installs/uses commands. | Auto (first message) |

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Waha protocol break | Commands stop working | Active community; can migrate to Cloud API |
| SQLite concurrency | Slow under high load | Acceptable for demo; migrate to Postgres later |
| Malicious commands | Security breach | Sandbox isolation; no filesystem; network via ctx.fetch only |
| Server restart loses in-flight commands | User experience gap | SQLite scheduler persists; restart recovery |
| WhatsApp account ban | Service outage | Use secondary number; have backup numbers ready |
| Command execution timeout | Hung commands | 5s hard timeout in sandbox; kill and report error |
