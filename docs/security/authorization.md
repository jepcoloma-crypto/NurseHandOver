# NurseHandOver — Authorization

## Overview

The NurseHandOver system uses Role-Based Access Control (RBAC) with resource-level authorization.

## Roles

| Role | Description |
|------|-------------|
| NURSE | Clinical staff with patient care access |
| SUPERVISOR | Ward management and oversight |
| ADMINISTRATOR | System administration |
| RESEARCHER | Research data access |

## Role Permissions

### NURSE
- View assigned patients
- Record vital signs
- Create/edit handovers
- View incoming handovers
- Request/respond to clarifications
- Accept handovers
- Manage nursing tasks

### SUPERVISOR
- All NURSE permissions
- View all ward patients
- Assign nurses to patients
- Manage shifts
- Monitor handovers
- View reports and analytics

### ADMINISTRATOR
- All permissions
- Manage users
- Manage roles
- Manage departments/wards/rooms/beds
- Configure system settings
- View audit logs

### RESEARCHER
- View de-identified research data
- Manage research studies
- Manage surveys
- Export research metrics

## API Endpoints with Authorization

### User Management (ADMINISTRATOR only)

| Endpoint | Method | Roles |
|----------|--------|-------|
| /api/v1/users | GET | ADMINISTRATOR |
| /api/v1/users/:id | GET | ADMINISTRATOR |
| /api/v1/users | POST | ADMINISTRATOR |

### Patient Management

| Endpoint | Method | Roles | Resource Access |
|----------|--------|-------|-----------------|
| /api/v1/patients | GET | All | Ward/assignment based |
| /api/v1/patients/:id | GET | All | Resource-level |
| /api/v1/patients | POST | ADMINISTRATOR, SUPERVISOR | N/A |

## Resource-Level Authorization

### Patient Access Rules

1. **ADMINISTRATOR**: Full access to all patients
2. **SUPERVISOR**: Full access to patients in their ward
3. **NURSE**: Access only to:
   - Patients in wards where they are assigned
   - Patients involved in their handovers

### Authorization Flow

```
1. Request arrives with JWT token
2. Authentication middleware validates token
3. Authorization middleware checks role
4. Resource authorization checks patient access
5. Request proceeds or returns 403 Forbidden
```

## Middleware Stack

```
authenticate → authorize(roles) → authorizePatientAccess → route handler
```

## Error Responses

### Forbidden (Wrong Role)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### Forbidden (No Resource Access)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this patient"
  }
}
```

## Audit Logging

All authorization decisions are logged:
- Successful logins
- Failed login attempts
- Password changes
- User creation
- Patient access

## Security Considerations

1. Never trust client-side authorization
2. Always validate permissions server-side
3. Log all security-relevant events
4. Use parameterized queries (Prisma ORM)
5. Validate all input with Zod schemas
