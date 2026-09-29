// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-26, 2026-09-29
// Scope: 2026-09-29 (PR #93): admin checks call the renamed PATCH /:id/toggle-status, A3 exercises PATCH /:id/toggle-role, and the supplier create body sends building and floor. 2026-09-29: R3 detail reads userRole; header comment states the real output path. Wrote this D2 UAT driver: 63 API-level checks (auth, sessions, profile, admin user management, supplier directory queries, supplier CRUD + RBAC) against the gateway and the supplier service directly. See docs/evidence/d2/d2-checklist.md for the run results.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
// Run: node scripts/uat/uat-d2-api.mjs   (stack up: docker compose up --build -d; no npm deps)
// D2 UAT — API level, through the nginx gateway (http://localhost) and directly to
// the supplier service (http://localhost:8002) to show it works without the UI/gateway.
// Prints one line per check and writes uat-d2-api-results.json to the OS temp folder,
// or to the path in UAT_OUT.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const GW = process.env.GW ?? 'http://localhost';
const SUP_DIRECT = process.env.SUP_DIRECT ?? 'http://localhost:8002';
const USER_DIRECT = process.env.USER_DIRECT ?? 'http://localhost:8001';
const PW = 'Password123!';
const results = [];

function record(id, group, name, pass, detail) {
  results.push({ id, group, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${name}${detail ? '  -> ' + detail : ''}`);
}

async function call(url, { method = 'GET', token, body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  const setCookie = res.headers.get('set-cookie') ?? '';
  return { status: res.status, json, text, setCookie, cookieValue: setCookie.split(';')[0] };
}

const claims = (t) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8'));
const code = (r) => r.json?.code ?? r.json?.error ?? `HTTP_${r.status}`;

async function login(email, password, keepLoggedIn = false) {
  return call(`${GW}/api/auth/login`, { method: 'POST', body: { email, password, keepLoggedIn } });
}

const stamp = Date.now().toString(36);
const newUser = { username: `uat_${stamp}`, email: `uat_${stamp}@u.nus.edu`, password: PW };

// ---------------------------------------------------------------- health
{
  const h = await call(`${GW}/api/auth/login`, { method: 'POST', body: {} });
  record('H1', 'health', 'gateway reaches user-service (/api/auth/login answers)', h.status !== 502 && h.status !== 404, `HTTP ${h.status}`);
  const uh = await call(`${USER_DIRECT}/health`);
  const ur = await call(`${USER_DIRECT}/ready`);
  record('H2', 'health', 'user-service /health and /ready', uh.status === 200 && ur.status === 200, `health ${uh.status}, ready ${ur.status}`);
  const sh = await call(`${SUP_DIRECT}/health`);
  record('H3', 'health', 'supplier-service /health', sh.status === 200, `HTTP ${sh.status}`);
}

// ---------------------------------------------------------------- registration
{
  const bad = await call(`${GW}/api/auth/register`, { method: 'POST', body: { username: 'x', email: 'not-an-email', password: PW } });
  record('R1', 'auth', 'register rejects invalid email', bad.status === 400, `HTTP ${bad.status} ${code(bad)}`);
  const short = await call(`${GW}/api/auth/register`, { method: 'POST', body: { username: 'shortpw', email: `s_${stamp}@u.nus.edu`, password: 'short' } });
  record('R2', 'auth', 'register rejects short password', short.status === 400, `HTTP ${short.status} ${code(short)}`);
  const ok = await call(`${GW}/api/auth/register`, { method: 'POST', body: newUser });
  record('R3', 'auth', 'register valid account -> 201, no password in response', ok.status === 201 && ok.json?.data?.user && !JSON.stringify(ok.json).includes(PW), `HTTP ${ok.status} role=${ok.json?.data?.user?.userRole}`);
  const dup = await call(`${GW}/api/auth/register`, { method: 'POST', body: newUser });
  record('R4', 'auth', 'register duplicate email -> 409', dup.status === 409, `HTTP ${dup.status} ${code(dup)}`);
  const dupCase = await call(`${GW}/api/auth/register`, { method: 'POST', body: { ...newUser, username: newUser.username + 'b', email: newUser.email.toUpperCase() } });
  record('R5', 'auth', 'register duplicate email differing only by case -> 409', dupCase.status === 409, `HTTP ${dupCase.status} ${code(dupCase)}`);
}

// ---------------------------------------------------------------- login / tokens / sessions
let student, admin;
{
  const wrong = await login('alice@u.nus.edu', 'WrongPassword1!');
  record('L1', 'auth', 'login wrong password -> 401', wrong.status === 401, `HTTP ${wrong.status} ${code(wrong)}`);
  const s = await login('alice@u.nus.edu', PW);
  student = s.json?.data?.accessToken;
  const sc = student ? claims(student) : {};
  record('L2', 'auth', 'login alice -> 200 with access token + refresh cookie', s.status === 200 && !!student && s.setCookie.includes('refresh_token='), `HTTP ${s.status}, HttpOnly=${s.setCookie.includes('HttpOnly')}, Path=${(s.setCookie.match(/Path=([^;]+)/) || [])[1]}`);
  record('L3', 'auth', 'access token carries sub, sid, role=STUDENT, iss, aud, exp', sc.role === 'STUDENT' && !!sc.sub && !!sc.sid && !!sc.iss && !!sc.aud && !!sc.exp, `role=${sc.role} iss=${sc.iss} aud=${sc.aud} ttl=${sc.exp - sc.iat}s`);
  const a = await login('admin@nus.edu.sg', PW);
  admin = a.json?.data?.accessToken;
  record('L4', 'auth', 'login admin -> role=ADMIN in token', a.status === 200 && claims(admin).role === 'ADMIN', `HTTP ${a.status}`);
  const std = await login('bob@u.nus.edu', PW, false);
  const keep = await login('bob@u.nus.edu', PW, true);
  const expiresOf = (r) => new Date((r.setCookie.match(/Expires=([^;]+)/) || [])[1]);
  const days = (r) => Math.round((expiresOf(r) - Date.now()) / 86400000);
  record('L5', 'auth', 'keepLoggedIn=true gives a ~30-day refresh cookie vs ~1 day', days(keep) >= 29 && days(std) <= 1, `standard ${days(std)}d, keep ${days(keep)}d`);
  // refresh rotation
  const r1 = await call(`${GW}/api/auth/refresh`, { method: 'POST', cookie: std.cookieValue });
  record('L6', 'auth', 'refresh with valid cookie -> new access token + rotated cookie', r1.status === 200 && !!r1.json?.data?.accessToken && r1.cookieValue && r1.cookieValue !== std.cookieValue, `HTTP ${r1.status}`);
  const replay = await call(`${GW}/api/auth/refresh`, { method: 'POST', cookie: std.cookieValue });
  record('L7', 'auth', 'replaying the old refresh cookie -> 401', replay.status === 401, `HTTP ${replay.status} ${code(replay)}`);
  const r2 = await call(`${GW}/api/auth/refresh`, { method: 'POST', cookie: r1.cookieValue });
  record('L8', 'auth', 'the rotated cookie still works after the replay (replay did not revoke)', r2.status === 200, `HTTP ${r2.status}`);
  const lo = await call(`${GW}/api/auth/logout`, { method: 'POST', cookie: r2.cookieValue });
  const after = await call(`${GW}/api/auth/refresh`, { method: 'POST', cookie: r2.cookieValue });
  record('L9', 'auth', 'logout -> 204 and the session cannot be refreshed afterwards', lo.status === 204 && after.status === 401, `logout ${lo.status}, refresh after ${after.status} ${code(after)}`);
  const norefresh = await call(`${GW}/api/auth/refresh`, { method: 'POST' });
  record('L10', 'auth', 'refresh without any cookie -> 401', norefresh.status === 401, `HTTP ${norefresh.status} ${code(norefresh)}`);
}

// ---------------------------------------------------------------- profile
{
  const none = await call(`${GW}/api/users/me`);
  record('P1', 'profile', 'GET /users/me without token -> 401 MISSING_TOKEN', none.status === 401, `HTTP ${none.status} ${code(none)}`);
  const junk = await call(`${GW}/api/users/me`, { token: 'not.a.token' });
  record('P2', 'profile', 'GET /users/me with garbage token -> 401 INVALID_TOKEN', junk.status === 401, `HTTP ${junk.status} ${code(junk)}`);
  const me = await call(`${GW}/api/users/me`, { token: student });
  record('P3', 'profile', 'GET /users/me returns own profile, no password hash', me.status === 200 && me.json?.data?.user?.email === 'alice@u.nus.edu' && !JSON.stringify(me.json).match(/passwordHash|password_hash/), `fields=${Object.keys(me.json?.data?.user ?? {}).join(',')}`);
  const before = me.json?.data?.user;
  const up = await call(`${GW}/api/users/me`, { method: 'PATCH', token: student, body: { username: `alice_${stamp}` } });
  record('P4', 'profile', 'PATCH /users/me username -> 200 with new username', up.status === 200 && up.json?.data?.user?.username === `alice_${stamp}`, `HTTP ${up.status}`);
  const tamper = await call(`${GW}/api/users/me`, { method: 'PATCH', token: student, body: { username: `alice_${stamp}`, role: 'ADMIN', status: false, userId: '00000000-0000-0000-0000-000000000000', email: 'evil@u.nus.edu' } });
  const afterMe = await call(`${GW}/api/users/me`, { token: student });
  const u = afterMe.json?.data?.user ?? {};
  record('P5', 'profile', 'PATCH cannot change role / status / userId / email (rejected or ignored)', u.userRole === 'STUDENT' && u.status !== false && u.userId === before?.userId && u.email === 'alice@u.nus.edu', `PATCH HTTP ${tamper.status} ${code(tamper)}; role=${u.userRole} email=${u.email}`);
  const badName = await call(`${GW}/api/users/me`, { method: 'PATCH', token: student, body: { username: '' } });
  record('P6', 'profile', 'PATCH empty username -> 400', badName.status === 400, `HTTP ${badName.status} ${code(badName)}`);
  const takenName = await call(`${GW}/api/users/me`, { method: 'PATCH', token: student, body: { username: 'bob' } });
  record('P7', 'profile', 'PATCH username already taken -> 409', takenName.status === 409, `HTTP ${takenName.status} ${code(takenName)}`);
  await call(`${GW}/api/users/me`, { method: 'PATCH', token: student, body: { username: 'alice' } }); // restore
  const wrongPw = await call(`${GW}/api/users/me/password`, { method: 'PUT', token: student, body: { currentPassword: 'Nope12345!', newPassword: 'Password124!' } });
  record('P8', 'profile', 'PUT /users/me/password with wrong current password is rejected', wrongPw.status === 400 || wrongPw.status === 401 || wrongPw.status === 403, `HTTP ${wrongPw.status} ${code(wrongPw)}`);
  const okPw = await call(`${GW}/api/users/me/password`, { method: 'PUT', token: student, body: { currentPassword: PW, newPassword: 'Password124!' } });
  const loginNew = await login('alice@u.nus.edu', 'Password124!');
  const revert = await call(`${GW}/api/users/me/password`, { method: 'PUT', token: loginNew.json?.data?.accessToken, body: { currentPassword: 'Password124!', newPassword: PW } });
  record('P9', 'profile', 'password change works and the new password logs in (then reverted)', okPw.status === 204 && loginNew.status === 200 && revert.status === 204, `change ${okPw.status}, login ${loginNew.status}, revert ${revert.status}`);
}

// ---------------------------------------------------------------- admin user management (role lifecycle)
let bobId, adminId;
{
  const noSlash = await call(`${GW}/api/users`, { token: admin });
  record('A0', 'gateway', 'GET /api/users (no trailing slash) is served directly, like /api/suppliers', noSlash.status === 200, `HTTP ${noSlash.status}${noSlash.status === 301 ? ' (nginx redirects to /api/users/; browsers follow it, curl/fetch with redirect=manual do not)' : ''}`);
  const asStudent = await call(`${GW}/api/users/`, { token: student });
  record('A1', 'rbac', 'GET /users as STUDENT -> 403 ADMIN_REQUIRED', asStudent.status === 403, `HTTP ${asStudent.status} ${code(asStudent)}`);
  const list = await call(`${GW}/api/users/`, { token: admin });
  const users = list.json?.data?.users ?? [];
  bobId = users.find((x) => x.email === 'bob@u.nus.edu')?.userId;
  adminId = users.find((x) => x.email === 'admin@nus.edu.sg')?.userId;
  record('A2', 'rbac', 'GET /users as ADMIN -> 200 list of users', list.status === 200 && users.length >= 3, `HTTP ${list.status}, ${users.length} users, fields=${Object.keys(users[0] ?? {}).join(',')}`);
  const promote = await call(`${GW}/api/users/${bobId}/toggle-role`, { method: 'PATCH', token: admin });
  const demote = await call(`${GW}/api/users/${bobId}/toggle-role`, { method: 'PATCH', token: admin });
  const selfRole = await call(`${GW}/api/users/${adminId}/toggle-role`, { method: 'PATCH', token: admin });
  record('A3', 'rbac', 'PATCH /users/:id/toggle-role promotes, demotes, and refuses a self-target', promote.json?.data?.user?.userRole === 'ADMIN' && demote.json?.data?.user?.userRole === 'STUDENT' && selfRole.status === 403, `promote ${promote.status} ${promote.json?.data?.user?.userRole}, demote ${demote.status} ${demote.json?.data?.user?.userRole}, self ${selfRole.status} ${code(selfRole)}`);
  const tStudent = await call(`${GW}/api/users/${bobId}/toggle-status`, { method: 'PATCH', token: student });
  record('A4', 'rbac', 'PATCH /users/:id/toggle-status as STUDENT -> 403', tStudent.status === 403, `HTTP ${tStudent.status} ${code(tStudent)}`);
  const disable = await call(`${GW}/api/users/${bobId}/toggle-status`, { method: 'PATCH', token: admin });
  record('A5', 'rbac', 'ADMIN disables bob (status -> false)', disable.status === 200 && disable.json?.data?.user?.status === false, `HTTP ${disable.status} status=${disable.json?.data?.user?.status}`);
  const bobLogin = await login('bob@u.nus.edu', PW);
  record('A6', 'rbac', 'disabled account cannot log in', bobLogin.status === 401 || bobLogin.status === 403, `HTTP ${bobLogin.status} ${code(bobLogin)}`);
  const bobTokenBefore = (await (async () => { const r = await call(`${GW}/api/users/${bobId}/toggle-status`, { method: 'PATCH', token: admin }); return r; })());
  record('A7', 'rbac', 'ADMIN re-enables bob (status -> true)', bobTokenBefore.status === 200 && bobTokenBefore.json?.data?.user?.status === true, `HTTP ${bobTokenBefore.status}`);
  const self = await call(`${GW}/api/users/${adminId}/toggle-status`, { method: 'PATCH', token: admin });
  const selfState = self.json?.data?.user?.status;
  record('A8', 'rbac', 'edge case: only admin disabling their own account is refused', self.status >= 400, `HTTP ${self.status} ${code(self)} status=${selfState}`);
  if (self.status === 200 && selfState === false) {
    // put the seeded admin back so the rest of the UAT (and the demo) still works
    const fix = await call(`${GW}/api/users/${adminId}/toggle-status`, { method: 'PATCH', token: admin });
    record('A8b', 'rbac', 'restored the admin account after the self-disable test', fix.json?.data?.user?.status === true, `HTTP ${fix.status}`);
  }
  const unknown = await call(`${GW}/api/users/00000000-0000-0000-0000-000000000000/toggle-status`, { method: 'PATCH', token: admin });
  record('A9', 'rbac', 'PATCH /users/:id/toggle-status unknown id -> 404', unknown.status === 404, `HTTP ${unknown.status} ${code(unknown)}`);
  const notUuid = await call(`${GW}/api/users/not-a-uuid/toggle-status`, { method: 'PATCH', token: admin });
  record('A10', 'rbac', 'PATCH /users/:id/toggle-status with a non-UUID id -> 4xx, not 500', notUuid.status >= 400 && notUuid.status < 500, `HTTP ${notUuid.status} ${code(notUuid)}`);
  const bobTokenRes = await login('bob@u.nus.edu', PW);
  const bobToken = bobTokenRes.json?.data?.accessToken;
  await call(`${GW}/api/users/${bobId}/toggle-status`, { method: 'PATCH', token: admin }); // disable
  const bobMeWhileDisabled = await call(`${GW}/api/users/me`, { token: bobToken });
  const bobRefreshWhileDisabled = await call(`${GW}/api/auth/refresh`, { method: 'POST', cookie: bobTokenRes.cookieValue });
  await call(`${GW}/api/users/${bobId}/toggle-status`, { method: 'PATCH', token: admin }); // re-enable
  record('A11', 'rbac', 'disabling an account cuts off its existing token/session', bobMeWhileDisabled.status === 401 && bobRefreshWhileDisabled.status === 401, `GET /me ${bobMeWhileDisabled.status}, refresh ${bobRefreshWhileDisabled.status}`);
}

// ---------------------------------------------------------------- supplier directory (reads)
let firstSupplier;
{
  const all = await call(`${GW}/api/suppliers`);
  const items = all.json?.data?.suppliers ?? (Array.isArray(all.json?.data) ? all.json.data : []);
  firstSupplier = items[0];
  record('S1', 'supplier', 'GET /suppliers (no auth) -> 200, seeded list', all.status === 200 && items.length >= 21, `HTTP ${all.status}, ${items.length} rows, total=${all.json?.data?.total}`);
  const byId = await call(`${GW}/api/suppliers/${firstSupplier?.id}`);
  record('S2', 'supplier', 'GET /suppliers/:id by UUID -> 200', byId.status === 200 && byId.json?.data?.id === firstSupplier?.id, `HTTP ${byId.status} ${byId.json?.data?.name}`);
  const byCode = await call(`${GW}/api/suppliers/${firstSupplier?.supplierCode}`);
  record('S3', 'supplier', 'GET /suppliers/:supplierCode -> 200', byCode.status === 200 && byCode.json?.data?.id === firstSupplier?.id, `code=${firstSupplier?.supplierCode}`);
  const missing = await call(`${GW}/api/suppliers/does-not-exist`);
  record('S4', 'supplier', 'GET /suppliers/unknown -> 404', missing.status === 404, `HTTP ${missing.status}`);
  const search = await call(`${GW}/api/suppliers?search=${encodeURIComponent(firstSupplier?.name?.split(' ')[0] ?? 'a')}`);
  const sItems = search.json?.data?.suppliers ?? [];
  record('S5', 'supplier', 'search by name substring returns only matches', search.status === 200 && sItems.length >= 1 && sItems.every((x) => JSON.stringify(x).toLowerCase().includes((firstSupplier?.name?.split(' ')[0] ?? 'a').toLowerCase())), `q=${firstSupplier?.name?.split(' ')[0]} -> ${sItems.length}`);
  const zone = await call(`${GW}/api/suppliers?campusZone=${encodeURIComponent(firstSupplier?.campusZone)}`);
  const zItems = zone.json?.data?.suppliers ?? [];
  record('S6', 'supplier', 'filter by campusZone', zone.status === 200 && zItems.length >= 1 && zItems.every((x) => x.campusZone.toLowerCase() === firstSupplier.campusZone.toLowerCase()), `${firstSupplier?.campusZone} -> ${zItems.length}`);
  const cat = await call(`${GW}/api/suppliers?category=${encodeURIComponent(firstSupplier?.category)}`);
  const cItems = cat.json?.data?.suppliers ?? [];
  record('S7', 'supplier', 'filter by category', cat.status === 200 && cItems.length >= 1 && cItems.every((x) => x.category.toLowerCase() === firstSupplier.category.toLowerCase()), `${firstSupplier?.category} -> ${cItems.length}`);
  const sorted = await call(`${GW}/api/suppliers?sortBy=name&sortOrder=desc`);
  const names = (sorted.json?.data?.suppliers ?? []).map((x) => x.name);
  const isDesc = names.every((n, i) => i === 0 || names[i - 1].localeCompare(n) >= 0);
  record('S8', 'supplier', 'sortBy=name&sortOrder=desc is descending', sorted.status === 200 && isDesc, `first=${names[0]} last=${names.at(-1)}`);
  const p1 = await call(`${GW}/api/suppliers?page=1&limit=5`);
  const p2 = await call(`${GW}/api/suppliers?page=2&limit=5`);
  record('S9', 'supplier', 'pagination page=1&limit=5 / page=2 (5 rows, totalPages, disjoint pages)', p1.json?.data?.suppliers?.length === 5 && p1.json?.data?.totalPages >= 5 && p2.json?.data?.suppliers?.[0]?.id !== p1.json?.data?.suppliers?.[0]?.id, `total=${p1.json?.data?.total} totalPages=${p1.json?.data?.totalPages}`);
  const noRes = await call(`${GW}/api/suppliers?search=zzzz_no_such_supplier_zzzz`);
  record('S10', 'supplier', 'no-results search -> 200 with empty list', noRes.status === 200 && (noRes.json?.data?.suppliers ?? []).length === 0, `total=${noRes.json?.data?.total}`);
  const direct = await call(`${SUP_DIRECT}/api/suppliers?limit=1`);
  record('S11', 'supplier', 'supplier-service answers directly on :8002 (independent of gateway/UI)', direct.status === 200, `HTTP ${direct.status}`);
}

// ---------------------------------------------------------------- supplier writes (RBAC + CRUD)
{
  const body = { name: `UAT Cafe ${stamp}`, campusZone: 'COM3', exactLocation: 'COM3 Level 1', category: 'Food', building: 'COM3', floor: '1', description: 'created by D2 UAT' };
  const anon = await call(`${GW}/api/suppliers`, { method: 'POST', body });
  record('W1', 'rbac', 'POST /suppliers without token -> 401', anon.status === 401, `HTTP ${anon.status} ${code(anon)}`);
  const stu = await call(`${GW}/api/suppliers`, { method: 'POST', token: student, body });
  record('W2', 'rbac', 'POST /suppliers as STUDENT -> 403 ADMIN_REQUIRED', stu.status === 403, `HTTP ${stu.status} ${code(stu)}`);
  const missingFields = await call(`${GW}/api/suppliers`, { method: 'POST', token: admin, body: { name: 'only a name' } });
  record('W3', 'supplier', 'POST /suppliers as ADMIN with missing fields -> 400', missingFields.status === 400, `HTTP ${missingFields.status}`);
  const created = await call(`${GW}/api/suppliers`, { method: 'POST', token: admin, body });
  const id = created.json?.data?.id;
  record('W4', 'supplier', 'POST /suppliers as ADMIN -> 201 with generated supplierCode', created.status === 201 && !!id && /^SUP-/.test(created.json?.data?.supplierCode ?? ''), `HTTP ${created.status} code=${created.json?.data?.supplierCode}`);
  const readBack = await call(`${GW}/api/suppliers/${id}`);
  record('W5', 'supplier', 'created supplier is readable (persisted in DB)', readBack.status === 200 && readBack.json?.data?.name === body.name, `HTTP ${readBack.status}`);
  const stuUpd = await call(`${GW}/api/suppliers/${id}`, { method: 'PUT', token: student, body: { name: 'hacked' } });
  record('W6', 'rbac', 'PUT /suppliers/:id as STUDENT -> 403', stuUpd.status === 403, `HTTP ${stuUpd.status}`);
  const upd = await call(`${GW}/api/suppliers/${id}`, { method: 'PUT', token: admin, body: { name: `${body.name} (edited)`, description: 'edited by D2 UAT' } });
  record('W7', 'supplier', 'PUT /suppliers/:id as ADMIN -> 200 with updated fields', upd.status === 200 && upd.json?.data?.name === `${body.name} (edited)`, `HTTP ${upd.status}`);
  const tog = await call(`${GW}/api/suppliers/${id}/toggle`, { method: 'PATCH', token: admin });
  record('W8', 'supplier', 'PATCH /suppliers/:id/toggle flips isActive', tog.status === 200 && tog.json?.data?.isActive === false, `isActive=${tog.json?.data?.isActive}`);
  const tog2 = await call(`${GW}/api/suppliers/${id}/toggle`, { method: 'PATCH', token: admin });
  const soft = await call(`${GW}/api/suppliers/${id}`, { method: 'DELETE', token: admin });
  const afterSoft = await call(`${GW}/api/suppliers/${id}`);
  record('W9', 'supplier', 'DELETE soft-deletes (row kept, isActive=false)', tog2.json?.data?.isActive === true && soft.status === 200 && afterSoft.status === 200 && afterSoft.json?.data?.isActive === false, `delete ${soft.status}, isActive=${afterSoft.json?.data?.isActive}`);
  const stuDel = await call(`${GW}/api/suppliers/${id}?permanent=true`, { method: 'DELETE', token: student });
  record('W10', 'rbac', 'DELETE as STUDENT -> 403', stuDel.status === 403, `HTTP ${stuDel.status}`);
  const hard = await call(`${GW}/api/suppliers/${id}?permanent=true`, { method: 'DELETE', token: admin });
  const gone = await call(`${GW}/api/suppliers/${id}`);
  record('W11', 'supplier', 'DELETE ?permanent=true removes the row -> 404 afterwards', hard.status === 200 && gone.status === 404, `delete ${hard.status}, read ${gone.status}`);
  const expired = await call(`${GW}/api/suppliers/${firstSupplier?.id}`, { method: 'PUT', token: admin.slice(0, -4) + 'AAAA', body: { name: 'x' } });
  record('W12', 'rbac', 'tampered admin token (bad signature) -> 401', expired.status === 401, `HTTP ${expired.status} ${code(expired)}`);
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed`);
const out = process.env.UAT_OUT ?? path.join(tmpdir(), 'uat-d2-api-results.json');
writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`results written to ${out}`);
process.exit(passed === results.length ? 0 : 1);
