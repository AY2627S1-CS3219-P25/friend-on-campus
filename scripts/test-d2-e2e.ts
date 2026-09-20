/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Automated end-to-end integration test runner validating Milestone D2 requirements across User Service, Supplier Service, and RBAC enforcement.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const USER_SERVICE_PORT = 8001;
const SUPPLIER_SERVICE_PORT = 8002;
const USER_API = `http://localhost:${USER_SERVICE_PORT}`;
const SUPPLIER_API = `http://localhost:${SUPPLIER_SERVICE_PORT}`;

let userProcess: ChildProcess | null = null;
let supplierProcess: ChildProcess | null = null;

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

async function waitReady(url: string, timeoutMs = 8000): Promise<boolean> {
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
      PORT: String(USER_SERVICE_PORT),
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/user_db',
      JWT_SECRET: 'cs3219supersecretjwtkey123',
    },
    stdio: 'pipe',
  });

  // 2. Start Supplier Service
  console.log('2. Starting Supplier Service on port 8002...');
  supplierProcess = spawn('npx', ['tsx', 'src/backend/server.ts'], {
    cwd: path.resolve(__dirname, '../services/supplier-service'),
    env: {
      ...process.env,
      PORT: String(SUPPLIER_SERVICE_PORT),
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/supplier_db',
      JWT_SECRET: 'cs3219supersecretjwtkey123',
    },
    stdio: 'pipe',
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
    // SCENARIO 1: User Registration & Validation
    // -------------------------------------------------------------------------
    console.log('--- Scenario 1: User Registration & NUS Domain Rules ---');

    // Invalid non-NUS email
    const regInvalidDomain = await fetch(`${USER_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nusEmail: 'hacker@gmail.com',
        matricNumber: 'A0199999Z',
        fullName: 'Imposter',
        password: 'Password123!',
      }),
    });
    assert(regInvalidDomain.status === 400, 'Rejects registration with non-NUS domain (hacker@gmail.com)');

    // Invalid password length (< 8 chars)
    const regShortPass = await fetch(`${USER_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nusEmail: 'testuser@u.nus.edu',
        matricNumber: 'A0199998Y',
        fullName: 'Test Short Pass',
        password: 'short',
      }),
    });
    assert(regShortPass.status === 400, 'Rejects registration with short password (< 8 chars)');

    // Valid student registration
    const testEmail = `charlie_${Date.now()}@u.nus.edu`;
    const regValid = await fetch(`${USER_API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nusEmail: testEmail,
        matricNumber: `A${Math.floor(1000000 + Math.random() * 8999999)}K`,
        fullName: 'Charlie Student',
        password: 'Password123!',
      }),
    });
    const regData = await regValid.json();
    assert(regValid.status === 201, 'Registers new student with valid NUS credentials (201 Created)');
    assert(!!regData.data?.token, 'Registration returns valid JWT authentication token');
    assert(regData.data?.user?.role === 'STUDENT', 'New registrant is assigned STUDENT role by default');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Authentication & Login
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Authentication & JWT Login ---');

    // Login Admin
    const adminLoginRes = await fetch(`${USER_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nusEmail: 'admin@nus.edu.sg',
        password: 'AdminPassword123!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login with valid credentials succeeds (200 OK)');
    assert(adminLoginData.data?.user?.role === 'ADMIN', 'Admin user has role ADMIN');
    const adminToken = adminLoginData.data?.token;

    // Login Student Alice
    const studentLoginRes = await fetch(`${USER_API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nusEmail: 'alice@u.nus.edu',
        password: 'Password123!',
      }),
    });
    const studentLoginData = await studentLoginRes.json();
    assert(studentLoginRes.status === 200, 'Student Alice login succeeds (200 OK)');
    assert(studentLoginData.data?.user?.role === 'STUDENT', 'Student Alice has role STUDENT');
    const studentToken = studentLoginData.data?.token;

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
    assert(meData.data?.nusEmail === 'alice@u.nus.edu', 'Profile matches authenticated user email');

    // Attempt to tamper immutable fields (role, nusEmail, matricNumber) via profile update
    const updateRes = await fetch(`${USER_API}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        fullName: 'Alice Tan (Updated)',
        telegramHandle: '@alicetan_updated',
        role: 'ADMIN', // tampering attempt!
        nusEmail: 'hacked@nus.edu.sg', // tampering attempt!
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Profile update succeeds for mutable fields');
    assert(updateData.data?.fullName === 'Alice Tan (Updated)', 'Full name updated successfully');
    assert(updateData.data?.role === 'STUDENT', 'Security: Role tampering silently ignored (remains STUDENT)');
    assert(updateData.data?.nusEmail === 'alice@u.nus.edu', 'Security: NUS Email remains immutable');

    // -------------------------------------------------------------------------
    // SCENARIO 4: Role Promotion & Demotion Safeguard
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Role Administration & Last Admin Safeguard ---');

    // Student attempts to promote someone -> 403 Forbidden
    const unauthPromote = await fetch(`${USER_API}/api/users/${meData.data.id}/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    });
    assert(unauthPromote.status === 403, 'Student cannot promote users (403 Forbidden)');

    // Admin attempts to demote sole admin -> 400 Bad Request
    const demoteLastAdmin = await fetch(`${USER_API}/api/users/${adminLoginData.data.user.id}/promote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'STUDENT' }),
    });
    assert(demoteLastAdmin.status === 400, 'Safeguard: Cannot demote the last administrator in the system (400)');

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

function cleanup() {
  if (userProcess) {
    userProcess.kill();
    userProcess = null;
  }
  if (supplierProcess) {
    supplierProcess.kill();
    supplierProcess = null;
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

runTests();
