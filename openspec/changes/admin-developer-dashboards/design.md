## Context

The platform has fully functional admin and developer APIs (`/admin/*` and `/developer/*` routes) but no web UI. Users must use curl or Postman to:
- Add/remove WhatsApp contacts and sessions
- View session health status
- Register commands and manage developer profiles
- Generate registration tokens

This design adds two Vite + React single-page applications (SPAs) that consume the existing APIs, served statically by the Hono backend in production.

**Constraints:**
- Solo developer, limited time
- Existing APIs must not change
- Production deployment should not add infrastructure complexity
- Development experience should be smooth (hot reload)

## Goals / Non-Goals

**Goals:**
- Admin dashboard for managing contacts/sessions without terminal commands
- Developer dashboard for managing commands, tokens, and viewing analytics
- Vite-based build with hot reload during development
- Static file serving in production via Hono
- Token-based authentication using existing API endpoints
- Minimal shared component library to avoid duplication

**Non-Goals:**
- Real-time updates (manual refresh or polling is acceptable)
- Advanced analytics or charts in v1
- Mobile-responsive design (desktop-first is acceptable)
- User management beyond admin/developer roles
- Integration with existing WhatsApp-bot-platform change artifacts

## Decisions

### 1. Two Separate Vite Apps

**Decision**: Create `admin-ui/` and `developer-ui/` as separate Vite projects at the repository root.

**Why**:
- Clear separation of concerns (admin vs developer are different user types)
- Independent development and deployment if needed
- Smaller bundle sizes per app
- Easier to reason about and maintain

**Alternatives considered**:
- Single monorepo app with role-based routing: More complex, shared state concerns
- Server-rendered views (Hono + JSX): Less interactive, more server complexity

### 2. Proxy API Requests in Development

**Decision**: Vite dev servers proxy `/admin/*` and `/developer/*` requests to the Hono backend.

**Why**:
- Avoid CORS issues during development
- Same API endpoints in dev and production
- No hardcoded backend URLs in frontend code

**Configuration**:
```typescript
// admin-ui/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/admin': 'http://localhost:3000'
    }
  }
})
```

### 3. Static File Serving in Production

**Decision**: Copy Vite build outputs to `src/admin/static/` and `src/developer/static/`, served by Hono's `serveStatic` middleware.

**Why**:
- Single deployment artifact (no separate frontend hosting)
- Existing Hono server handles all traffic
- No CDN or additional infrastructure needed

**Implementation**:
```typescript
// src/server.ts
import { serveStatic } from 'hono/serve-static'
app.use('/admin/*', serveStatic({ root: './src/admin/static' }))
app.use('/developer/*', serveStatic({ root: './src/developer/static' }))
```

### 4. Authentication via Token in LocalStorage

**Decision**: Store API tokens in browser localStorage, attach to requests via `Authorization: Bearer <token>` header.

**Why**:
- Simple, no session management complexity
- Works with existing API auth design
- Persistent across page reloads

**Security note**: localStorage is vulnerable to XSS, but acceptable for v1 admin/developer tools where users are trusted.

### 5. Plain CSS with Component-Based Styling

**Decision**: Use plain CSS with component-scoped stylesheets (no CSS-in-JS, no Tailwind).

**Why**:
- Minimal setup, no build configuration complexity
- Standard CSS is well-understood
- Avoids dependency bloat for a simple dashboard

**Alternatives considered**:
- Tailwind CSS: Faster development but adds config and learning curve
- Styled-components: More boilerplate, runtime overhead
- Chakra UI / MUI: Heavy for simple CRUD dashboards

### 6. Native Fetch API (No HTTP Client Library)

**Decision**: Use native `fetch()` with a small auth wrapper utility.

**Why**:
- No additional dependencies
- Modern browsers and Bun support fetch natively
- Simple enough use case (no need for axios interceptors, etc.)

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Build step adds complexity | Developers need to run Vite build | Document in README, add npm scripts |
| Static files in src/ is unusual | May confuse conventional expectations | Document structure clearly |
| localStorage token security | XSS could expose admin token | Keep dependencies minimal, audit regularly |
| No real-time updates | Session health may be stale | Add refresh button, consider polling later |
| Two separate codebases | Some duplication between apps | Extract shared utils if pattern emerges |

## Migration Plan

1. Create `admin-ui/` and `developer-ui/` with Vite + React templates
2. Build admin dashboard components (Login, Dashboard, SessionList, AddSessionForm)
3. Build developer dashboard components (Login, Dashboard, CommandForm, CommandList)
4. Add `serveStatic` to Hono server
5. Add build scripts to copy Vite outputs to `src/*/static/`
6. Test in production mode (build and serve)
7. Update README with development instructions

**Rollback**: Remove frontend directories and revert `server.ts` changes - no database or API changes.

## Open Questions

- Should builds be automated (postinstall script) or manual?
- Should we add a root-level `/` redirect to `/admin` or `/developer`?
- Is polling for session health needed, or is manual refresh sufficient?
