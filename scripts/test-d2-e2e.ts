/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Automated end-to-end integration test runner validating Milestone D2 requirements across User Service, Supplier Service, and RBAC enforcement.
 * Author review: (to be completed by author after review)
 */
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Aligned D2 account, session, profile, administration-placeholder, and Supplier Service RBAC checks with the author-approved Ed25519 contracts.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by yanhwee)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: Made the runner work on Windows (spawn through a shell so `npx` resolves; kill the process tree on
 * cleanup), raised the service readiness timeout from 8 s to 30 s (user-service cold-starts in ~10 s), and
 * added an assertion that the access token carries the standard claims (sub, sid, role, iat, exp, iss, aud).
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)

import { spawn, ChildProcess, execFileSync } from 'child_process';
import { generateKeyPairSync } from 'node:crypto';
import path from 'path';

const USER_SERVICE_PORT = 8001;
const SUPPLIER_SERVICE_PORT = 8002;
const USER_API = `http://localhost:${USER_SERVICE_PORT}`;
const SUPPLIER_API = `http://localhost:${SUPPLIER_SERVICE_PORT}`;

let userProcess: ChildProcess | null = null;
let supplierProcess: ChildProcess | null = null;

// AI-generated (edited by ngkhengyang)
function createTestJwtEnvironment(): Record<string, string> {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');

  return {
    JWT_PRIVATE_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'),
    JWT_PUBLIC_KEY: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
    JWT_ISSUER: 'friend-on-campus-user-service',
    JWT_AUDIENCE: 'friend-on-campus-services',
  };
}

