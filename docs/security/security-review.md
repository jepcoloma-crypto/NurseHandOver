# Security Review - NurseHandOver

**Date:** 2026-09-06
**Phase:** 17 - Security Review
**Reviewer:** AI Security Agent
**Scope:** Full codebase (server + client) - Phase 0-16

---

## Executive Summary

The NurseHandOver application demonstrates a solid security posture for a development-stage healthcare application. The codebase leverages established security libraries (Helmet, bcrypt, Zod, Prisma ORM) and follows common security patterns. The audit identified **3 HIGH**, **4 MEDIUM**, and **5 LOW/INFORMATIONAL** findings, with **0 CRITICAL** findings after applying fixes in this phase.

**Findings summary after fixes:**
- HIGH: 0 (3 fixed in this review)
- MEDIUM: 4
- LOW: 3
- INFORMATIONAL: 2

---

## Findings

### FIXED - HIGH-01: Handover Detail Endpoint Missing Authorization (IDOR)

**File:** `server/src/routes/handovers.ts:125`
**CVSS:** 7.5 (High)
**Status:** FIXED

**Description:**
The `GET /handovers/:id` endpoint allowed any authenticated user to view any handover record by ID, regardless of whether they were the outgoing nurse, incoming nurse, or had administrative privileges.

**Impact:**
A nurse could access handover records for patients they are not assigned to, potentially exposing sensitive patient clinical information.

**Fix applied:**
Added authorization check requiring the requesting user to be the outgoing nurse, incoming nurse, or have ADMINISTRATOR/SUPERVISOR role.

```typescript
const userRoles = req.user?.roles || [];
if (!userRoles.includes('ADMINISTRATOR') && !userRoles.includes('SUPERVISOR')) {
  if (handover.outgoingNurseId !== req.user?.id && handover.incomingNurseId !== req.user?.id) {
    res.status(403).json({...});
    return;
  }
}
```

---

### FIXED - HIGH-02: Handover List Endpoint Missing Nurse Scoping

**File:** `server/src/routes/handovers.ts:103`
**CVSS:** 7.5 (High)
**Status:** FIXED

**Description:**
The `GET /handovers` list endpoint returned all handover records to any authenticated user without scoping to the user's assigned wards or nurse relationships.

**Impact:**
Nurses could enumerate and view all handovers across the entire hospital, not just those relevant to their assigned patients.

**Fix applied:**
Added nurse-scoping filter: non-admin, non-supervisor users only see handovers where they are the outgoing or incoming nurse.

```typescript
const userRoles = req.user?.roles || [];
if (!userRoles.includes('ADMINISTRATOR') && !userRoles.includes('SUPERVISOR')) {
  where.OR = [
    { outgoingNurseId: req.user?.id },
    { incomingNurseId: req.user?.id },
  ];
}
```

---

### FIXED - HIGH-03: Task Detail Endpoint Missing Authorization (IDOR)

**File:** `server/src/routes/tasks.ts:97`
**CVSS:** 7.5 (High)
**Status:** FIXED

**Description:**
The `GET /tasks/:id` endpoint allowed any authenticated user to view any task by ID without checking if the task was assigned to them.

**Impact:**
Nurses could access tasks assigned to other nurses, potentially viewing sensitive task details for patients not in their care.

**Fix applied:**
Added authorization check requiring the requesting user to be the assignee or have ADMINISTRATOR/SUPERVISOR role.

```typescript
const userRoles = req.user?.roles || [];
if (!userRoles.includes('ADMINISTRATOR') && !userRoles.includes('SUPERVISOR')) {
  if (task.assignedTo !== req.user?.id) {
    res.status(403).json({...});
    return;
  }
}
```

---

### MEDIUM-01: No Token Revocation on Logout

**File:** `server/src/routes/auth.ts:109`
**CVSS:** 5.3 (Medium)
**Status:** Open

**Description:**
JWT tokens are not revoked or blacklisted upon logout. The `POST /auth/logout` endpoint only logs the event to the audit log. A stolen token remains valid until its 24-hour expiry.

