# Akka - WhatsApp Automation Platform

A WhatsApp automation platform built on [WAHA](https://waha.dev/), featuring a command marketplace, admin dashboard, and developer dashboard.

## Features

- **WhatsApp Integration** - Powered by WAHA for reliable WhatsApp messaging
- **Command Marketplace** - Register and share reusable automation commands
- **Admin Dashboard** - Manage sessions, view analytics, configure settings
- **Developer Dashboard** - Build, test, and publish custom commands
- **SQLite + Drizzle** - Lightweight, production-ready database

## Prerequisites

- [Bun](https://bun.sh/) (v1.3.14+)
- [WAHA](https://waha.dev/) instance running

## Installation

```bash
# Install dependencies
bun install
```

## Configuration

Set the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `WAHA_BASE_URL` | `http://localhost:3000` | WAHA server URL |

## Database Setup

```bash
# Generate database migrations
bun run db:generate

# Run migrations
bun run db:migrate

# (Optional) Open Drizzle Studio
bun run db:studio
```

## Development

```bash
# Run in development mode with hot reload
bun run dev
```

## Production Build

```bash
# Build admin and developer dashboards
bun run build:dashboards
```

## Usage

Once running, access the platform at:

- **Platform**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **Developer Dashboard**: http://localhost:3000/developer

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/commands/register` | Register a new command |
| GET | `/api/commands` | List all commands |
| GET | `/api/commands/search?q=query` | Search commands |
| GET | `/api/commands/:id` | Get command by ID |

## Tech Stack

- **Runtime**: Bun
- **Server**: Hono
- **Database**: SQLite + Drizzle ORM
- **Frontend**: React + Vite
- **WhatsApp**: WAHA