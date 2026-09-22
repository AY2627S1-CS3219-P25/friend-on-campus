# Authentication Setup

## Contents

- [Before you start](#before-you-start)
- [Start the full stack from the repository root](#start-the-full-stack-from-the-repository-root)
- [Start the User Service from its directory with Docker Compose](#start-the-user-service-from-its-directory-with-docker-compose)
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

2. Generate the local JWT key pair and copy it to your clipboard:

   ```sh
   npm run generate:jwt-keys
   ```

3. Paste the copied lines into root `.env` under the Auth / JWT section.

   If the clipboard command is unavailable on your system, print the values instead:

   ```sh
   npm run generate:jwt-keys -- --print
   ```

4. Start the stack:

   ```sh
   docker compose up --build
   ```

5. Check that the User Service is ready:

   ```sh
   # macOS and Linux
   curl --fail http://localhost:8001/ready
   ```

   ```powershell
   # Windows PowerShell
   curl.exe --fail http://localhost:8001/ready
   ```

## Start the User Service from its directory with Docker Compose

1. Complete the root `.env` setup in [Start the full stack from the repository root](#start-the-full-stack-from-the-repository-root).

2. Move to the User Service directory:

   ```sh
   cd services/user-service
   ```

3. Start the User Service and its database using the root environment file:

   ```sh
   docker compose --env-file ../../.env up --build
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

1. Move to the User Service directory:

   ```sh
   cd services/user-service
   ```

2. Create the User Service environment file:

   ```sh
   # macOS and Linux
   cp .env.example .env
   ```

   ```powershell
   # Windows PowerShell
   Copy-Item .env.example .env
   ```

3. Copy `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` from root `.env` into `services/user-service/.env`.

4. Start the User Service database:

   ```sh
   docker compose --env-file ../../.env up user-db -d
   ```

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
   JWT_PUBLIC_KEY=<copy from root .env>
   JWT_ISSUER=friend-on-campus-user-service
   JWT_AUDIENCE=friend-on-campus-services
   ```

3. Follow [Authentication for Backend Services](./authentication-for-services.md) when adding authentication to its routes.

## Check that authentication works

1. Run this command in PowerShell, macOS Terminal, or a Linux shell:

   ```sh
   node --input-type=module -e 'const loginResponse = await fetch("http://localhost:8001/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "alice@u.nus.edu", password: "Password123!" }) }); const login = await loginResponse.json(); const profileResponse = await fetch("http://localhost:8001/api/users/me", { headers: { Authorization: "Bearer " + login.data.accessToken } }); console.log(await profileResponse.text());'
   ```

## Reset local User Service data

This removes the local User Service database and its test data.

From `services/user-service`:

```sh
docker compose --env-file ../../.env down -v
docker compose --env-file ../../.env up --build
```
