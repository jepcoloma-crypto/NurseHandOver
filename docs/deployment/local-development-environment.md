# NurseHandOver — Local Development Environment

## Operating System

| Property | Value |
|----------|-------|
| OS | Windows_NT |
| Computer Name | DESKTOP-FHOUH4H |
| Version | Microsoft Windows NT 10.0.26200.0 |
| Platform | win32 |

## Runtime Tools

| Tool | Version | Path | Status |
|------|---------|------|--------|
| Node.js | v24.16.0 | System PATH | ✅ Available |
| npm | 11.13.0 | System PATH | ✅ Available |
| Git | 2.55.0.windows.3 | System PATH | ✅ Available |
| psql | PostgreSQL 18.4 | System PATH | ✅ Available |
| pgAdmin | Not installed | N/A | ❌ Not found |

## PostgreSQL

### Server Status

| Property | Value |
|----------|-------|
| Host | localhost |
| Port | 5432 |
| Status | Accepting connections |
| Encoding | UTF8 |
| Locale | English_United States.1256 |

### Existing Databases

| Database | Owner | Related to Project |
|----------|-------|-------------------|
| ai_sems | postgres | No |
| itsm | postgres | No |
| market_intelligence | postgres | No |
| postgres | postgres | System |
| solar_energy | postgres | No |
| template0 | postgres | System |
| template1 | postgres | System |
| trading_mgmt | postgres | No |

### Target Databases

| Database | Purpose | Status |
|----------|---------|--------|
| nurse_handover | Production | ❌ Not created |
| nurse_handover_dev | Development | ❌ Not created |
| nurse_handover_test | Testing | ❌ Not created |

## Network Configuration

| Service | URL | Port | Status |
|---------|-----|------|--------|
| Frontend (Vite dev) | http://localhost:5173 | 5173 | ❌ Not configured |
| Backend (Express) | http://localhost:3000 | 3000 | ❌ Not configured |
| PostgreSQL | localhost:5432 | 5432 | ✅ Available |

## Project Directory

| Property | Value |
|----------|-------|
| Path | C:\Projects\NurseHandOver |
| Contents | docs/ directory (from prior Phase 0 run) |
| Git Initialized | No |
| .gitignore | No |
| package.json | No |
| Source Code | No |

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form
- Zod
- Recharts

### Backend
- Node.js
- Express
- TypeScript

### Database
- PostgreSQL with Prisma ORM

### Testing
- Vitest or Jest (unit)
- Supertest (API)
- Playwright (E2E)

### Code Quality
- ESLint
- Prettier
- TypeScript strict mode

## Planned Project Structure

```
nurse-handover/
├── client/
├── server/
├── database/
├── docs/
├── tests/
├── scripts/
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@localhost:5432/nurse_handover_dev |
| JWT_SECRET | JWT signing secret | (generated secret) |
| JWT_EXPIRES_IN | Token expiration | 24h |
| NODE_ENV | Environment mode | development |
| PORT | Backend port | 3000 |

## Development Constraints

- Must run completely locally (no cloud services)
- Must work offline after dependency installation
- Must use synthetic/demo patient data only
- Must never expose credentials or secrets
- Must implement audit logging
- Must preserve data privacy

## Security Notes

- Environment variables for all secrets
- .env files never committed to version control
- PostgreSQL credentials via DATABASE_URL only
- JWT secrets generated and stored securely
- Password hashing via bcrypt
