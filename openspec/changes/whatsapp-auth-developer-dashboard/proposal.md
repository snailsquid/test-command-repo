## Why

The developer dashboard uses trivially forgeable `dev-{username}` tokens with no real authentication — anyone who knows a username has full access. Meanwhile, the platform already has WhatsApp as the primary identity layer for end users, and the `registration_tokens` table and `developers.whatsappJid` column exist but are unused. The dashboard also uses system-centric language ("Add Repository") instead of developer-centric language ("Register WhatsApp Command"), and the repo registration form has unnecessary fields since all metadata comes from `akka.yaml`.

## What Changes

- **BREAKING**: Replace username-only login with WhatsApp-based authentication via `.login <token>` command
- New two-step login flow: developer enters username on website → receives a `wa.me` link with pre-filled `.login <token>` message → sends it on WhatsApp → dashboard polls for confirmation
- New `.login` system command in the WhatsApp bot that validates tokens and links WhatsApp identity to developer accounts
- New backend endpoints: `POST /developer/auth/init` (generate token), `GET /developer/auth/status` (poll for confirmation)
- **BREAKING**: Remove `POST /developer/login` (replaced by auth init flow)
- Replace `dev-{username}` Bearer tokens with proper session tokens
- Simplify "Register WhatsApp Command" form to a single GitHub repo URL field (metadata comes from `akka.yaml`)
- Rename dashboard UX from system language ("Repositories", "Add Repository") to developer language ("Commands", "Register WhatsApp Command")

## Capabilities

### New Capabilities
- `whatsapp-auth`: WhatsApp-based developer authentication via `.login <token>` command, token generation, polling, and session management
- `developer-onboarding`: Two-step onboarding flow where developers enter a username on the website and confirm via WhatsApp

### Modified Capabilities
- `developer-dashboard`: Login flow replaced with WhatsApp auth, repo registration form simplified to single URL field, UX language updated to developer-centric terminology

## Impact

- **Backend**: New auth endpoints (`/developer/auth/init`, `/developer/auth/status`), new `.login` system command, session token validation replaces `dev-{username}` format, `registration_tokens` table now actively used, new `sessions` table or session fields
- **Frontend**: Login page rewritten (two-step: username → wa.me link + polling), Dashboard page updated (renamed labels, simplified form), auth storage changed from `dev-{username}` to session token
- **WhatsApp bot**: New `.login` system command handler added to `system.ts`
- **Database**: `registration_tokens` table activated, possible new `sessions` table, `developers.whatsappJid` now populated
- **Breaking**: `POST /developer/login` removed, `dev-{username}` token format no longer valid