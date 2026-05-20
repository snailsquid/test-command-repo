## Context

The developer dashboard currently authenticates via `POST /developer/login` with a username, returning a trivially forgeable `dev-{username}` Bearer token. There is no real verification — anyone who knows a username has full access. The platform's primary identity layer is WhatsApp (users interact via `.command` messages), and the database already has `registration_tokens` and `developers.whatsappJid` columns that were designed for this purpose but never wired up.

The dashboard also uses system-centric language ("Add Repository") and a multi-field registration form, even though all command metadata comes from `akka.yaml` in the repo.

**Current state:**
- Login: username-only, auto-creates developer, returns `dev-{username}` token
- Auth middleware: extracts username from `dev-{username}` format, no real verification
- Dashboard: "Add Repository" with URL field, shows repos with commands
- WhatsApp bot: `.help`, `.marketplace`, `.uninstall`, `.rename` — no `.login`
- `registration_tokens` table: exists but unused
- `developers.whatsappJid`: exists but always null

**Constraints:**
- Solo developer, limited time
- WhatsApp bot number: 682128383086 (wa.me link format)
- Must work with existing WAHA gateway webhook infrastructure
- No new infrastructure (no WebSocket server, no SSE — polling is acceptable)

## Goals / Non-Goals

**Goals:**
- WhatsApp-based developer authentication via `.login <token>` command
- Two-step onboarding: username on website → confirm via WhatsApp
- Proper session tokens replacing `dev-{username}` format
- Simplified "Register WhatsApp Command" form (single URL field)
- Developer-centric UX language throughout dashboard

**Non-Goals:**
- Admin dashboard auth changes (admin stays as-is)
- Multi-factor authentication beyond WhatsApp
- Real-time WebSocket/SSE for auth confirmation (polling is fine)
- Re-linking WhatsApp numbers to different developer accounts
- Logout from WhatsApp (`.logout` command)
- Mobile-responsive dashboard redesign

## Decisions

### 1. Polling for Auth Confirmation

**Decision**: Dashboard polls `GET /developer/auth/status?token=...` every 2 seconds until confirmation.

**Why**: No new infrastructure needed. The existing Hono server handles it. WebSocket/SSE would require a persistent connection layer that doesn't exist.

**Alternatives considered**:
- WebSocket: Real-time but requires new server infrastructure
- SSE: Simpler than WebSocket but still needs connection management
- Long polling: More complex than simple polling for this use case

### 2. Token as Polling Key

**Decision**: The `registration_tokens.token` value serves as both the WhatsApp `.login` parameter and the polling key for the dashboard.

**Why**: Single token, single purpose. No need for a separate session key. The token is already unique and random.

### 3. Session Tokens in Database

**Decision**: Add a `sessions` table with `id`, `token`, `developerId`, `createdAt` columns. Tokens are random strings (e.g., `sess_<random>`). No expiry — sessions persist until explicit logout.

**Why**: Proper session management. The `dev-{username}` format is forgeable. A random session token stored server-side is not guessable. No expiry keeps the UX simple (matches current behavior of persistent login).

**Alternatives considered**:
- Store session token in `registration_tokens` table: Overloading purpose — tokens are for auth initiation, sessions are for ongoing access
- JWT tokens: Overkill for this use case, no need for stateless verification
- In-memory sessions: Lost on server restart

### 4. Username on Website, Confirmation on WhatsApp

**Decision**: Developer enters username on the website first, then confirms via WhatsApp. The `POST /developer/auth/init` endpoint creates the developer (if new) and generates the token.

**Why**: Username is a web-form concern (typing on WhatsApp is annoying). WhatsApp is the verification channel (you prove you own the number). Separating concerns keeps each step simple.

**Alternatives considered**:
- Username on WhatsApp: More friction, harder to type, no input validation
- No username at all (use WhatsApp name): Unreliable, not unique, not professional

### 5. Token Expiry (10 Minutes)

**Decision**: Tokens expire 10 minutes after creation. Dashboard shows "Token expired — generate new one" with a button to restart.

**Why**: Security hygiene. 10 minutes is generous enough for the WhatsApp flow but prevents stale tokens from being reused.

### 6. Same WhatsApp Number = Same Developer

**Decision**: Each WhatsApp number can only be linked to one developer. If a number is already linked, `.login` with a different token for a different username is rejected.

**Why**: Prevents identity confusion. A WhatsApp number is a strong identity signal — one number, one developer.

### 7. Simplified Registration Form

**Decision**: "Register WhatsApp Command" form has a single field: GitHub repo URL. All metadata (slug, name, description, usage, entryPoint) comes from `akka.yaml`.

**Why**: The current form already sends `skipValidation: true` and the backend parses everything from the manifest. Extra fields are noise. The `akka.yaml` is the source of truth.

### 8. `.login` as System Command

**Decision**: Add `.login` to the system commands in `system.ts`, alongside `.help`, `.marketplace`, `.uninstall`, `.rename`.

**Why**: Consistent with existing command architecture. System commands are handled before installed commands, have access to the WahaClient for responses, and are defined in one place.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Polling creates server load | Low — 2s interval, only during active login | Acceptable for v1; add rate limiting if needed |
| Token visible in wa.me URL | Medium — could be intercepted | 10-minute expiry limits window; tokens are one-time-use |
| WhatsApp message delivery delay | Low — user sees "Waiting..." in dashboard | Show fallback text for manual copy-paste |
| No logout from WhatsApp | Low — sessions persist | Can add `.logout` later; dashboard logout clears localStorage |
| Username taken during init | Low — user picks unavailable name | Return error immediately, suggest alternatives |
| Same number, different token | Low — rejected with clear message | Bot responds: "This number is already linked to @username" |

## Migration Plan

1. Add `sessions` table to database schema
2. Add `POST /developer/auth/init` and `GET /developer/auth/status` endpoints
3. Add `.login` system command handler
4. Update `bearerAuth` middleware to validate session tokens
5. Rewrite `Login.tsx` with two-step flow (username → wa.me link + polling)
6. Update `Dashboard.tsx` labels and simplify registration form
7. Update `auth.ts` to store session tokens
8. Remove `POST /developer/login` endpoint
9. Update E2E tests for new login flow

**Rollback**: Keep `POST /developer/login` as a hidden fallback initially. If WhatsApp auth has issues, it can be temporarily re-enabled. Full removal after validation.

## Open Questions

- Should the dashboard show a countdown timer for token expiry, or just "Waiting..." until it expires?
- Should `.login` respond differently if the token belongs to the same developer who's already linked? (e.g., re-authentication from a new browser)