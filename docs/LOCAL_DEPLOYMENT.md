# NurseHandOver — Local Deployment Guide

> **Version:** 0.1.0  
> **Last Updated:** September 6, 2026  
> **Platform:** Windows (DESKTOP-FHOUH4H)  
> **Scope:** Local development and production-like deployment only. No cloud services.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local PostgreSQL Setup](#2-local-postgresql-setup)
3. [Database Creation](#3-database-creation)
4. [Database Migration](#4-database-migration)
5. [Database Seeding](#5-database-seeding)
6. [Backend Startup](#6-backend-startup)
7. [Frontend Startup](#7-frontend-startup)
8. [Production-Like Local Startup](#8-production-like-local-startup)
9. [Verification Checklist](#9-verification-checklist)
10. [Test Users](#10-test-users)
11. [Database Backup](#11-database-backup)
12. [Database Restore](#12-database-restore)
13. [Reset Development Database](#13-reset-development-database)
14. [Operational Procedures](#14-operational-procedures)
15. [Troubleshooting](#15-troubleshooting)
16. [Architecture Reference](#16-architecture-reference)

---

## 1. Prerequisites

### Required Software

| Tool | Version | Purpose | Verify Command |
|------|---------|---------|----------------|
| Node.js | v24+ | Runtime | `node --version` |
| npm | v11+ | Package manager | `npm --version` |
| PostgreSQL | 18+ | Database | `psql --version` |
| Git | 2.x | Version control | `git --version` |

### Install Verification

```powershell
# Run in PowerShell
node --version        # Expected: v24.16.0+
npm --version         # Expected: 11.13.0+
psql --version        # Expected: psql (PostgreSQL) 18.4+
git --version         # Expected: git version 2.55.0+
```

### Project Structure

```
NurseHandOver/
├── client/                    # React frontend (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   ├── hooks/             # React Query hooks (useApi.ts)
│   │   ├── pages/             # All page components
│   │   ├── contexts/          # Auth context
│   │   ├── App.tsx            # Route definitions
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── server/                    # Express backend (TypeScript)
│   ├── src/
│   │   ├── config/            # Environment config (env.ts)
│   │   ├── middleware/         # Auth, error handling
│   │   ├── routes/            # API route handlers
│   │   ├── lib/               # Business logic (completeness.ts)
│   │   └── index.ts           # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   ├── seed.ts            # Test data seeder
│   │   └── migrations/        # Migration history
│   ├── .env                   # Environment variables
│   └── package.json
├── docs/                      # Documentation
├── .env.example               # Environment template
├── .gitignore
├── package.json               # Root scripts (concurrently)
└── README.md
```

---

## 2. Local PostgreSQL Setup

### Status

PostgreSQL 18.4 is already installed and running on this machine.

```
Host:     localhost
Port:     5432
User:     postgres
Password: postgres
Encoding: UTF8
```

### Verify PostgreSQL is Running

```powershell
# Check if PostgreSQL service is running
Get-Service -Name "postgresql*"

# Test connection
psql -U postgres -c "SELECT version();"
```

### Create PostgreSQL User (if needed)

```sql
-- Only needed if the postgres user doesn't exist or has a different password
-- Connect as superuser first:
psql -U postgres

-- Set password (if not already set):
ALTER USER postgres WITH PASSWORD 'postgres';

-- Exit
\q
```

### Create Database

```powershell
# Create the development database
psql -U postgres -c "CREATE DATABASE nurse_handover_dev;"

# Verify creation
psql -U postgres -l | Select-String "nurse_handover"
```

---

## 3. Database Creation

The project uses a single development database: `nurse_handover_dev`

### Quick Setup

```powershell
# From project root (C:\Projects\NurseHandOver)
psql -U postgres -c "CREATE DATABASE nurse_handover_dev;"
```

### Full Database Setup (Fresh Install)

```powershell
# Step 1: Install all dependencies
npm run install:all

# Step 2: Create database
psql -U postgres -c "CREATE DATABASE nurse_handover_dev;"

# Step 3: Generate Prisma client
cd server
npx prisma generate

# Step 4: Run migrations
npx prisma migrate dev

# Step 5: Seed test data
npx tsx prisma/seed.ts

# Step 6: Return to root
cd ..
```

---

## 4. Database Migration

Prisma manages schema migrations. Three migration versions exist:

| Migration | Date | Description |
|-----------|------|-------------|
| `20260904135731_init` | Sep 4, 2026 | Initial schema (all core tables) |
| `20260905045656_add_blood_glucose_and_alert_rules` | Sep 5, 2026 | Blood glucose + alert rules |
| `20260905081000_add_task_enums_and_deferral` | Sep 5, 2026 | Task enum types + deferral |

### Apply Migrations

```powershell
cd server

# Development (creates migration + applies)
npx prisma migrate dev

# Production-like (applies pending only)
npx prisma migrate deploy

# Check status
npx prisma migrate status

cd ..
```

### Schema Changes

If you modify `server/prisma/schema.prisma`:

```powershell
cd server

# Create and apply new migration
npx prisma migrate dev --name descriptive_migration_name

# Regenerate Prisma client
npx prisma generate

cd ..
```

---

## 5. Database Seeding

The seed script creates synthetic test data for development.

### What Gets Created

| Entity | Count | Details |
|--------|-------|---------|
| Roles | 4 | NURSE, SUPERVISOR, ADMINISTRATOR, RESEARCHER |
| Users | 5 | 1 admin, 1 supervisor, 2 nurses, 1 researcher |
| Departments | 1 | General Medicine |
| Wards | 1 | Ward A (capacity: 20) |
| Rooms | 5 | Room 1-5 |
| Beds | 20 | 4 beds per room |
| Shifts | 2 | Day Shift (07:00-19:00), Night Shift (19:00-07:00) |
| Nurse Assignments | 2 | nurse1→Day/WardA, nurse2→Night/WardA |
| Patients | 5 | TEST-PATIENT-001 through 005 |
| Vital Signs | 5 | One random set per patient |
| Assessments | 5 | General assessment per patient |
| Tasks | 5 | One monitoring task per patient |
| Audit Logs | 1 | Seed completion record |

### Seed Command

```powershell
cd server
npx tsx prisma/seed.ts
cd ..
```

### Re-seed (Reset + Seed)

```powershell
cd server

# Drops all data, re-applies migrations, re-seeds
npx prisma migrate reset --force

# Then seed
npx tsx prisma/seed.ts

cd ..
```

---

## 6. Backend Startup

### Development Mode

```powershell
# From project root
npm run dev:server

# Or from server directory
cd server
npm run dev
```

The server starts with:
- **Port:** 3000 (configurable via `PORT` in `.env`)
- **Hot reload:** Enabled via `tsx watch`
- **CORS:** Allows `http://localhost:5173`
- **Rate limiting:** 100 req/15min (general), 10 req/15min (auth)

### Verify Backend

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method GET

# Expected response:
# { "success": true, "data": { "status": "healthy", ... } }
```

### Environment Variables (`server/.env`)

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nurse_handover_dev
JWT_SECRET=test-secret-key-for-development-only
JWT_EXPIRES_IN=24h
```

**Note:** `JWT_SECRET` must be at least 32 characters. The development secret is `test-secret-key-for-development-only` (36 chars).

---

## 7. Frontend Startup

### Development Mode

```powershell
# From project root
npm run dev:client

# Or from client directory
cd client
npm run dev
```

The frontend starts with:
- **Port:** 5173 (Vite default)
- **Hot reload:** Enabled
- **Proxy:** `/api` requests forwarded to `http://localhost:3000`

### Verify Frontend

```powershell
# Check if Vite is serving
Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing | Select-Object StatusCode

# Expected: 200
```

### Build for Production

```powershell
cd client
npm run build       # Outputs to client/dist/
npm run preview     # Preview production build on port 4173
```

---

## 8. Production-Like Local Startup

Run both frontend and backend simultaneously:

```powershell
# From project root — starts both servers
npm run dev
```

This uses `concurrently` to run:
- `npm run dev:server` (port 3000)
- `npm run dev:client` (port 5173)

### Full Production Build (Local)

```powershell
# Build both
npm run build

# Start backend in production mode
cd server
set NODE_ENV=production
npm start           # Runs: node dist/index.js

# Serve frontend (in separate terminal)
cd client
npm run preview     # Serves dist/ on port 4173
```

### Health Checks

```powershell
# Backend health
Invoke-RestMethod "http://localhost:3000/api/v1/health"

# Frontend (will return HTML)
Invoke-WebRequest "http://localhost:5173" -UseBasicParsing | Select-Object StatusCode
```

---

## 9. Verification Checklist

### 9.1 PostgreSQL

```powershell
# Verify connection
psql -U postgres -d nurse_handover_dev -c "\dt"

# Expected: List of all 24 tables
# alert_rules, audit_logs, beds, departments, handover_*, ...
```

### 9.2 Backend

```powershell
# Health endpoint
$r = Invoke-RestMethod "http://localhost:3000/api/v1/health"
$r.success          # Expected: True
$r.data.status      # Expected: "healthy"
```

### 9.3 Authentication

```powershell
# Login as admin
$body = @{ email = "admin@example.local"; password = "password123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json"
$login.success      # Expected: True
$login.data.token   # Expected: JWT token string
$login.data.user.email  # Expected: admin@example.local
$login.data.user.roles  # Expected: ["ADMINISTRATOR"]
```

### 9.4 Patient Workflow

```powershell
# Use token from auth step
$token = $login.data.token
$headers = @{ Authorization = "Bearer $token" }

# List patients
$patients = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/patients" -Headers $headers
$patients.success   # Expected: True
$patients.data.Length  # Expected: 5

# Get patient detail
$pid = $patients.data[0].id
$detail = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/patients/$pid" -Headers $headers
$detail.data.firstName  # Expected: "Patient1"

# Record vital signs
$body = @{
    patientId = $pid
    temperature = 36.8
    heartRate = 72
    respiratoryRate = 16
    bloodPressureSystolic = 120
    bloodPressureDiastolic = 80
    oxygenSaturation = 98
    painScale = 2
} | ConvertTo-Json
$vitals = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/vital-signs" -Method POST -Body $body -ContentType "application/json" -Headers $headers
$vitals.success     # Expected: True

# Create assessment
$body = @{
    patientId = $pid
    assessmentType = "General"
    findings = "Patient stable. No acute distress."
    painScale = 2
} | ConvertTo-Json
$assess = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/assessments" -Method POST -Body $body -ContentType "application/json" -Headers $headers
$assess.success     # Expected: True
```

### 9.5 Handover Workflow

```powershell
# Create handover (as nurse1)
$nurseBody = @{ email = "nurse1@example.local"; password = "password123" } | ConvertTo-Json
$nurseLogin = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method POST -Body $nurseBody -ContentType "application/json"
$nurseToken = $nurseLogin.data.token
$nurseHeaders = @{ Authorization = "Bearer $nurseToken" }

# Get first patient and shift
$patients = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/patients" -Headers $nurseHeaders
$shifts = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/shifts" -Headers $nurseHeaders
$pid = $patients.data[0].id
$sid = $shifts.data[0].id

# Create handover
$body = @{
    patientId = $pid
    shiftId = $sid
    sections = @{
        SITUATION = "Patient admitted with chest pain. ECG normal."
        BACKGROUND = "History of hypertension, diabetes type 2."
        ASSESSMENT = "Patient stable. Pain managed with paracetamol."
        RECOMMENDATION = "Continue monitoring. Follow up cardiology."
    }
} | ConvertTo-Json -Depth 3
$ho = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/handovers" -Method POST -Body $body -ContentType "application/json" -Headers $nurseHeaders
$ho.success         # Expected: True
$hoId = $ho.data.id

# Submit for review
$body = @{ status = "READY_FOR_REVIEW" } | ConvertTo-Json
$submit = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/handovers/$hoId/transition" -Method POST -Body $body -ContentType "application/json" -Headers $nurseHeaders
$submit.success     # Expected: True

# Submit (incoming nurse receives)
$body = @{ status = "SUBMITTED" } | ConvertTo-Json
$submitted = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/handovers/$hoId/transition" -Method POST -Body $body -ContentType "application/json" -Headers $nurseHeaders
$submitted.success  # Expected: True

# Receive (as nurse2 - incoming nurse)
$nurse2Body = @{ email = "nurse2@example.local"; password = "password123" } | ConvertTo-Json
$nurse2Login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method POST -Body $nurse2Body -ContentType "application/json"
$nurse2Headers = @{ Authorization = "Bearer $($nurse2Login.data.token)" }

$body = @{ status = "RECEIVED" } | ConvertTo-Json
$received = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/handovers/$hoId/transition" -Method POST -Body $body -ContentType "application/json" -Headers $nurse2Headers
$received.success   # Expected: True

# Accept
$body = @{ status = "ACCEPTED" } | ConvertTo-Json
$accepted = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/handovers/$hoId/transition" -Method POST -Body $body -ContentType "application/json" -Headers $nurse2Headers
$accepted.success   # Expected: True
```

### 9.6 Research Module

```powershell
# Login as researcher
$researchBody = @{ email = "researcher@example.local"; password = "password123" } | ConvertTo-Json
$researchLogin = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method POST -Body $researchBody -ContentType "application/json"
$researchHeaders = @{ Authorization = "Bearer $($researchLogin.data.token)" }

# Create research study
$body = @{
    title = "Handover Effectiveness Study"
    description = "Evaluating SBAR handover quality"
    status = "active"
} | ConvertTo-Json
$study = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/research/studies" -Method POST -Body $body -ContentType "application/json" -Headers $researchHeaders
$study.success      # Expected: True
$studyId = $study.data.id

# List studies
$studies = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/research/studies" -Headers $researchHeaders
$studies.success    # Expected: True

# Get study detail
$studyDetail = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/research/studies/$studyId" -Headers $researchHeaders
$studyDetail.success  # Expected: True
```

---

## 10. Test Users

All users have password: `password123`

| Email | Role | Ward Assignment |
|-------|------|-----------------|
| `admin@example.local` | ADMINISTRATOR | None (full access) |
| `supervisor@example.local` | SUPERVISOR | Ward A |
| `nurse1@example.local` | NURSE | Ward A (Day Shift) |
| `nurse2@example.local` | NURSE | Ward A (Night Shift) |
| `researcher@example.local` | RESEARCHER | None (de-identified data) |

### Role Capabilities

| Role | Can Do |
|------|--------|
| NURSE | Record vitals, create assessments, manage tasks, create/submit handovers |
| SUPERVISOR | All nurse capabilities + view ward overview, manage assignments |
| ADMINISTRATOR | Full system access, manage departments/wards/rooms/beds/shifts/users |
| RESEARCHER | View de-identified research data, manage studies/participants |

---

## 11. Database Backup

### Backup Command

```powershell
# Create timestamped backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "C:\Projects\NurseHandOver\backups\nurse_handover_dev_$timestamp.sql"

# Ensure backups directory exists
New-Item -ItemType Directory -Force -Path "C:\Projects\NurseHandOver\backups"

# Create backup
pg_dump -U postgres -d nurse_handover_dev -f $backupFile

Write-Host "Backup created: $backupFile"
```

### Backup Script (One-liner)

```powershell
pg_dump -U postgres -d nurse_handover_dev -f "C:\Projects\NurseHandOver\backups\nurse_handover_dev_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
```

### Backup as Custom Format (Compressed)

```powershell
pg_dump -U postgres -d nurse_handover_dev -Fc -f "C:\Projects\NurseHandOver\backups\nurse_handover_dev_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
```

### List Backups

```powershell
Get-ChildItem "C:\Projects\NurseHandOver\backups\" -Filter "*.sql" | Sort-Object LastWriteTime -Descending
```

---

## 12. Database Restore

### Restore from SQL Backup

```powershell
# Stop the backend first, then:
psql -U postgres -d nurse_handover_dev -f "C:\Projects\NurseHandOver\backups\nurse_handover_dev_YYYYMMDD_HHmmSS.sql"
```

### Restore from Custom Format Backup

```powershell
# Drop and recreate database first
psql -U postgres -c "DROP DATABASE IF EXISTS nurse_handover_dev;"
psql -U postgres -c "CREATE DATABASE nurse_handover_dev;"

# Restore
pg_restore -U postgres -d nurse_handover_dev "C:\Projects\NurseHandOver\backups\nurse_handover_dev_YYYYMMDD_HHmmSS.dump"
```

### Restore Procedure (Full Reset)

```powershell
# 1. Stop backend (Ctrl+C in server terminal)

# 2. Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS nurse_handover_dev;"
psql -U postgres -c "CREATE DATABASE nurse_handover_dev;"

# 3. Apply migrations
cd server
npx prisma migrate deploy

# 4. Restore backup (choose one)
# Option A: From SQL file
psql -U postgres -d nurse_handover_dev -f "..\backups\filename.sql"

# Option B: From dump file
pg_restore -U postgres -d nurse_handover_dev "..\backups\filename.dump"

# Option C: Re-seed instead
npx tsx prisma/seed.ts

cd ..
```

---

## 13. Reset Development Database

### Quick Reset (Drop + Migrate + Seed)

```powershell
cd server

# Drops all data, re-applies migrations, runs seed
npx prisma migrate reset --force

# If seed doesn't run automatically:
npx tsx prisma/seed.ts

cd ..
```

### Manual Reset

```powershell
# 1. Drop and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS nurse_handover_dev;"
psql -U postgres -c "CREATE DATABASE nurse_handover_dev;"

# 2. Apply migrations
cd server
npx prisma migrate deploy

# 3. Seed data
npx tsx prisma/seed.ts

cd ..
```

### Reset Without Re-seeding

```powershell
cd server
npx prisma migrate reset --force --skip-seed
cd ..
```

---

## 14. Operational Procedures

### How to Start the System

```powershell
# Full stack (recommended)
cd C:\Projects\NurseHandOver
npm run dev

# Backend only
npm run dev:server

# Frontend only
npm run dev:client
```

### How to Stop the System

```powershell
# Press Ctrl+C in the terminal running npm run dev
# This stops both frontend and backend

# If using separate terminals:
# Press Ctrl+C in each terminal
```

### How to Create Test Data

```powershell
# Re-seed (resets everything)
cd server
npx prisma migrate reset --force
npx tsx prisma/seed.ts
cd ..

# Or just re-seed without reset (will fail on duplicates)
cd server
npx tsx prisma/seed.ts
cd ..
```

### How to Check System Status

```powershell
# Backend health
Invoke-RestMethod "http://localhost:3000/api/v1/health"

# Frontend
Invoke-WebRequest "http://localhost:5173" -UseBasicParsing | Select-Object StatusCode

# Database
psql -U postgres -d nurse_handover_dev -c "SELECT COUNT(*) FROM users;"
```

### How to View Database

```powershell
# Using psql
psql -U postgres -d nurse_handover_dev

# Useful commands:
\dt                  # List tables
\d users             # Describe users table
SELECT * FROM users; # Query data
\q                   # Quit

# Using Prisma Studio (web UI)
cd server
npx prisma studio    # Opens at http://localhost:5555
```

---

## 15. Troubleshooting

### PostgreSQL Won't Start

```powershell
# Check if service exists
Get-Service -Name "postgresql*"

# Start service
Start-Service -Name "postgresql*"

# If service doesn't exist, start manually:
"C:\Program Files\PostgreSQL\18\bin\pg_ctl" start -D "C:\Program Files\PostgreSQL\18\data"
```

### Connection Refused

```powershell
# Verify PostgreSQL is running
Test-NetConnection -ComputerName localhost -Port 5432

# Check if port is in use
netstat -ano | findstr :5432
```

### Backend Won't Start

```powershell
# Common causes:

# 1. Port 3000 already in use
netstat -ano | findstr :3000
# Kill the process using that port

# 2. Invalid .env configuration
cd server
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"

# 3. Database not accessible
psql -U postgres -d nurse_handover_dev -c "SELECT 1;"

# 4. Prisma client not generated
cd server
npx prisma generate
```

### Frontend Won't Start

```powershell
# Common causes:

# 1. Port 5173 already in use
netstat -ano | findstr :5173

# 2. Node modules not installed
cd client
npm install

# 3. TypeScript errors
npm run typecheck
```

### Migration Errors

```powershell
cd server

# Check migration status
npx prisma migrate status

# If migrations are out of sync:
npx prisma migrate reset --force

# If migration files are missing:
npx prisma migrate dev --name fix_migrations
```

### Authentication Errors

```powershell
# JWT_SECRET too short (must be >= 32 chars)
# Check server/.env:
cat server/.env

# Rate limit exceeded (10 req/15min for auth)
# Wait 15 minutes or restart the server
```

### Seed Fails

```powershell
cd server

# If table already exists (duplicate key error):
npx prisma migrate reset --force
npx tsx prisma/seed.ts

# If Prisma client is outdated:
npx prisma generate
npx tsx prisma/seed.ts
```

### CORS Errors

The backend allows `http://localhost:5173` in development. If you're accessing from a different URL:

```powershell
# Check server/src/index.ts CORS configuration:
# origin: env.NODE_ENV === 'production' ? false : ['http://localhost:5173']
```

### Database Connection Pool Exhausted

```powershell
# Check active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'nurse_handover_dev';"

# Kill idle connections
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'nurse_handover_dev' AND state = 'idle';"
```

### Prisma Studio Won't Start

```powershell
cd server

# Kill any existing Prisma Studio process
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*prisma*" } | Stop-Process -Force

# Start fresh
npx prisma studio
```

---

## 16. Architecture Reference

### API Endpoints (Verified)

| Method | Endpoint | Description | Verified |
|--------|----------|-------------|----------|
| GET | `/api/v1/health` | Health check | Yes |
| POST | `/api/v1/auth/login` | User login | Yes |
| POST | `/api/v1/auth/logout` | User logout | Yes |
| GET | `/api/v1/auth/me` | Current user profile | Yes |
| POST | `/api/v1/auth/change-password` | Change password | Yes |
| GET | `/api/v1/users` | List users (admin) | Yes |
| GET | `/api/v1/patients` | List patients (nurse-scoped) | Yes |
| GET | `/api/v1/patients/:id` | Patient detail | Yes |
| POST | `/api/v1/patients` | Create patient (admin/supervisor) | Yes |
| PUT | `/api/v1/patients/:id` | Update patient | Yes |
| DELETE | `/api/v1/patients/:id` | Delete patient (admin) | Yes |
| GET | `/api/v1/patients/:id/vitals` | Patient vital signs | Yes |
| POST | `/api/v1/patients/:id/vitals` | Record vital signs | Yes |
| GET | `/api/v1/patients/:id/assessments` | Patient assessments | Yes |
| POST | `/api/v1/patients/:id/assessments` | Create assessment | Yes |
| GET | `/api/v1/patients/:id/tasks` | Patient tasks | Yes |
| POST | `/api/v1/patients/:id/tasks` | Create patient task | Yes |
| GET | `/api/v1/patients/:id/timeline` | Patient timeline | Yes |
| GET | `/api/v1/tasks` | List tasks | Yes |
| POST | `/api/v1/tasks` | Create task | Yes |
| GET | `/api/v1/tasks/:id` | Task detail | Yes |
| PUT | `/api/v1/tasks/:id` | Update task | Yes |
| POST | `/api/v1/tasks/:id/transition` | Task state change | Yes |
| POST | `/api/v1/tasks/:id/assign` | Assign task | Yes |
| DELETE | `/api/v1/tasks/:id` | Delete task | Yes |
| GET | `/api/v1/handovers` | List handovers | Yes |
| POST | `/api/v1/handovers` | Create handover | Yes |
| GET | `/api/v1/handovers/:id` | Handover detail | Yes |
| PUT | `/api/v1/handovers/:id` | Update handover | Yes |
| POST | `/api/v1/handovers/:id/transition` | State transition | Yes |
| GET | `/api/v1/handovers/:id/populate` | Auto-populate SBAR | Yes |
| POST | `/api/v1/handovers/:id/clarifications` | Request clarification | Yes |
| PUT | `/api/v1/handovers/:id/clarifications/:cid/respond` | Respond to clarification | Yes |
| DELETE | `/api/v1/handovers/:id` | Delete handover (draft) | Yes |
| GET | `/api/v1/notifications` | List notifications | Yes |
| PUT | `/api/v1/notifications/:id/read` | Mark read | Yes |
| PUT | `/api/v1/notifications/read-all` | Mark all read | Yes |
| GET | `/api/v1/supervisor/dashboard` | Supervisor dashboard | Yes |
| GET | `/api/v1/analytics` | Analytics data | Yes |
| GET | `/api/v1/research/studies` | List research studies | Yes |
| POST | `/api/v1/research/studies` | Create research study | Yes |
| GET | `/api/v1/research/studies/:id` | Research study detail | Yes |
| POST | `/api/v1/research/studies/:id/participants` | Add participant | Yes |
| GET | `/api/v1/research/studies/:id/participants` | List participants | Yes |
| POST | `/api/v1/research/studies/:id/surveys` | Create survey | Yes |
| GET | `/api/v1/research/studies/:id/surveys` | List surveys | Yes |
| POST | `/api/v1/research/surveys/:id/questions` | Add survey question | Yes |
| POST | `/api/v1/research/studies/:id/metrics` | Add metric | Yes |
| GET | `/api/v1/research/studies/:id/metrics` | List metrics | Yes |
| GET | `/api/v1/research/studies/:id/export/csv` | Export CSV | Yes |
| GET | `/api/v1/research/studies/:id/export/xlsx` | Export XLSX | Yes |
| GET | `/api/v1/departments` | List departments | Yes |
| GET | `/api/v1/wards` | List wards | Yes |
| GET | `/api/v1/rooms` | List rooms | Yes |
| GET | `/api/v1/beds` | List beds | Yes |
| GET | `/api/v1/shifts` | List shifts | Yes |
| GET | `/api/v1/assignments` | List nurse assignments | Yes |
| GET | `/api/v1/audit-logs` | Audit log viewer | Yes |
| GET | `/api/v1/alert-rules` | Alert rules | Yes |

**Note:** Research module enum constraints:
- Participant `role`: must be `"NURSE"` or `"SUPERVISOR"`
- Survey question `questionType`: must be `"likert"`, `"multiple_choice"`, `"text"`, or `"numeric"`
- Metric `period`: must be `"pre"` or `"post"`
- CSV/XLSX export requires `?type=metrics` or `?type=surveys` query parameter

### Database Tables (24 total)

```
users, roles, user_roles, departments, wards, rooms, beds,
shifts, nurse_assignments, patients, vital_signs,
nursing_assessments, nursing_tasks, handovers, handover_sections,
handover_versions, handover_events, handover_clarifications,
alert_rules, notifications, audit_logs, research_studies,
research_participants, research_surveys, survey_questions,
survey_responses, research_metrics
```

### Handover State Machine

```
DRAFT → READY_FOR_REVIEW → SUBMITTED → RECEIVED → ACCEPTED
                                        ↓
                                CLARIFICATION_REQUIRED
                                        ↓
                                CLARIFICATION_RESPONDED → ACCEPTED

ACCEPTED → REOPENED → SUBMITTED (cycle)

Any non-terminal state → CANCELLED
```

### Task State Machine

```
PENDING → IN_PROGRESS → COMPLETED
                      → DEFERRED → IN_PROGRESS (resume)

PENDING → CANCELLED
IN_PROGRESS → CANCELLED
```

---

## 17. Verification Results (September 6, 2026)

All systems verified locally on DESKTOP-FHOUH4H.

### System Status

| Component | Status | Details |
|-----------|--------|---------|
| PostgreSQL | Running | localhost:5432, PostgreSQL 18.4 |
| Database | Created | nurse_handover_dev, 28 tables |
| Migrations | Applied | 3/3 migrations current |
| Seed Data | Loaded | 6 users, 11 patients, 4 roles, 1 department, 1 ward, 5 rooms, 20 beds, 2 shifts |
| Backend | Running | localhost:3000, Express + TypeScript |
| Frontend | Running | localhost:5173, Vite + React + Tailwind |
| TypeScript | Clean | 0 errors (server + client) |
| Lint | Clean | 0 errors (server + client) |
| Build | Success | Frontend production build: 918KB JS, 27KB CSS |

### Workflow Verification

| Workflow | Status | Details |
|----------|--------|---------|
| Authentication | Passed | All 5 users login successfully, invalid credentials rejected |
| Patient List | Passed | 11 patients returned (5 seed + 6 E2E test) |
| Patient Detail | Passed | Full patient data with ward, bed, status |
| Record Vital Signs | Passed | 8 parameters recorded, clinical ranges validated |
| Create Assessment | Passed | 13 assessment categories available |
| Create Task | Passed | Priority and status tracking working |
| Create Handover | Passed | 4 SBAR sections, auto-completeness scoring |
| Handover Workflow | Passed | DRAFT → READY_FOR_REVIEW → SUBMITTED → RECEIVED → ACCEPTED |
| Version History | Passed | 5 versions, 6 events tracked |
| Notifications | Passed | 2 notifications generated during handover workflow |
| Research Study | Passed | Study creation and listing working |
| Research Participant | Passed | Added with NURSE role |
| Research Survey | Passed | Created with likert question |
| Research Metric | Passed | Added with pre period |
| CSV Export | Passed | 157 bytes, valid CSV format |
| Supervisor Dashboard | Passed | Returns 0 (supervisor has no ward assignment — correct) |
| Analytics | Passed | Summary metrics and handover status data |

### Test Users

| Email | Password | Role | Ward |
|-------|----------|------|------|
| admin@example.local | password123 | ADMINISTRATOR | — |
| supervisor@example.local | password123 | SUPERVISOR | — (no assignment) |
| nurse1@example.local | password123 | NURSE | Ward A (Day) |
| nurse2@example.local | password123 | NURSE | Ward A (Night) |
| researcher@example.local | password123 | RESEARCHER | — |

---

*Document generated as part of Phase 20: Local Deployment*
*Last verified: September 6, 2026*
