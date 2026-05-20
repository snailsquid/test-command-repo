## Why

The admin and developer portals currently have backend APIs but no frontend UI, requiring manual curl commands to manage WhatsApp sessions and commands. This blocks non-technical users and makes routine operations error-prone. Building React dashboards provides an accessible web interface for both admin and developer workflows.

## What Changes

- New admin dashboard UI for managing WhatsApp contacts and sessions without terminal commands
- New developer dashboard UI for managing commands, tokens, and analytics
- Vite build pipeline integrated into project for both frontends
- Static file serving added to Hono backend for production builds
- Shared authentication flow using existing API token endpoints

## Capabilities

### New Capabilities
- `admin-dashboard`: Web UI for platform admins to manage contacts, view session health, add/remove WhatsApp sessions
- `developer-dashboard`: Web UI for developers to register commands, generate tokens, view installations and analytics

### Modified Capabilities
<!-- No existing spec requirements are changing - APIs already exist -->

## Impact

- New dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`
- New directories: `admin-ui/`, `developer-ui/` for Vite apps
- Build output copied to `src/admin/static/` and `src/developer/static/`
- Hono server updated with `serveStatic` middleware for production
- No breaking changes to existing APIs or database schema
