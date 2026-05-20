## 1. Database Schema

- [x] 1.1 Add `sessions` table to `src/db/schema.ts` with columns: `id` (integer PK), `token` (text, unique), `developerId` (integer FK to developers), `createdAt` (text, default now)
- [x] 1.2 Update `registration_tokens` table: add `expiresAt` column (text), ensure `developerId` is nullable (tokens created before WhatsApp confirmation don't have a developer yet — actually they do since init creates the developer first)
- [x] 1.3 Run database migration / verify schema sync

## 2. Backend Auth Endpoints

- [x] 2.1 Create `POST /developer/auth/init` endpoint: accepts `{ username }`, creates developer if not exists, generates token in `registration_tokens` with 10-minute expiry, returns `{ token, waUrl, phone }`
- [x] 2.2 Create `GET /developer/auth/status` endpoint: accepts `token` query param, returns `{ status: "pending" | "complete" | "expired" }` and `{ sessionToken, developerId, username }` when complete
- [x] 2.3 Update `bearerAuth` middleware to validate session tokens from `sessions` table instead of `dev-{username}` format
- [x] 2.4 Remove `POST /developer/login` endpoint (or mark as deprecated returning 410)

## 3. WhatsApp .login Command

- [x] 3.1 Add `.login` to `SYSTEM_COMMANDS` set in `src/commands/system.ts`
- [x] 3.2 Implement `handleLogin` function: validate token (exists, not used, not expired), check WhatsApp JID not already linked to different developer, link JID to developer, mark token used, create session, send confirmation message
- [x] 3.3 Add `.login` case to `handleSystemCommand` router
- [x] 3.4 Handle error cases: invalid token, expired token, already used token, WhatsApp number already linked to different developer
- [x] 3.5 Update router in `src/router/index.ts` to route `.login` to system command handler

## 4. Frontend Login Page Rewrite

- [x] 4.1 Rewrite `Login.tsx` with two-step flow: Step 1 (username input + "Login with WhatsApp" button), Step 2 (wa.me link + fallback text + polling spinner)
- [x] 4.2 Add `POST /developer/auth/init` API call to login page
- [x] 4.3 Add `GET /developer/auth/status` polling logic (2-second interval) to login page
- [x] 4.4 Handle polling states: pending (show spinner), complete (store session token, redirect to dashboard), expired (show "Token expired" with retry button)
- [x] 4.5 Generate wa.me URL format: `https://wa.me/682128383086?text=.login%20<token>`
- [x] 4.6 Display fallback text: token value and phone number for manual copy-paste
- [x] 4.7 Handle error states: username taken, network errors

## 5. Frontend Auth Storage Update

- [x] 5.1 Update `auth.ts` to store session token (format: `sess_<random>`) instead of `dev-{username}`
- [x] 5.2 Update `api.ts` to send session token in Authorization header (no format change needed, still `Bearer <token>`)
- [x] 5.3 Update `App.tsx` AuthContext to work with session token format

## 6. Dashboard UX Updates

- [x] 6.1 Rename "Add Repository" button to "Register WhatsApp Command" in `Dashboard.tsx`
- [x] 6.2 Rename "Repositories" sidebar/tab label to "Commands" in `Dashboard.tsx` and `Sidebar.tsx`
- [x] 6.3 Simplify "Register WhatsApp Command" form to single URL field (remove any extra fields, keep only repo URL input)
- [x] 6.4 Update form hint text to clarify that metadata comes from `akka.yaml`
- [x] 6.5 Update empty state message from "No repositories yet" to "No commands registered yet"

## 7. E2E Tests

- [x] 7.1 Update developer dashboard E2E tests for new WhatsApp auth login flow
- [x] 7.2 Update developer dashboard E2E tests for simplified registration form (single URL field)
- [x] 7.3 Add E2E test for token expiry handling
- [x] 7.4 Add E2E test for username-taken error

## 8. Integration & Polish

- [x] 8.1 Verify full flow end-to-end: website init → WhatsApp .login → dashboard session
- [x] 8.2 Test token expiry (10-minute window)
- [x] 8.3 Test same WhatsApp number rejection (already linked to different developer)
- [x] 8.4 Build and verify production static files serve correctly