**Impact:**
If a token is compromised (e.g., XSS on client, physical device theft), the attacker has 24 hours of unrestricted access even after the legitimate user logs out.

**Recommendation:**
Implement a token blacklist (Redis or database) with TTL matching token expiry, or use shorter token lifetimes with refresh tokens.

---

### MEDIUM-02: JWT Stored in localStorage (XSS Risk)

**File:** `client/src/contexts/AuthContext.tsx:24`
**CVSS:** 5.3 (Medium)
**Status:** Open

**Description:**
The JWT token is stored in `localStorage`, which is accessible to any JavaScript running on the page. If an XSS vulnerability exists, the token can be exfiltrated.

**Impact:**
Combined with an XSS vulnerability, an attacker could steal the JWT and impersonate the user.

**Recommendation:**
For a healthcare application, consider using `httpOnly` cookies (which JavaScript cannot access) with `SameSite=Strict` and `Secure` flags. This eliminates the localStorage XSS vector.

---

### MEDIUM-03: CORS Disabled in Production

**File:** `server/src/index.ts:31`
**CVSS:** 4.0 (Medium)
**Status:** Open

**Description:**
CORS is set to `false` (disabled) in production mode, which blocks all cross-origin requests. While this is secure against unauthorized origins, it also blocks legitimate frontend deployments on different domains.

**Impact:**
If the frontend is deployed to a separate domain (e.g., `nurse-handover.hospital.org`), all API calls will be blocked by the browser.

**Recommendation:**
Configure CORS with an explicit allowlist of production origins instead of disabling it entirely.

---

### MEDIUM-04: Error Handler Leaks Route Details in Production

**File:** `server/src/middleware/errorHandler.ts:34`
**CVSS:** 3.7 (Medium)
**Status:** FIXED

**Description:**
The 404 not-found handler included `req.method` and `req.path` in the error response, leaking internal route structure.

**Impact:**
Attackers could enumerate API endpoints by probing non-existent paths.

**Fix applied:**
Changed response to a generic "The requested resource was not found" message.

---

### LOW-01: No Rate Limiting on Password Change

**File:** `server/src/routes/auth.ts:187`
**CVSS:** 3.1 (Low)
**Status:** Open

**Description:**
The `POST /auth/change-password` endpoint is not protected by the authentication rate limiter (only `authLimiter` covers `/auth` prefix, but `change-password` uses `authenticate` middleware and is not under the limiter path).

**Impact:**
An authenticated attacker could brute-force password changes if they know the current password (low practical risk since authentication is required).

**Recommendation:**
Apply rate limiting to the change-password endpoint, or ensure the general rate limiter covers it.

---

### LOW-02: Research Metrics Accept Arbitrary JSON Values

**File:** `server/src/routes/research.ts:61`
**CVSS:** 2.6 (Low)
**Status:** Open

**Description:**
The `metricValue` field accepts `z.any()`, allowing any JSON value to be stored without validation.

**Impact:**
Extremely large JSON payloads could be stored, potentially affecting database storage or causing issues when the data is consumed by analytics tools.

**Recommendation:**
Add a maximum size constraint for `metricValue` or validate against expected schemas per metric type.

---

### LOW-03: Console Error Logging in Development

**File:** `server/src/middleware/errorHandler.ts:18`
**CVSS:** 2.0 (Low)
**Status:** Open

**Description:**
Full error objects are logged to console in development mode, which may include sensitive data from failed requests.

**Impact:**
Development logs could contain patient data, user credentials, or other sensitive information.

**Recommendation:**
Use structured logging with sanitization. Ensure production logging excludes sensitive fields.

---

### INFORMATIONAL-01: Health Endpoint Unauthenticated

**File:** `server/src/routes/health.ts`
**Status:** Open (Acceptable)

**Description:**
The `GET /health` endpoint does not require authentication.

**Impact:**
None. Health endpoints are conventionally unauthenticated for monitoring systems.

