<!--
AI Assistance Disclosure:
Tool: Google Antigravity Agent, date: 2026-09-28
Scope: Purged Ed25519 key generation instructions. Updated auth setup documentation to reflect symmetric SESSION_SECRET configuration and NGINX gateway authentication offloading.
Author review: (to be completed by author after review)
-->
<!--
AI Assistance Disclosure:
Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
Scope: Documented User Service authentication setup, Ed25519 key configuration, and shared PostgreSQL startup.
Author review: <to be completed by ngkhengyang>
-->

# Authentication Setup

## Contents

- [Before you start](#before-you-start)
- [Start the full stack from the repository root](#start-the-full-stack-from-the-repository-root)
- [Start the User Service with npm](#start-the-user-service-with-npm)
- [Set up another backend service](#set-up-another-backend-service)
- [Check that authentication works](#check-that-authentication-works)
- [Reset local User Service data](#reset-local-user-service-data)

## Before you start

Install Node.js, npm, and Docker Compose. Do not commit `.env` files.

## Start the full stack from the repository root

1. Create the root environment file:

   ```sh
   # macOS and Linux
   cp .env.example .env
   ```

   ```powershell
   # Windows PowerShell
   Copy-Item .env.example .env
   ```

2. The stack uses a symmetric `SESSION_SECRET` configured in `.env.example` with a default dev key. No key generation scripts are required.

3. Start the stack:

   ```sh
   docker compose up --build
   ```

4. Check that the User Service is ready:

   ```sh
   # macOS and Linux
   curl --fail http://localhost:8001/ready
   ```

   ```powershell
   # Windows PowerShell
   curl.exe --fail http://localhost:8001/ready
   ```

## Start the User Service with npm

1. From the repository root, start the shared PostgreSQL service:

   ```sh
   docker compose up postgres -d
   ```

2. Move to the User Service directory:

   ```sh
   cd services/user-service
   ```

3. Create the User Service environment file:

   ```sh
   # macOS and Linux
   cp .env.example .env
   ```

   ```powershell
   # Windows PowerShell
   Copy-Item .env.example .env
   ```

4. Verify `SESSION_SECRET` in `services/user-service/.env` matches root `.env`.

5. Start the User Service:

   ```sh
   npm run dev
   ```

   Or, from the repository root:

   ```sh
   npm run dev:user
   ```

6. Check that the User Service is ready:

   ```sh
   # macOS and Linux
   curl --fail http://localhost:8001/ready
   ```

   ```powershell
   # Windows PowerShell
   curl.exe --fail http://localhost:8001/ready
   ```

## Set up another backend service

1. Add the shared package to the service:

   ```sh
   npm install @campus-errand/auth --workspace=@campus-errand/<service-name>
   ```

2. Add these values to that service's Compose environment or local `.env` file:

   ```env
   SESSION_SECRET=<copy from root .env>
   JWT_ISSUER=friend-on-campus-user-service
   JWT_AUDIENCE=friend-on-campus-services
   ```

3. When requests arrive through NGINX API Gateway, NGINX verifies the session via `auth_request` and forwards `X-User-Id` / `X-User-Role` headers to your service. Follow [Authentication for Backend Services](./authentication-for-services.md) when adding authentication to its routes.

## Check that authentication works

1. Run this command in PowerShell, macOS Terminal, or a Linux shell:

   ```sh
   node --input-type=module -e 'const loginResponse = await fetch("http://localhost:8001/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "alice@u.nus.edu", password: "Password123!" }) }); const login = await loginResponse.json(); const profileResponse = await fetch("http://localhost:8001/api/users/me", { headers: { Authorization: "Bearer " + login.data.accessToken } }); console.log(await profileResponse.text());'
   ```

## Reset local User Service data

The shared PostgreSQL volume holds every service database. Resetting it removes all
local service data, not only User Service data.

From the repository root:

```sh
docker compose down -v
docker compose up postgres -d
```
