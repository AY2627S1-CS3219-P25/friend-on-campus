# User Service API Reference

The User Service manages account registration, authentication sessions, and a user's
own profile. Unless stated otherwise, request and response bodies use JSON.

## Contents

- [Service endpoints](#service-endpoints)
  - [`GET /health`](#get-health)
  - [`GET /ready`](#get-ready)
- [Authentication endpoints](#authentication-endpoints)
  - [`POST /api/auth/register`](#post-apiauthregister)
  - [`POST /api/auth/login`](#post-apiauthlogin)
  - [`POST /api/auth/refresh`](#post-apiauthrefresh)
  - [`POST /api/auth/logout`](#post-apiauthlogout)
- [User profile endpoints](#user-profile-endpoints)
  - [`GET /api/users/me`](#get-apiusersme)
  - [`PATCH /api/users/me`](#patch-apiusersme)
  - [`PUT /api/users/me/password`](#put-apiusersmepassword)
- [Authentication](#authentication)
- [Common error responses](#common-error-responses)

## Service endpoints

### `GET /health`

Reports whether the HTTP service is running. This endpoint does not require
authentication and does not check the database.

#### Request

No request body.

#### Success response

Status: `200 OK`

```json
{
  "service": "user-service",
  "status": "UP"
}
```

### `GET /ready`

Reports whether the service can access the expected User Service database schema.
This endpoint does not require authentication.

#### Request

No request body.

#### Success response

Status: `200 OK`

```json
{
  "service": "user-service",
  "status": "READY",
  "dependencies": {
    "database": "UP"
  }
}
```

#### Unavailable response

Status: `503 Service Unavailable`

```json
{
  "service": "user-service",
  "status": "NOT_READY",
  "dependencies": {
    "database": "DOWN"
  }
}
```

## Authentication endpoints

### `POST /api/auth/register`

Creates a student account. Registration does not log the user in or create a session.
Email addresses and usernames are unique without regard to letter case.

#### Request

```http
Content-Type: application/json
```

```json
{
  "username": "alice",
  "email": "alice@u.nus.edu",
  "password": "Password123!"
}
```

| Field | Type | Required | Validation |
|---|---|---:|---|
| `username` | string | Yes | Must contain 1-50 characters after trimming and cannot be whitespace-only. |
| `email` | string | Yes | Must be a valid email address and at most 320 characters. It is trimmed and stored in lowercase. |
| `password` | string | Yes | Must contain 8-24 Unicode characters, inclusive. |

#### Success response

Status: `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "95a7644d-0748-410c-bb51-e30bb2f17561",
      "username": "alice",
      "email": "alice@u.nus.edu",
      "userRole": "STUDENT"
    }
  }
}
```

#### Error responses

| Status | Code | Meaning |
|---:|---|---|
| `400` | `INVALID_INPUT` | A required field is missing or invalid. |
| `409` | `DUPLICATE_EMAIL` | The email address is already registered. |
| `409` | `DUPLICATE_USERNAME` | The username is already in use. |

### `POST /api/auth/login`

Authenticates a registered user and creates a session. The response contains a
short-lived access token, while the refresh token is set as an HTTP-only cookie.

#### Request

```http
Content-Type: application/json
```

```json
{
  "email": "alice@u.nus.edu",
  "password": "Password123!",
  "keepLoggedIn": true
}
```

| Field | Type | Required | Description |
|---|---|---:|---|
| `email` | string | Yes | Registered email address. Matching is case-insensitive. |
| `password` | string | Yes | Account password. |
| `keepLoggedIn` | boolean | No | When exactly `true`, uses the persistent refresh-session lifetime. All other values use the standard lifetime. |

#### Success response

Status: `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "<signed-access-token>",
    "accessTokenExpiresInSeconds": 900,
    "user": {
      "userId": "95a7644d-0748-410c-bb51-e30bb2f17561",
      "username": "alice",
      "email": "alice@u.nus.edu",
      "userRole": "STUDENT"
    }
  }
}
```

The response also sets the following cookie:

```http
Set-Cookie: refresh_token=<opaque-token>; HttpOnly; SameSite=Lax; Path=/api/auth; Expires=<date>
```

The cookie also has the `Secure` attribute when the service runs in production.
Clients making cross-origin requests must include credentials for the cookie to be
stored and sent.

#### Error responses

| Status | Code | Meaning |
|---:|---|---|
| `400` | `INVALID_INPUT` | The email or password is missing or does not have a valid input format. |
| `401` | `INVALID_CREDENTIALS` | The email/password combination is incorrect. |

### `POST /api/auth/refresh`

Rotates a valid refresh token and returns a new access token. The refresh token is
read from the `refresh_token` cookie when present; otherwise, it may be provided in
the JSON request body.

#### Request

Preferred cookie-based request:

```http
Cookie: refresh_token=<opaque-token>
```

Fallback JSON request:

```http
Content-Type: application/json
```

```json
{
  "refreshToken": "<opaque-token>"
}
```

#### Success response

Status: `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "<new-signed-access-token>",
    "accessTokenExpiresInSeconds": 900
  }
}
```

The response replaces the `refresh_token` cookie with the newly rotated token and
extends the session's idle expiry according to whether the session is persistent.

#### Error responses

| Status | Code | Meaning |
|---:|---|---|
| `401` | `INVALID_SESSION` | The refresh token is missing, expired, invalid, revoked, or has already been rotated. |

### `POST /api/auth/logout`

Revokes the session associated with the supplied refresh token and clears the refresh
cookie. The refresh token is read from the cookie first and may alternatively be
provided as `refreshToken` in a JSON body.

#### Request

Preferred cookie-based request:

```http
Cookie: refresh_token=<opaque-token>
```

Fallback JSON request:

```json
{
  "refreshToken": "<opaque-token>"
}
```

Supplying no refresh token is allowed and still clears the cookie.

#### Success response

Status: `204 No Content`

The response has no body. An access token that was issued before logout remains valid
until that access token expires.

## User profile endpoints

All endpoints in this section require an access token as described in
[Authentication](#authentication). They operate only on the authenticated user's
account; a user ID supplied by the client is not accepted.

### `GET /api/users/me`

Returns the authenticated user's profile.

#### Request

```http
Authorization: Bearer <access-token>
```

No request body.

#### Success response

Status: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "95a7644d-0748-410c-bb51-e30bb2f17561",
      "username": "alice",
      "email": "alice@u.nus.edu",
      "role": "STUDENT"
    }
  }
}
```

#### Error responses

In addition to the [authentication errors](#authentication-error-responses):

| Status | Code | Meaning |
|---:|---|---|
| `404` | `USER_NOT_FOUND` | The authenticated account no longer exists. |

### `PATCH /api/users/me`

Updates the authenticated user's username, email address, or both. Properties not
included in the request remain unchanged.

#### Request

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "username": "alice-new",
  "email": "alice-new@u.nus.edu"
}
```

| Field | Type | Required | Validation |
|---|---|---:|---|
| `username` | string | At least one field is required | Must contain 1-50 characters after trimming, cannot be whitespace-only, and must be unique without regard to case. |
| `email` | string | At least one field is required | Must be valid, at most 320 characters, and unique without regard to case. |

The request must contain at least one supported field and cannot contain properties
other than `username` and `email`.

#### Success response

Status: `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "95a7644d-0748-410c-bb51-e30bb2f17561",
      "username": "alice-new",
      "email": "alice-new@u.nus.edu",
      "role": "STUDENT"
    }
  }
}
```

#### Error responses

In addition to the [authentication errors](#authentication-error-responses):

| Status | Code | Meaning |
|---:|---|---|
| `400` | `INVALID_INPUT` | The body is empty, contains an unsupported field, or contains an invalid value. |
| `404` | `USER_NOT_FOUND` | The authenticated account no longer exists. |
| `409` | `DUPLICATE_EMAIL` | The new email address is already registered. |
| `409` | `DUPLICATE_USERNAME` | The new username is already in use. |

### `PUT /api/users/me/password`

Changes the authenticated user's password after verifying their current password.

#### Request

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "currentPassword": "Password123!",
  "newPassword": "A-New-Password456!"
}
```

| Field | Type | Required | Validation |
|---|---|---:|---|
| `currentPassword` | string | Yes | Must match the account's current password. |
| `newPassword` | string | Yes | Must contain 8-24 Unicode characters, inclusive. |

#### Success response

Status: `204 No Content`

The response has no body.

#### Error responses

In addition to the [authentication errors](#authentication-error-responses):

| Status | Code | Meaning |
|---:|---|---|
| `400` | `INVALID_INPUT` | A required field is missing or the new password has an invalid length. |
| `401` | `INVALID_CURRENT_PASSWORD` | The supplied current password is incorrect. |
| `404` | `USER_NOT_FOUND` | The authenticated account no longer exists. |

## Authentication

Protected endpoints expect the access token returned by login or refresh in the
`Authorization` header:

```http
Authorization: Bearer <access-token>
```

Access tokens are signed and contain the authenticated user ID, session ID, and the
`STUDENT` or `ADMIN` role. They are accepted only when their signature, structure,
issuer, audience, and expiry are valid.

### Authentication error responses

| Status | Code | Meaning |
|---:|---|---|
| `401` | `MISSING_TOKEN` | The `Authorization` header does not contain a Bearer token. |
| `401` | `TOKEN_EXPIRED` | The access token has expired. A client may refresh the session and retry once. |
| `401` | `INVALID_TOKEN` | The token is malformed or has an invalid signature, claims, issuer, or audience. |

Example:

```json
{
  "success": false,
  "error": "Authentication is required",
  "code": "MISSING_TOKEN"
}
```

## Common error responses

Handled validation, authentication, and account errors have this shape:

```json
{
  "success": false,
  "error": "Username is already in use",
  "code": "DUPLICATE_USERNAME"
}
```

Unexpected server failures return `500 Internal Server Error` without exposing the
underlying error:

```json
{
  "success": false,
  "error": "Internal server error",
  "errorId": "1c5ccf08-a628-4595-9cb9-bbc78ce8543b"
}
```

The `errorId` is also returned in the `X-Error-Id` response header for log correlation.
Requests to unknown routes return `404 Not Found`:

```json
{
  "success": false,
  "error": "Route not found"
}
```