---

### INFORMATIONAL-02: No Content Security Policy (CSP)

**File:** `server/src/index.ts`
**Status:** Open

**Description:**
Helmet is enabled but does not configure a Content Security Policy. The default Helmet CSP is restrictive but may need customization for the Vite frontend.

**Impact:**
Without explicit CSP, the application relies on browser defaults, which provide limited XSS protection.

**Recommendation:**
Configure Helmet CSP to match the application's needs (e.g., allow Vite dev server scripts in development).

---

## Security Controls Assessment

| Control | Status | Notes |
|---------|--------|-------|
| Authentication (JWT) | ✅ Implemented | Bearer token, 24h expiry |
| RBAC | ✅ Implemented | 4 roles: NURSE, SUPERVISOR, ADMINISTRATOR, RESEARCHER |
| Password Hashing | ✅ bcrypt (12 rounds) | Industry standard |
| Input Validation | ✅ Zod schemas | All endpoints validated |
| SQL Injection | ✅ Protected | Prisma ORM parameterized queries |
| Mass Assignment | ✅ Protected | Zod strict schemas, manual field selection |
| IDOR Protection | ✅ Fixed | Authorization checks on handover/task endpoints |
| Rate Limiting | ✅ Implemented | 100 req/15min general, 10 req/15min auth |
| Security Headers | ✅ Helmet | X-Frame-Options, HSTS, etc. |
| Audit Logging | ✅ Implemented | Login, CRUD, transitions logged |
| CORS | ⚠️ Needs production config | Disabled in prod (too restrictive) |
| Token Revocation | ❌ Not implemented | Logout only client-side |
| CSP | ⚠️ Default only | Helmet default, no custom policy |
| Session Management | ⚠️ JWT only | No refresh token mechanism |

---

## Files Reviewed

### Server
- `server/src/index.ts` - Express app setup, middleware, CORS, rate limiting
- `server/src/config/env.ts` - Environment validation with Zod
- `server/src/config/database.ts` - Prisma client
- `server/src/middleware/authenticate.ts` - JWT verification
- `server/src/middleware/authorize.ts` - Role-based access control
- `server/src/middleware/authorizePatient.ts` - Patient-level authorization
- `server/src/middleware/errorHandler.ts` - Error handling
- `server/src/lib/token.ts` - JWT sign/verify
- `server/src/lib/password.ts` - bcrypt hashing
- `server/src/routes/auth.ts` - Login, logout, password change
- `server/src/routes/handovers.ts` - Handover CRUD, transitions, clarifications
- `server/src/routes/tasks.ts` - Task CRUD, transitions, assignments
- `server/src/routes/notifications.ts` - Notification CRUD
- `server/src/routes/users.ts` - User management (admin only)
- `server/src/routes/auditLogs.ts` - Audit log viewing (admin only)
- `server/src/routes/research.ts` - Research study CRUD, exports
- `server/src/routes/analytics.ts` - Analytics queries
- `server/src/routes/supervisorDashboard.ts` - Supervisor dashboard

### Client
- `client/src/contexts/AuthContext.tsx` - Auth state, token storage
- `client/src/lib/api.ts` - API client with Bearer token

---

## Recommendations for Future Phases

1. **Token refresh mechanism**: Implement refresh tokens with short-lived access tokens (15min) and long-lived refresh tokens (7 days)
2. **HTTP-only cookies**: Move JWT from localStorage to httpOnly cookies for XSS protection
3. **CORS production config**: Set explicit allowed origins for production deployment
4. **CSP headers**: Configure Content Security Policy for the Vite frontend
5. **Penetration testing**: Conduct manual penetration testing before production deployment
6. **HIPAA compliance review**: Full HIPAA security rule assessment (required for US healthcare)
7. **Data encryption at rest**: Ensure PostgreSQL encryption at rest is configured
8. **Logging infrastructure**: Centralized structured logging (e.g., ELK stack) with PII scrubbing
