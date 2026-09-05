# NurseHandOver — Threat Model

## Overview

This document identifies potential security threats and mitigations for the NurseHandOver system.

## Threat Categories

### 1. Authentication Threats

| Threat | Risk | Mitigation |
|--------|------|------------|
| Brute force attacks | High | Rate limiting on auth endpoints |
| Password guessing | High | bcrypt hashing, minimum password length |
| Token theft | Medium | HTTPS in production, token expiration |
| Session fixation | Medium | Stateless JWT tokens |

### 2. Authorization Threats

| Threat | Risk | Mitigation |
|--------|------|------------|
| Privilege escalation | High | RBAC enforcement |
| IDOR (Insecure Direct Object Reference) | High | Resource-level authorization |
| Horizontal privilege escalation | High | Patient access verification |
| Vertical privilege escalation | High | Role-based route protection |

### 3. Data Threats

| Threat | Risk | Mitigation |
|--------|------|------------|
| SQL injection | High | Prisma ORM (parameterized queries) |
| XSS attacks | Medium | Input validation, output encoding |
| Data exposure | High | Never expose sensitive data in errors |
| Data tampering | Medium | Audit logging |

### 4. Infrastructure Threats

| Threat | Risk | Mitigation |
|--------|------|------------|
| DDoS attacks | Medium | Rate limiting |
| Man-in-the-middle | High | HTTPS, secure headers |
| Credential leakage | High | Environment variables, no secrets in code |

## Mitigations Implemented

### Authentication
- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT token authentication
- ✅ Token expiration
- ✅ Rate limiting on auth endpoints
- ✅ Invalid credential error messages

### Authorization
- ✅ RBAC middleware
- ✅ Resource-level patient authorization
- ✅ Ward-based access control
- ✅ Assignment-based access control

### Input Validation
- ✅ Zod schema validation
- ✅ Request body size limits
- ✅ Parameter validation

### Security Headers
- ✅ Helmet.js for HTTP headers
- ✅ CORS configuration
- ✅ Content-Type validation

### Audit
- ✅ Login/logout logging
- ✅ Password change logging
- ✅ User creation logging
- ✅ Patient access logging

## Residual Risks

| Risk | Acceptance | Rationale |
|------|------------|-----------|
| Token storage on client | Accepted | Browser localStorage/sessionStorage |
| Internal network access | Accepted | Development environment |
| Database direct access | Accepted | Local PostgreSQL |

## Security Testing

### Unit Tests
- Password hashing verification
- Token generation/verification
- Authorization middleware
- Input validation

### Integration Tests
- Authentication flow
- Authorization flow
- Resource access control

### Manual Testing
- SQL injection attempts
- XSS payload attempts
- IDOR attempts
- Privilege escalation attempts
