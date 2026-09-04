# NurseHandOver — Project Requirements

## Project Identity

| Field | Value |
|-------|-------|
| Project Name | NurseHandOver |
| Project Type | Web-based Nursing Shift Handover and Continuity of Care System |
| Academic Context | Master's in Nursing — Technology Solutions Project |
| Primary Objective | Develop a secure, structured digital nursing shift handover system that improves completeness, organization, traceability, and continuity of nurse-to-nurse patient handover |

## System Purpose

Structured SBAR-based workflow (Situation, Background, Assessment, Recommendation) for nursing communication and handover.

### Exclusions — The system is NOT intended to replace:

- Hospital EMR/EHR systems
- Physician orders
- Clinical judgment
- Nursing judgment
- Hospital policies
- Clinical protocols
- Medication prescribing systems
- Diagnostic systems

## Core Handover Workflow

```
LOGIN → SELECT WARD/SHIFT → VIEW ASSIGNED PATIENTS → SELECT PATIENT →
REVIEW PATIENT INFORMATION → UPDATE ASSESSMENT → REVIEW VITAL SIGNS →
REVIEW TASKS → CREATE SBAR HANDOVER → VALIDATE REQUIRED INFORMATION →
REVIEW HANDOVER → SUBMIT HANDOVER → INCOMING NURSE RECEIVES HANDOVER →
REVIEW SBAR → REVIEW PATIENT INFORMATION → REVIEW PENDING TASKS →
REQUEST CLARIFICATION IF REQUIRED → CLARIFICATION RESOLVED →
ACCEPT HANDOVER → RESPONSIBILITY TRANSFER → CONTINUES PATIENT CARE →
NEXT SHIFT → NEW HANDOVER
```

## Handover State Machine

| State | Description |
|-------|-------------|
| DRAFT | Initial state, handover being created |
| READY_FOR_REVIEW | All required fields completed |
| SUBMITTED | Outgoing nurse has submitted |
| RECEIVED | Incoming nurse has received |
| CLARIFICATION_REQUIRED | Clarification requested |
| CLARIFICATION_RESPONDED | Clarification provided |
| ACCEPTED | Incoming nurse accepted |
| REOPENED | Handover reopened after acceptance |
| CANCELLED | Handover cancelled |

State transitions are validated by the backend. Frontend cannot arbitrary change status.

## SBAR Structure

### Situation
- Current condition
- Main concern
- Current status
- Immediate concerns

### Background
- Diagnosis summary
- Relevant history
- Allergies
- Admission information
- Relevant procedures/events

### Assessment
- Latest vital signs
- Nursing assessment
- Pain assessment
- Relevant observations
- Current patient status

### Recommendation
- Pending tasks
- Required monitoring
- Follow-up items
- Relevant orders/instructions
- Nursing recommendations
- Important information for incoming nurse

## Handover Completeness Score

```
completed required fields
-------------------------- × 100 = HANDOVER COMPLETENESS SCORE
required fields
```

**Important:** This is NOT a clinical accuracy score. 94% completeness means 94% of configured required information was completed, NOT 94% clinically correct.

## User Roles

### Nurse
- Login, view assigned patients, view patient information
- Record vital signs, record nursing assessment
- Create, edit draft, submit handover
- View incoming handovers, request/respond to clarification
- Accept handover, manage assigned nursing tasks
- View own handover history

### Supervisor
- View assigned ward, view nurses
- Assign nurses to patients, manage shifts
- Monitor handovers, view incomplete/pending handovers
- View clarification requests, task status, reports, analytics

### Administrator
- Manage users, roles, departments, wards, rooms, beds
- Configure shifts, system settings
- View security/audit logs
- Privileges must NOT automatically provide unrestricted clinical access

### Researcher
- Manage research studies, participants
- Access approved de-identified research data
- View research metrics, manage evaluation surveys
- Export de-identified datasets
- Access must be separated from ordinary clinical access

## Core System Modules

1. Authentication
2. Authorization / RBAC
3. User Management
4. Role Management
5. Department Management
6. Ward Management
7. Room Management
8. Bed Management
9. Shift Management
10. Nurse Assignment
11. Patient Management
12. Vital Signs
13. Nursing Assessment
14. Nursing Tasks
15. SBAR Handover
16. Handover Validation
17. Handover Submission
18. Incoming Handover Review
19. Clarification
20. Handover Acceptance
21. Handover Versioning
22. Handover Events
23. Notifications
24. Supervisor Dashboard
25. Reports
26. Analytics
27. Audit Logging
28. Research Evaluation
29. De-identified Research Export
30. System Configuration

## Database Requirements

- PostgreSQL
- UUID primary keys
- Foreign keys, unique constraints, indexes, check constraints
- Timestamps, soft deletion only where justified
- Use Prisma ORM with migrations

## Security Requirements

- Secure password hashing
- Authentication and Authorization
- RBAC (Role-Based Access Control)
- Resource-level authorization
- Input validation
- SQL injection protection
- XSS protection
- Secure HTTP headers
- Rate limiting
- Secure cookies/token handling
- Session management
- Audit logging
- Error handling without sensitive information
- Environment variables for secrets
- Database least-privilege principles

## Data Privacy

- Use synthetic patient information only
- Never use real patient names, addresses, MRNs, phone numbers, IDs, photographs, or medical documents
- Research datasets must be de-identified

## Clinical Safety Requirements

The application must NOT:
- Diagnose patients
- Prescribe medications
- Automatically determine treatment
- Replace nursing judgment
- Replace physician judgment
- Override hospital protocols

Any automated alert must be described as "Configured alert based on recorded information."

## API Design

- REST API with JSON
- Versioned: `/api/v1`
- Consistent response structure (success/data/error pattern)

## Development Phases

| Phase | Description |
|-------|-------------|
| 0 | Environment and requirements validation |
| 1 | Project foundation |
| 2 | Database architecture and migrations |
| 3 | Authentication and authorization |
| 4 | Hospital/ward/shift/user management |
| 5 | Patient management |
| 6 | Vital signs and nursing assessment |
| 7 | Nursing task management |
| 8 | Core SBAR handover |
| 9 | Handover validation and completeness |
| 10 | Incoming handover, clarification, acceptance |
| 11 | Handover history, versioning and audit |
| 12 | Notifications |
| 13 | Nurse dashboard |
| 14 | Supervisor dashboard |
| 15 | Reports and analytics |
| 16 | Research evaluation module |
| 17 | Security hardening |
| 18 | Automated testing |
| 19 | UI/UX refinement and accessibility |
| 20 | Local deployment and final documentation |

## Quality Standards

- Maintainable
- Modular
- Testable
- Secure
- Locally deployable
- Database-driven
- Responsive
- Accessible
- Auditable
- Research-ready
- Documented
