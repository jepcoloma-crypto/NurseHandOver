# NurseHandOver Technical Environment

## Development Environment

- **Operating System:** Windows (win32)
- **Working Directory:** C:\Projects\NurseHandOver
- **Git Repository:** No (not yet initialized)

## Runtime Versions

| Tool | Version | Status |
|------|---------|--------|
| Node.js | v24.16.0 | ✅ Available |
| npm | 11.13.0 | ✅ Available |
| PostgreSQL | 18.4 (psql client) | ✅ Available |
| PostgreSQL Server | localhost:5432 | ✅ Accepting connections |

## Database Configuration

| Database | Purpose | Status |
|----------|---------|--------|
| nurse_handover | Production | ❌ Not created |
| nurse_handover_dev | Development | ❌ Not created |
| nurse_handover_test | Testing | ❌ Not created |

**Note:** PostgreSQL is running and accessible. Target databases need to be created in Phase 1/2.

## Network Configuration

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:5173 | ❌ Not configured |
| Backend | http://localhost:3000 | ❌ Not configured |
| PostgreSQL | localhost:5432 | ✅ Available |

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
- Vitest or Jest for unit testing
- Supertest for API testing
- Playwright for E2E testing

### Code Quality
- ESLint
- Prettier
- TypeScript strict mode

## Project Structure (Planned)

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

## Existing Environment Observations

1. **Empty directory:** The project directory contains no existing files or code.
2. **PostgreSQL running:** Server is accepting connections on localhost:5432.
3. **No existing databases:** The target databases (nurse_handover, nurse_handover_dev, nurse_handover_test) do not exist.
4. **No Git repository:** Git has not been initialized in this directory.
5. **Modern Node.js:** v24.16.0 is available, which supports all required features.
6. **PowerShell environment:** Commands must use PowerShell syntax on Windows.

## Security Considerations

- Environment variables will be used for all secrets
- .env files must never be committed to version control
- PostgreSQL credentials must be configured via DATABASE_URL
- JWT secrets must be generated and stored securely
- Password hashing will use bcrypt with appropriate rounds

## Development Constraints

- Must run completely locally (no cloud services)
- Must work offline after dependency installation
- Must use synthetic/demo patient data only
- Must never expose credentials or secrets
- Must implement audit logging
- Must preserve data privacy
