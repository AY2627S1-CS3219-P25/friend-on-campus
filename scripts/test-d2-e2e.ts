/**
 * AI Assistance Disclosure:
 * 
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Automated end-to-end integration test runner validating Milestone D2 requirements across User Service, Supplier Service, and RBAC enforcement.
 * Author review: (to be completed by author after review)
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Aligned D2 account, session, profile, structured administration-placeholder, and Supplier Service RBAC checks with the author-approved Ed25519 contracts.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: Made the runner work on Windows (spawn through a shell so `npx` resolves; kill the process tree on
 * cleanup), raised the service readiness timeout from 8 s to 30 s (user-service cold-starts in ~10 s), and
 * added an assertion that the access token carries the standard claims (sub, sid, role, iat, exp, iss, aud).
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Google Antigravity Agent, date: 2026-09-24
 * Scope: Fixed function reference from decodeJwtPayload to decodeJwtClaims in student JWT claims assertions.
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-28
 * Scope: Rewrote Scenario 4 (renamed from "Deferred Administration Endpoint Authorization" — nothing there is
 * deferred anymore). Fixed two assertions that were already stale before this change (found during
 * investigation, unrelated to the rename): the user list has returned a real 200 for a while, not 501; and the
 * GET /api/users/:id check was asserting 501 for a route that was never implemented at all (no route matches
 * it, so it 404s). Replaced the old promote-returns-501 checks with real coverage of PATCH /:id/toggle-status
 * and PATCH /:id/toggle-role (both endpoints renamed/implemented this session): forbidden-for-student on both,
 * an admin round-tripping a target's status and role in both directions (asserting the value actually flips
 * each way, not just the status code), an admin blocked from targeting their own id for toggle-role, and an
 * unknown-UUID 404.
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-29
 * Scope: PR #93 review fix: Scenario 6 sends the now-required building and floor when the admin creates the
 * test supplier, and asserts that a create without them is rejected with 400. The test supplier's name
 * carries the random test code, so a row left by an aborted run cannot trip the uniqueness rule.
 * Author review: (to be completed by author after review)
 */



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
      }),
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200, 'Registered student login succeeds (200 OK)');
    assert(studentLoginData.data?.user?.userRole === 'STUDENT', 'Registered user has role STUDENT');
    const studentToken = studentLoginData.data?.accessToken;
    const studentUserId = studentLoginData.data?.user?.userId;
    const studentClaims = decodeJwtClaims(studentToken);
    assert(studentClaims.sub === studentUserId, 'Access token uses the standard sub claim');
    assert(typeof studentClaims.sid === 'string', 'Access token includes the standard sid claim');
    assert(typeof studentClaims.iat === 'number', 'Access token includes the standard iat claim');
    assert(typeof studentClaims.exp === 'number', 'Access token includes the standard exp claim');
    assert(studentClaims.iss === 'friend-on-campus-user-service', 'Access token uses the standard iss claim');
    assert(studentClaims.aud === 'friend-on-campus-services', 'Access token uses the standard aud claim');

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
    // SCENARIO 4: User Listing, Status & Role Administration
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: User Listing, Status & Role Administration ---');

    const unauthenticatedList = await fetch(`${USER_API}/api/users`);
    assert(unauthenticatedList.status === 401, 'Unauthenticated user-management request is rejected (401)');

    const adminList = await fetch(`${USER_API}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminList.json();
    assert(adminList.status === 200, 'ADMIN user listing succeeds (200 OK)');
    assert(Array.isArray(adminListData.data?.users), 'User listing returns an array of users');

    // Student cannot reach either admin-only management route, even on their own id.
    const studentToggleStatus = await fetch(`${USER_API}/api/users/${studentUserId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentToggleStatusData = await studentToggleStatus.json();
    assert(studentToggleStatus.status === 403, 'Student cannot call toggle-status, even on themselves (403)');
    assert(studentToggleStatusData.code === 'ADMIN_REQUIRED', 'toggle-status forbidden response has code ADMIN_REQUIRED');

    const studentToggleRole = await fetch(`${USER_API}/api/users/${studentUserId}/toggle-role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentToggleRoleData = await studentToggleRole.json();
    assert(studentToggleRole.status === 403, 'Student cannot call toggle-role, even on themselves (403)');
    assert(studentToggleRoleData.code === 'ADMIN_REQUIRED', 'toggle-role forbidden response has code ADMIN_REQUIRED');

    // Admin toggles the test student's active status off, then back on — asserting the boolean
    // actually flips each way, not just that the call succeeds.
    const adminDeactivate = await fetch(`${USER_API}/api/users/${studentUserId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDeactivateData = await adminDeactivate.json();
    assert(adminDeactivate.status === 200, 'Admin toggle-status (deactivate) succeeds (200 OK)');
    assert(adminDeactivateData.data?.user?.status === false, 'Target user status flips to false (deactivated)');

    const adminReactivate = await fetch(`${USER_API}/api/users/${studentUserId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminReactivateData = await adminReactivate.json();
    assert(adminReactivate.status === 200, 'Admin toggle-status (reactivate) succeeds (200 OK)');
    assert(adminReactivateData.data?.user?.status === true, 'Target user status flips back to true (active)');

    // Admin toggles the test student's role STUDENT -> ADMIN -> STUDENT, same round-trip idea.
    const adminPromote = await fetch(`${USER_API}/api/users/${studentUserId}/toggle-role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminPromoteData = await adminPromote.json();
    assert(adminPromote.status === 200, 'Admin toggle-role (promote) succeeds (200 OK)');
    assert(adminPromoteData.data?.user?.userRole === 'ADMIN', 'Target user role flips to ADMIN');

    const adminDemote = await fetch(`${USER_API}/api/users/${studentUserId}/toggle-role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminDemoteData = await adminDemote.json();
    assert(adminDemote.status === 200, 'Admin toggle-role (demote) succeeds (200 OK)');
    assert(adminDemoteData.data?.user?.userRole === 'STUDENT', 'Target user role flips back to STUDENT');

    // An admin may never change their own role.
    const adminSelfToggleRole = await fetch(`${USER_API}/api/users/${adminLoginData.data?.user?.userId}/toggle-role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminSelfToggleRoleData = await adminSelfToggleRole.json();
    assert(adminSelfToggleRole.status === 403, 'Admin cannot toggle-role on their own id (403)');
    assert(
      adminSelfToggleRoleData.code === 'SELF_ACTION_FORBIDDEN',
      'Self-targeting toggle-role response has code SELF_ACTION_FORBIDDEN',
    );

    // Both admin routes 404 cleanly on an unknown (but well-formed) UUID.
    const unknownUserId = '00000000-0000-4000-8000-000000000000';
    const adminToggleRoleUnknown = await fetch(`${USER_API}/api/users/${unknownUserId}/toggle-role`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminToggleRoleUnknownData = await adminToggleRoleUnknown.json();
    assert(adminToggleRoleUnknown.status === 404, 'toggle-role on an unknown UUID returns 404');
    assert(adminToggleRoleUnknownData.code === 'USER_NOT_FOUND', 'Unknown-UUID toggle-role response has code USER_NOT_FOUND');

    const malformedCookie = await fetch(`${USER_API}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: 'refresh_token=%E0%A4%A' },
    });
    const malformedCookieData = await malformedCookie.json();
    assert(malformedCookie.status === 401, 'Malformed refresh-token cookie returns 401');
    assert(
      malformedCookieData.code === 'INVALID_SESSION',
      'Malformed refresh-token cookie returns INVALID_SESSION',
    );

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

    // AI-generated (edited by jagdeepsh)
    // 2b. Admin create without building/floor -> 400 Bad Request
    const adminCreateNoBuilding = await fetch(`${SUPPLIER_API}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'No Building Cafe',
        campusZone: 'COM3',
        exactLocation: 'COM3 Level 1 Terrace',
        category: 'Beverages',
      }),
    });
    assert(adminCreateNoBuilding.status === 400, 'Admin POST /api/suppliers without building/floor is rejected (400 Bad Request)');

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
        name: `Verified Admin Test Cafe ${testSupplierCode}`,
        campusZone: 'COM3',
        exactLocation: 'COM3 Level 1 Terrace',
        category: 'Beverages',
        building: 'COM3',
        floor: '1',
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
        name: `Verified Admin Test Cafe ${testSupplierCode} (Updated)`,
        floor: '2',
      }),
    });
    const updateSupplierData = await adminUpdate.json();
    assert(adminUpdate.status === 200, 'Admin token PUT /api/suppliers/:id updates location (200 OK)');
    assert(
      updateSupplierData.data?.name === `Verified Admin Test Cafe ${testSupplierCode} (Updated)`,
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