const testJwtEnvironment = createTestJwtEnvironment();

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${message}`);
  }
}

// On Windows `npx` is npx.cmd, which spawn() only finds through a shell.
const SPAWN_THROUGH_SHELL = process.platform === 'win32';

function decodeJwtClaims(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

async function waitReady(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 CS3219 Milestone D2 Automated End-to-End Test Suite');
  console.log('======================================================\n');

  // 1. Start User Service
  console.log('1. Starting User Service on port 8001...');
  userProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: path.resolve(__dirname, '../services/user-service'),
    env: {
      ...process.env,
      ...testJwtEnvironment,
      PORT: String(USER_SERVICE_PORT),
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/user_db',
    },
    stdio: 'pipe',
    shell: SPAWN_THROUGH_SHELL,
  });

  // 2. Start Supplier Service
  console.log('2. Starting Supplier Service on port 8002...');
  supplierProcess = spawn('npx', ['tsx', 'src/backend/server.ts'], {
    cwd: path.resolve(__dirname, '../services/supplier-service'),
    env: {
      ...process.env,
      PORT: String(SUPPLIER_SERVICE_PORT),
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/supplier_db',
      JWT_PUBLIC_KEY: testJwtEnvironment.JWT_PUBLIC_KEY,
      JWT_ISSUER: testJwtEnvironment.JWT_ISSUER,
      JWT_AUDIENCE: testJwtEnvironment.JWT_AUDIENCE,
    },
    stdio: 'pipe',
    shell: SPAWN_THROUGH_SHELL,
  });

  const userReady = await waitReady(`${USER_API}/health`);
  const supplierReady = await waitReady(`${SUPPLIER_API}/health`);

  if (!userReady || !supplierReady) {
    console.error('Failed to start services. User Ready:', userReady, 'Supplier Ready:', supplierReady);
    cleanup();
    process.exit(1);
  }

  console.log('\nBoth microservices healthy. Executing verification scenarios...\n');

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: Account Registration & Validation
    // -------------------------------------------------------------------------
    console.log('--- Scenario 1: Account Registration & Validation ---');

    // Invalid email format
    const regInvalidEmail = await fetch(`${USER_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'invalid-email',
        email: 'not-an-email',
        password: 'Password123!',
      }),
    });
    assert(regInvalidEmail.status === 400, 'Rejects registration with an invalid email address');

    // Invalid password length (< 8 chars)
    const regShortPass = await fetch(`${USER_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'short-password',
        email: 'short-password@example.test',
        password: 'short',
      }),
    });
    assert(regShortPass.status === 400, 'Rejects registration with short password (< 8 chars)');

    // Valid student registration
    const testUsername = `charlie_${Date.now()}`;
    const testEmail = `${testUsername}@example.test`;
    const regValid = await fetch(`${USER_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const regData = await regValid.json();
    assert(regValid.status === 201, 'Registers a new account with a valid email address (201 Created)');
    assert(!regData.data?.accessToken, 'Registration does not create a login session');
    assert(regData.data?.user?.userRole === 'STUDENT', 'New registrant is assigned STUDENT role by default');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Authentication & Login
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Authentication & JWT Login ---');

    // Login Admin
    const adminLoginRes = await fetch(`${USER_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@nus.edu.sg',
        password: 'Password123!',
        keepLoggedIn: false,
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login with valid credentials succeeds (200 OK)');
    assert(adminLoginData.data?.user?.userRole === 'ADMIN', 'Admin user has role ADMIN');
    const adminToken = adminLoginData.data?.accessToken;
    const adminClaims = adminToken ? decodeJwtClaims(adminToken) : {};
    assert(
      adminClaims.sub === adminLoginData.data?.user?.userId &&
        typeof adminClaims.sid === 'string' &&
        adminClaims.role === 'ADMIN' &&
        typeof adminClaims.iat === 'number' &&
        typeof adminClaims.exp === 'number' &&
        adminClaims.iss === testJwtEnvironment.JWT_ISSUER &&
        adminClaims.aud === testJwtEnvironment.JWT_AUDIENCE,
      'Access token carries standard JWT claims (sub, sid, role, iat, exp, iss, aud)',
    );

    // Login the account registered above; registration itself must not authenticate it.
    const studentLoginRes = await fetch(`${USER_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        keepLoggedIn: false,
      }),
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200, 'Registered student login succeeds (200 OK)');
    assert(studentLoginData.data?.user?.userRole === 'STUDENT', 'Registered user has role STUDENT');
    const studentToken = studentLoginData.data?.accessToken;
    const studentUserId = studentLoginData.data?.user?.userId;

    // -------------------------------------------------------------------------
    // SCENARIO 3: User Profile & Immutability Protection
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: User Profile & Immutable Field Protection ---');

    // GET /api/users/me
    const meRes = await fetch(`${USER_API}/api/users/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/users/me returns authenticated student profile');
    assert(meData.data?.user?.email === testEmail, 'Profile matches authenticated user email');

    // Attempt to modify the immutable email along with username.
    const invalidUpdateRes = await fetch(`${USER_API}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        username: `${testUsername}-updated`,
        email: 'hacked@example.test',
      }),
    });
    assert(invalidUpdateRes.status === 400, 'Profile update rejects an attempted email modification');

    const updateRes = await fetch(`${USER_API}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ username: `${testUsername}-updated` }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Profile update accepts a username-only request');
    assert(updateData.data?.user?.username === `${testUsername}-updated`, 'Username updates successfully');

    // -------------------------------------------------------------------------
    // SCENARIO 4: Deferred Administration Endpoint Authorization
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Deferred Administration Endpoint Authorization ---');

    const unauthenticatedList = await fetch(`${USER_API}/api/users`);
    assert(unauthenticatedList.status === 401, 'Unauthenticated user-management request is rejected (401)');

    const studentPromote = await fetch(`${USER_API}/api/users/${studentUserId}/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    });
    assert(studentPromote.status === 403, 'Student cannot access user-management routes (403)');

    const adminList = await fetch(`${USER_API}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminList.status === 501, 'ADMIN user listing placeholder returns 501 Not Implemented');

    const adminPromote = await fetch(`${USER_API}/api/users/${studentUserId}/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(adminPromote.status === 501, 'ADMIN promotion placeholder returns 501 Not Implemented');

    // -------------------------------------------------------------------------
    // SCENARIO 5: Public Querying of Campus Suppliers (M3)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Supplier Querying & Pagination ---');

    // Public / unauthenticated GET /api/suppliers
    const getSuppliersRes = await fetch(`${SUPPLIER_API}/api/suppliers?page=1&limit=5`);
    const suppliersData = await getSuppliersRes.json();
    assert(getSuppliersRes.status === 200, 'Public GET /api/suppliers succeeds without token');
    assert(Array.isArray(suppliersData.data.suppliers), 'Suppliers returned as array in paginated response');
    assert(suppliersData.data.total >= 20, `Suppliers seeded with real campus locations (total: ${suppliersData.data.total})`);
    assert(suppliersData.data.page === 1 && suppliersData.data.limit === 5, 'Pagination parameters respected');

    // -------------------------------------------------------------------------
    // SCENARIO 6: Cross-Service RBAC Authorization on Supplier Service
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Cross-Service RBAC Enforcement (Student vs Admin) ---');

    // 1. Unauthenticated write attempt -> 401 Unauthorized
    const unauthCreate = await fetch(`${SUPPLIER_API}/api/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rogue Store',
        campusZone: 'UTown',
        exactLocation: 'UTown Plaza',
        category: 'Food',
      }),
    });
    assert(unauthCreate.status === 401, 'Unauthenticated POST /api/suppliers rejected (401 Unauthorized)');

    // 2. Student token write attempt -> 403 Forbidden
    const studentCreate = await fetch(`${SUPPLIER_API}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'Student Unauthorized Shop',
        campusZone: 'COM3',
        exactLocation: 'COM3 Level 2',
        category: 'Beverages',
      }),
    });
    assert(studentCreate.status === 403, 'Student token POST /api/suppliers rejected (403 Forbidden)');

    // 3. Admin token write attempt -> 201 Created
    const testSupplierCode = `TEST-${Math.floor(100 + Math.random() * 900)}`;
    const adminCreate = await fetch(`${SUPPLIER_API}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        supplierCode: testSupplierCode,
        name: 'Verified Admin Test Cafe',
        campusZone: 'COM3',
        exactLocation: 'COM3 Level 1 Terrace',
        category: 'Beverages',
        description: 'End-to-end integration test spot',
        startingTime: '0900hrs',
        closingTime: '2100hrs',
      }),
    });
    const createdData = await adminCreate.json();
    assert(adminCreate.status === 201, 'Admin token POST /api/suppliers creates location (201 Created)');
    const createdSupplierId = createdData.data?.id;

    // 4. Admin updates location -> 200 OK
    const adminUpdate = await fetch(`${SUPPLIER_API}/api/suppliers/${createdSupplierId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Verified Admin Test Cafe (Updated)',
        floor: '2',
      }),
    });
    const updateSupplierData = await adminUpdate.json();
    assert(adminUpdate.status === 200, 'Admin token PUT /api/suppliers/:id updates location (200 OK)');
    assert(
      updateSupplierData.data?.name === 'Verified Admin Test Cafe (Updated)',
      'Supplier name updated correctly'
    );

    // 5. Admin toggles active status -> 200 OK
    const adminToggle = await fetch(`${SUPPLIER_API}/api/suppliers/${createdSupplierId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const toggleData = await adminToggle.json();
    assert(adminToggle.status === 200, 'Admin token PATCH /api/suppliers/:id/toggle succeeds (200 OK)');
    assert(toggleData.data?.isActive === false, 'Supplier status successfully toggled to inactive');

    // 6. Admin soft deletes supplier
    const adminSoftDelete = await fetch(`${SUPPLIER_API}/api/suppliers/${createdSupplierId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminSoftDelete.status === 200, 'Admin token DELETE /api/suppliers/:id soft deletes record');

    // 7. Admin permanent deletes test supplier cleanup
    const adminHardDelete = await fetch(
      `${SUPPLIER_API}/api/suppliers/${createdSupplierId}?permanent=true`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    assert(adminHardDelete.status === 200, 'Admin token DELETE ?permanent=true cleans up test record');
  } catch (err: any) {
    console.error('Unexpected test error:', err);
  } finally {
    cleanup();
  }

  console.log('\n======================================================');
  console.log(`📊 Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

// With shell: true on Windows, child.kill() only ends the cmd.exe wrapper and leaves the tsx server
// listening on the port; taskkill /T ends the whole process tree.
function killProcessTree(child: ChildProcess) {
  if (SPAWN_THROUGH_SHELL && child.pid) {
    try {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      return;
    } catch {
      // fall through to the plain kill
    }
  }
  child.kill();
}

function cleanup() {
  if (userProcess) {
    killProcessTree(userProcess);
    userProcess = null;
  }
  if (supplierProcess) {
    killProcessTree(supplierProcess);
    supplierProcess = null;
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

runTests();
