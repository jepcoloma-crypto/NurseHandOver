# NurseHandOver — Authentication

## Overview

The NurseHandOver system uses JWT (JSON Web Token) based authentication for secure API access.

## Authentication Flow

```
1. User submits credentials (email + password)
2. Server validates credentials against database
3. Server generates JWT token with user ID, email, and roles
4. Token is returned to client
5. Client includes token in Authorization header for subsequent requests
6. Server validates token on protected routes
```

## Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "roles": ["NURSE", "SUPERVISOR"],
  "iat": 1234567890,
  "exp": 1234567890
}
```

## API Endpoints

### POST /api/v1/auth/login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["NURSE"]
    }
  }
}
```

### POST /api/v1/auth/logout

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

### GET /api/v1/auth/me

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["NURSE"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/v1/auth/change-password

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

## Password Security

- Passwords are hashed using bcrypt with 12 salt rounds
- Minimum password length: 8 characters
- Passwords are never stored in plaintext
- Password changes are logged in audit trail

## Token Security

- Tokens are signed with a secret key (JWT_SECRET)
- Tokens expire after configured time (JWT_EXPIRES_IN)
- Tokens contain user ID, email, and roles
- Invalid/expired tokens return 401 Unauthorized

## Error Responses

### Invalid Credentials
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### Invalid Token
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```
