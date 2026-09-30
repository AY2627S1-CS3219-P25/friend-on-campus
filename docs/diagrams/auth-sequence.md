<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
Scope: Added the 400 and 409 branches of the supplier write (PR #93), the role re-read on refresh, a legend and links to the PlantUML twins; re-pinned to main @ fcd5371. As built, no rationale.
Author review: <to be completed by Reallyeasy1>
-->
<!--
AI Assistance Disclosure:
Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-28
Scope: Drew the login and supplier-write sequences from auth-routes.ts, packages/auth, supplierRoutes.ts and the D2 UAT results
(check IDs in brackets). Shows what the code does; no rationale.
Author review: <to be completed by Reallyeasy1>
-->

# Login, then an allowed / denied supplier action (`main` @ fcd5371)

PlantUML versions: [`auth-login.puml`](./auth-login.puml) and [`auth-supplier-write.puml`](./auth-supplier-write.puml)
(see [Rendering](./component.md#rendering)). Check IDs refer to [`../evidence/d2/d2-checklist.md`](../evidence/d2/d2-checklist.md).

Legend: solid arrow = request or call (control flow); dashed arrow = response or data returned; `alt` / `else` = the branch the service takes.

## 1. Login and token refresh

```mermaid
sequenceDiagram
  autonumber
  actor U as User (browser)
  participant GW as api-gateway (nginx)
  participant US as user-service
  participant DB as user_db

  U->>GW: POST /api/auth/login {email, password, keepLoggedIn}
  GW->>US: proxy
  US->>DB: find user by LOWER(email)
  DB-->>US: user row (password_hash, role)
  US->>US: verify password against the scrypt hash
  alt wrong email or password
    US-->>U: 401 INVALID_CREDENTIALS [L1]
  else correct
    US->>DB: insert session (refresh_token_hash, idle_expires_at)
    US->>US: sign access token with the Ed25519 private key<br/>claims: sub, sid, role, iat, exp (15 min), iss, aud
    US-->>U: 200 {accessToken, user}<br/>Set-Cookie: refresh_token (HttpOnly, SameSite=Lax, Path=/api/auth) [L2, L3]
  end

  Note over U,US: later, when the access token has expired
  U->>GW: POST /api/auth/refresh (cookie)
  GW->>US: proxy
  US->>DB: look up session by hash of the cookie value
  alt unknown, expired or already rotated
    US-->>U: 401 INVALID_SESSION [L7, L10]
  else valid
    US->>DB: store the new refresh_token_hash, extend idle_expires_at
    US->>US: sign a new access token with the user's current role
    US-->>U: 200 {accessToken} + rotated cookie [L6]
  end
```

## 2. Supplier write: 401, 403, 400, 409 or 201

```mermaid
sequenceDiagram
  autonumber
  actor U as Caller
  participant GW as api-gateway (nginx)
  participant SS as supplier-service
  participant MW as @campus-errand/auth<br/>(inside supplier-service)
  participant DB as supplier_db

  U->>GW: POST /api/suppliers<br/>Authorization: Bearer (access token)
  GW->>SS: proxy (headers passed through unchanged)
  SS->>MW: authMiddleware
  alt no Bearer token
    MW-->>U: 401 MISSING_TOKEN [W1]
  else bad signature, issuer or audience
    MW-->>U: 401 INVALID_TOKEN [W12]
  else expired
    MW-->>U: 401 TOKEN_EXPIRED
  else token verified with the public key
    MW->>MW: requireAdmin reads role from the verified claims
    alt role is STUDENT
      MW-->>U: 403 ADMIN_REQUIRED [W2]
    else role is ADMIN
      MW->>SS: next()
      SS->>SS: required fields present and not blank?<br/>(name, campusZone, exactLocation, category, building, floor)
      alt a required field is missing
        SS-->>U: 400 [W3]
      else
        SS->>DB: find supplier with the same name, category,<br/>building, floor (trimmed, case-insensitive)
        DB-->>SS: existing row or none
        alt duplicate found
          SS-->>U: 409 {error, duplicate}
        else none
          SS->>DB: insert supplier (generated SUP-NNN code)
          DB-->>SS: row
          SS-->>U: 201 {success, data: supplier} [W4]
        end
      end
    end
  end
```

user-service does not appear in the second diagram: supplier-service makes no network call to it.
`GET /api/suppliers` and `GET /api/suppliers/:id` skip both middleware steps and answer without a token [S1].
