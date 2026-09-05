# NurseHandOver — Database Migrations

## Overview

This document describes the database migration strategy for the NurseHandOver system.

## Migration Commands

### Create Migration
```bash
cd server
npx prisma migrate dev --name <migration_name>
```

### Apply Migrations (Production)
```bash
cd server
npx prisma migrate deploy
```

### Reset Database
```bash
cd server
npx prisma migrate reset
```

### Check Status
```bash
cd server
npx prisma migrate status
```

## Rollback Strategy

Prisma uses a forward-only migration strategy. To rollback:

1. Create a new migration that reverses the changes
2. Apply the migration

### Example Rollback

If a migration adds a column:
```sql
-- Forward migration
ALTER TABLE patients ADD COLUMN middle_name VARCHAR(100);
```

Create rollback migration:
```sql
-- Rollback migration
ALTER TABLE patients DROP COLUMN middle_name;
```

## Migration History

| Migration | Description | Date |
|-----------|-------------|------|
| 20260904135731_init | Initial schema with all tables | 2026-09-04 |

## Database Objects

### Tables Created (26)
- users
- roles
- user_roles
- departments
- wards
- rooms
- beds
- shifts
- nurse_assignments
- patients
- vital_signs
- nursing_assessments
- nursing_tasks
- handovers
- handover_sections
- handover_versions
- handover_events
- handover_clarifications
- notifications
- audit_logs
- research_studies
- research_participants
- research_surveys
- survey_questions
- survey_responses
- research_metrics

### Indexes Created
- vital_signs: (patient_id, recorded_at)
- nursing_assessments: (patient_id, assessed_at)
- nursing_tasks: (patient_id, status)
- handovers: (patient_id, status), (outgoing_nurse_id, status), (incoming_nurse_id, status)
- handover_events: (handover_id, created_at)
- handover_clarifications: (handover_id, status)
- notifications: (user_id, is_read)
- audit_logs: (user_id, created_at), (entity, entity_id)
- research_metrics: (study_id, metric_name)

### Unique Constraints
- users: email
- roles: name
- user_roles: (user_id, role_id)
- departments: name
- wards: (name, department_id)
- rooms: (number, ward_id)
- beds: (number, room_id)
- patients: mrn
- handover_sections: (handover_id, section_type)
- research_participants: (study_id, user_id)

## Seed Data

### Seed Command
```bash
cd server
npx tsx prisma/seed.ts
```

### Seed Data Summary
- 5 users (admin, supervisor, 2 nurses, researcher)
- 4 roles (NURSE, SUPERVISOR, ADMINISTRATOR, RESEARCHER)
- 1 department (General Medicine)
- 1 ward (Ward A)
- 5 rooms with 4 beds each
- 2 shifts (Day, Night)
- 2 nurse assignments
- 5 test patients (TEST-PATIENT-001 to 005)
- Vital signs for each patient
- Nursing assessments for each patient
- Nursing tasks for each patient
- 1 audit log entry

### Synthetic Patient Data
All patient data uses obviously fictional identifiers:
- MRN: TEST-PATIENT-001 through TEST-PATIENT-005
- Names: Patient1 Test through Patient5 Test
- No real patient information is used
