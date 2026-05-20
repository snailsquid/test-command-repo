## 1. Project Setup

- [x] 1.1 Create `admin-ui/` directory with Vite + React template
- [x] 1.2 Create `developer-ui/` directory with Vite + React template
- [x] 1.3 Configure Vite proxy in `admin-ui/vite.config.ts` to proxy `/admin` to backend
- [x] 1.4 Configure Vite proxy in `developer-ui/vite.config.ts` to proxy `/developer` to backend
- [x] 1.5 Install React dependencies for both UIs (react, react-dom)
- [x] 1.6 Add npm scripts for dev and build in both UI packages

## 2. Shared Utilities

- [x] 2.1 Create auth utility for token storage (localStorage get/set)
- [x] 2.2 Create fetch wrapper with automatic auth header injection
- [x] 2.3 Create basic CSS reset and shared styles

## 3. Admin Dashboard - Authentication

- [x] 3.1 Create Login page component with username/password form
- [x] 3.2 Implement login API call to `POST /admin/login`
- [x] 3.3 Store auth token in localStorage on successful login
- [x] 3.4 Redirect to dashboard after successful login
- [x] 3.5 Display error message on failed login

## 4. Admin Dashboard - Session Management

- [x] 4.1 Create Dashboard layout with sidebar/navigation
- [x] 4.2 Create SessionList component to display contacts table
- [x] 4.3 Implement fetch contacts API call to `GET /admin/contacts`
- [x] 4.4 Implement fetch sessions API call to `GET /admin/sessions`
- [x] 4.5 Create HealthBadge component (green/red status indicator)
- [x] 4.6 Add refresh button to manually reload session health
- [x] 4.7 Create AddSessionForm component with name, phone, session ID fields
- [x] 4.8 Implement add contact API call to `POST /admin/contacts`
- [x] 4.9 Handle duplicate session ID error with user-friendly message
- [x] 4.10 Implement delete contact API call to `DELETE /admin/contacts/:id`
- [x] 4.11 Add confirmation dialog before deleting session

## 5. Developer Dashboard - Authentication

- [x] 5.1 Create Login page component with username field
- [x] 5.2 Implement login API call to `POST /developer/login`
- [x] 5.3 Store auth token in localStorage on successful login
- [x] 5.4 Redirect to dashboard after successful login
- [x] 5.5 Handle auto-registration for new developers

## 6. Developer Dashboard - Command Management

- [x] 6.1 Create Dashboard layout with sidebar/navigation
- [x] 6.2 Create CommandList component to display commands table
- [x] 6.3 Implement fetch commands API call to `GET /developer/commands`
- [x] 6.4 Create CommandForm component for registering new commands
- [x] 6.5 Implement register command API call to `POST /developer/commands`
- [x] 6.6 Handle duplicate slug error with user-friendly message
- [x] 6.7 Implement update command API call to `PUT /developer/commands/:id`
- [x] 6.8 Create enable/disable toggle for commands
- [x] 6.9 Implement enable API call to `POST /developer/commands/:id/enable`
- [x] 6.10 Implement disable API call to `POST /developer/commands/:id/disable`

## 7. Developer Dashboard - Tokens & Groups

- [x] 7.1 Create TokenGenerator component
- [x] 7.2 Implement generate token API call to `POST /developer/tokens`
- [x] 7.3 Display generated token with copy-to-clipboard button
- [x] 7.4 Implement fetch tokens API call to `GET /developer/tokens`
- [x] 7.5 Show token usage status (used/unused)
- [x] 7.6 Create GroupManagement component (inline in Dashboard)
- [x] 7.7 Implement create group API call to `POST /developer/groups`
- [x] 7.8 Implement add member API call to `POST /developer/groups/:id/members`
- [x] 7.9 Implement fetch groups API call to `GET /developer/groups`

## 8. Developer Dashboard - Analytics

- [ ] 8.1 Create Analytics page component
- [ ] 8.2 Implement fetch analytics API call to `GET /developer/commands/:id/analytics`
- [ ] 8.3 Display install count, unique contacts, usage count
- [ ] 8.4 Add analytics view to command detail or separate page

## 9. Backend Integration

- [x] 9.1 Add static file serving to Hono server (`src/server.ts`)
- [x] 9.2 Configure static file serving for `/admin/*` from `src/admin/static/`
- [x] 9.3 Configure static file serving for `/developer/*` from `src/developer/static/`
- [x] 9.4 API routes registered before static middleware (no conflicts)
- [x] 9.5 Redirect `/admin` -> `/admin/` and `/developer` -> `/developer/`
- [ ] 9.6 Test production build (build both UIs and serve with Bun)

## 10. Testing & Polish

- [ ] 10.1 Test admin login flow end-to-end
- [ ] 10.2 Test add/remove session flow end-to-end
- [ ] 10.3 Test developer login flow end-to-end
- [ ] 10.4 Test command registration flow end-to-end
- [ ] 10.5 Verify session health displays correctly
- [ ] 10.6 Add error boundaries and error state handling
- [ ] 10.7 Add loading states for async operations
- [ ] 10.8 Update README with development instructions
- [ ] 10.9 Document build and deployment process