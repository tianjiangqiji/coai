# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chat Nio** (CoAI) is a next-generation AIGC commercial solution that combines a powerful API distribution system with a rich user interface. It's a full-stack application that serves both B2C (user chat interface) and B2B (API relay/distribution) use cases.

- **Frontend**: React + Redux + Radix UI + Tailwind CSS (PWA-enabled)
- **Backend**: Golang + Gin + Redis + MySQL
- **Architecture**: Monolithic with optional frontend/backend separation support

## Build & Development Commands

### Frontend (app/)

```bash
cd app
pnpm install          # Install dependencies
pnpm dev              # Development server
pnpm build            # Production build (with TypeScript check)
pnpm fast-build       # Production build (skip TypeScript check)
pnpm lint             # Run ESLint
pnpm prettier         # Format code
```

### Backend (Go)

```bash
# Build
go build -o chatnio

# Run
./chatnio

# For cross-compilation (e.g., ARM64)
GOARCH=arm64 go build -o chatnio
```

### Configuration

- Configuration file: `config.yaml` (see `config.example.yaml` for template)
- Environment variables override config values (e.g., `MYSQL_HOST` overrides `mysql.host`)
- Default server port: **8094**
- Default admin credentials: username `root`, password `chatnio123456`

## Architecture & Key Concepts

### Backend Structure

The backend follows a modular package structure:

- **adapter/**: Multi-provider AI model adapters (OpenAI, Claude, Gemini, Midjourney, etc.)
  - Each adapter implements a factory pattern via `FactoryCreator`
  - Supports 15+ AI providers with unified interface
  - Model mapping/reflection for channel-specific model names

- **channel/**: Channel management system (core business logic)
  - `Manager`: Manages multiple AI provider channels with priority/weight-based routing
  - `Ticker`: Implements load balancing and failover across channels
  - `Sequence`: Priority-sorted channel list with group-based access control
  - Supports user group segmentation (0=普通用户, 1=基础版, 2=标准版, 3=专业版)

- **auth/**: Authentication & authorization
  - JWT-based authentication
  - API key management for B2B clients
  - Subscription & quota management

- **admin/**: Admin panel backend
  - User management, channel configuration, statistics
  - Redeem code & gift code systems
  - Market configuration

- **manager/**: Request handling & routing
  - Chat completions, image generation
  - WebSocket connection management
  - OpenAI-compatible API relay (`/v1/*` endpoints)

- **middleware/**: HTTP middleware (CORS, throttling, auth)
- **utils/**: Shared utilities (config, encryption, caching)
- **globals/**: Global types, interfaces, and variables

### Frontend Structure

- **src/**: React application source
  - Component-based architecture using Radix UI primitives
  - Redux for state management
  - i18next for internationalization (CN/US/JP/RU)
  - PWA support with service workers

### Key Features

1. **Channel Management**:
   - Multi-channel support with priority & weight-based load balancing
   - Automatic failover on channel failure
   - Model mapping (e.g., `gpt-4-all>gpt-4` to hide upstream models)
   - User group-based channel access control

2. **Billing System**:
   - Dual billing: Elastic (points-based) + Subscription plans
   - Points: 10 points = 1 CNY (fixed rate)
   - Subscriptions: Tiered plans with per-model quotas

3. **API Relay**: OpenAI-compatible API endpoints (`/v1/chat/completions`, `/v1/images`, `/v1/models`)

4. **File Parsing**: Built-in support for PDF/Docx/Pptx/Excel/Images (requires external blob service)

5. **Web Search**: Integration with SearXNG for all models

### Configuration Notes

- **servestatic**:
  - `true` (default): Backend serves frontend at `/`, API at `/api`
  - `false`: Backend only serves API (for frontend/backend separation)

- **CORS**:
  - Default: Open to all origins
  - Strict mode: Set `ALLOW_ORIGINS` env var (e.g., `chatnio.net,chatnio.app`)
  - `/v1/*` endpoints always allow all origins for API relay

- **WebSocket**: Required for chat functionality (not needed for API relay)

## Important Development Notes

- **Database Dependencies**: MySQL (persistent data) + Redis (auth cache, rate limiting, quotas) are **required**
- **CLI Commands**: The binary supports CLI commands (see `cli/` package) - run `./chatnio --help`
- **Model Support**: Check `adapter/adapter.go` for the full list of supported AI providers
- **Channel Routing**: Channels are selected via `Ticker` which implements weighted round-robin with priority
- **File Encoding**: UTF-8 for files, ASCII for documentation, LF line endings (per AGENTS.md)

## Common Workflows

### Adding a New AI Provider Adapter

1. Create new package under `adapter/[provider-name]/`
2. Implement `FactoryCreator` interface
3. Register in `adapter/adapter.go` channelFactories map
4. Add channel type constant to `globals/`

### Modifying Channel Logic

- Channel selection: `channel/ticker.go`
- Channel configuration: `channel/channel.go`
- Load balancing: `channel/sequence.go`

### Frontend Development

- API calls: Check `app/src/` for axios-based API client
- State management: Redux store configuration
- Styling: Tailwind CSS + custom LESS (see `app/src/assets/globals.less`)
