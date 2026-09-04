# NurseHandOver

Nursing Shift Handover and Continuity of Care System

## Project Structure

```
nurse-handover/
├── client/          # React frontend (Vite + TypeScript)
├── server/          # Express backend (TypeScript)
├── database/        # Database migrations and seeds
├── docs/            # Project documentation
├── tests/           # Integration tests
├── scripts/         # Utility scripts
├── .env.example     # Environment variables template
├── .gitignore       # Git ignore rules
├── package.json     # Root package.json
└── README.md        # This file
```

## Prerequisites

- Node.js v24+
- npm v11+
- PostgreSQL 18+

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Copy environment variables
cp .env.example .env

# Start development servers
npm run dev
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run build` | Build both frontend and backend |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all code |
| `npm run typecheck` | Type check all code |

## API

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Health Check: GET /api/v1/health

## Environment Variables

See `.env.example` for required configuration.
