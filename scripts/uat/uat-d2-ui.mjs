// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
// Scope: UO5/UO6 expect the truthful completion and cancellation copy of the author's Notification Redesign (§9).
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Google Antigravity Agent, date: 2026-10-22
// Scope: Updated UO2 to click the inline Confirm button after clicking Accept Errand on the feed card.
// Author review: <to be completed by yanhwee>
//
// Tool: Google Antigravity Agent, date: 2026-10-21
// Scope: Added UO1-UO6 student order lifecycle E2E UI checks (post with durationMinutes, accept, pickup, deliver, complete, cancel, and history persistence) and standardized default screenshot (SHOTS) and JSON result (UAT_OUT) paths under root git-ignored test-results/ (Issue #132).
// Author review: <to be completed by yanhwee>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
// Scope: UD3's published order.accepted event carries courierUsername, as Order Service now sends it (F5.1.1).
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Codex (model: GPT-5), date: 2026-10-11
// Scope: Updated the manual run note now that Chromium Playwright is a locked repository dependency.
// Author review: <to be completed by ngkhengyang>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
// Scope: UD2-UD5: the student app's notification socket, bell badge, toast and Alerts view, with an order event published as Order Service will (AMQP_URL overrides the broker address). UD4 finds the step inside its errand card.
// Author review: <to be completed by Reallyeasy1>
//
// Tool: Codex (model: GPT-6), date: 2026-09-30
// Scope: Test the admin portal through the gateway and the student login's Admin Log In navigation and reload.
// Author review: <to be completed by huangjiaxi1111>
//
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-26, 2026-09-28, 2026-09-29
// Scope: 2026-09-29: results file now goes to the temp folder (or UAT_OUT), like the API driver; header comment corrected. 2026-09-28: fixed the ADMIN_URL default (it referenced itself). Wrote this D2 UAT driver: 29 browser-level checks with Playwright (admin portal desktop + mobile: login gate, search, filter, sort, pagination, details, add/edit/delete, Users page; student app mobile + desktop: login, session restore, Spots directory, search, Post, Profile, logout) and the docs/evidence/d2/screenshots capture.
// Author review: <to be completed by Reallyeasy1>

// AI-generated (edited by Reallyeasy1)
// Run: npx playwright install chromium && npm run test:e2e:ui
// D2 UAT — browser level (Playwright, headless Chromium). Student app through the nginx
// gateway at /; admin portal defaults to the same gateway at /admin/ (override with ADMIN_URL).
// Screenshots go to test-results/screenshots/<check>-<desktop|mobile>.png (or SHOTS);
// results to test-results/uat-d2-ui-results.json (or UAT_OUT).
import amqp from 'amqplib';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const GW = process.env.GW ?? 'http://localhost';
const ADMIN = process.env.ADMIN_URL ?? `${GW}/admin/`;
// AI-generated (edited by yanhwee)
const TEST_RESULTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test-results');
const SHOTS = process.env.SHOTS ?? path.join(TEST_RESULTS_DIR, 'screenshots');
const PW = 'Password123!';
const AMQP_URL = process.env.AMQP_URL ?? 'amqp://order_service:order-service-dev@localhost:5672/campus';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
mkdirSync(SHOTS, { recursive: true });

const results = [];
const record = (id, name, pass, detail = '') => {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(7)} ${name}${detail ? '  -> ' + detail : ''}`);
};
async function step(id, name, fn) {
  try {
    const detail = await fn();
    record(id, name, true, typeof detail === 'string' ? detail : '');
  } catch (e) {
    record(id, name, false, (e.message || String(e)).split('\n')[0].slice(0, 160));
  }
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false });
const stamp = Date.now().toString(36);

const browser = await chromium.launch();

// ============================================================ ADMIN PORTAL, DESKTOP
{
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  await step('UA1', 'admin: login page renders (desktop)', async () => {
    await page.goto(ADMIN);
    await page.getByRole('heading', { name: 'Admin Log In' }).waitFor();
    await shot(page, 'admin-login-desktop');
  });
  await step('UA2', 'admin: STUDENT credentials are refused by the admin gate', async () => {
    await page.locator('input[type=email]').fill('alice@u.nus.edu');
    await page.locator('input[type=password]').fill(PW);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByText(/Access denied|FORBIDDEN_ROLE/).first().waitFor();
    await shot(page, 'admin-login-student-denied-desktop');
  });
  await step('UA3', 'admin: ADMIN login with "Keep me logged in" reaches the dashboard', async () => {
    await page.locator('input[type=email]').fill('admin@nus.edu.sg');
    await page.locator('input[type=password]').fill(PW);
    await page.locator('input[type=checkbox]').check();
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByRole('button', { name: /Add Location/ }).waitFor();
    await page.locator('tbody tr:visible').first().waitFor();
    await shot(page, 'admin-dashboard-desktop');
    return `${await page.locator('tbody tr:visible').count()} rows on page 1`;
  });
  await step('UA4', 'admin: page reload keeps the session (silent refresh)', async () => {
    await page.reload();
    await page.getByRole('button', { name: /Add Location/ }).waitFor();
    await page.locator('tbody tr:visible').first().waitFor();
  });
  const search = page.getByPlaceholder('Search by name, building, code, or zone...');
  const dataRows = () => page.locator('tbody tr:visible').filter({ hasNotText: 'No campus suppliers found' });
  await step('UA5', 'admin: search narrows the table to matching rows', async () => {
    await search.fill('coffee');
    await page.waitForTimeout(400);
    const rows = dataRows();
    const n = await rows.count();
    if (n < 1) throw new Error('no rows for "coffee"');
    for (let i = 0; i < n; i++) {
      const t = (await rows.nth(i).innerText()).toLowerCase();
      if (!t.includes('coffee')) throw new Error(`row without "coffee": ${t.slice(0, 60)}`);
    }
    await shot(page, 'admin-search-desktop');
    await search.fill('');
    return `${n} matching rows`;
  });
  await step('UA6', 'admin: no-results search shows an empty state', async () => {
    await search.fill('zzzz-no-such-supplier');
    await page.waitForTimeout(400);
    const n = await dataRows().count();
    const empty = await page.getByText('No campus suppliers found matching your query.').isVisible();
    await shot(page, 'admin-search-noresults-desktop');
    await search.fill('');
    if (n !== 0 || !empty) throw new Error(`${n} rows shown, empty-state visible=${empty}`);
  });
  await step('UA7', 'admin: filter by category via the Filter modal', async () => {
    await page.getByRole('button', { name: /^Filter$/ }).click();
    await page.getByText('Filter Campus Suppliers').waitFor();
    await page.getByRole('button', { name: 'Food', exact: true }).click();
    await shot(page, 'admin-filter-modal-desktop');
    await page.getByRole('button', { name: /Apply Filters/ }).click();
    await page.waitForTimeout(400);
    const rows = dataRows();
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const t = await rows.nth(i).innerText();
      if (!/Food/i.test(t)) throw new Error(`non-Food row: ${t.slice(0, 60)}`);
    }
    await shot(page, 'admin-filter-desktop');
    await page.reload();
    await page.locator('tbody tr:visible').first().waitFor();
    return `${n} Food rows`;
  });
  await step('UA8', 'admin: clicking the Name header sorts the table', async () => {
    const names = async () => {
      const rows = dataRows();
      const n = await rows.count();
      const out = [];
      for (let i = 0; i < n; i++) out.push((await rows.nth(i).locator('td').nth(1).innerText()).trim());
      return out;
    };
    const before = await names();
    await page.locator('th', { hasText: /Store \/ Facility Name/i }).first().click();
    await page.waitForTimeout(300);
    const a1 = await names();
    await page.locator('th', { hasText: /Store \/ Facility Name/i }).first().click();
    await page.waitForTimeout(300);
    const a2 = await names();
    await shot(page, 'admin-sort-desktop');
    const asc = [...a1].sort((x, y) => x.localeCompare(y));
    const desc = [...asc].reverse();
    const sortedOneWay = JSON.stringify(a1) === JSON.stringify(asc) || JSON.stringify(a1) === JSON.stringify(desc);
    if (!sortedOneWay || JSON.stringify(a1) === JSON.stringify(a2)) throw new Error(`order did not toggle: ${a1[0]} / ${a2[0]}`);
    return `first row: ${before[0]} -> ${a1[0]} -> ${a2[0]}`;
  });
  await step('UA9', 'admin: pagination moves to page 2', async () => {
    const p2 = page.getByRole('button', { name: '2', exact: true });
    await p2.click();
    await page.getByText(/Showing 9 to 16/).waitFor();
    await shot(page, 'admin-page2-desktop');
    await page.getByRole('button', { name: '1', exact: true }).click();
  });
  await step('UA10', 'admin: View Details opens the supplier details modal', async () => {
    await page.locator('[title="View full details"]:visible').first().click();
    await page.waitForTimeout(300);
    await shot(page, 'admin-details-desktop');
    const txt = await page.locator('body').innerText();
    if (!/SUP-\d+/.test(txt)) throw new Error('no supplierCode visible in modal');
    await page.reload();
    await page.locator('tbody tr:visible').first().waitFor();
  });
  const newName = `UAT UI Cafe ${stamp}`;
  await step('UA11', 'admin: Add Location creates a supplier through the API', async () => {
    await page.getByRole('button', { name: /Add Location/ }).click();
    await page.getByPlaceholder('e.g. LiHO Tea @ UTown').fill(newName);
    await page.getByPlaceholder('e.g. Stephen Riady Centre Level 1 next to FairPrice').fill('COM3 Level 1, UAT corner');
    await page.getByPlaceholder('e.g. COM3').fill('COM3');
    await page.getByPlaceholder('e.g. 1').fill('1');
    await page.getByPlaceholder('e.g. Specialty coffee, pastries, and sandwiches').fill('Created by the D2 UI UAT run');
    await shot(page, 'admin-add-modal-desktop');
    await page.locator('form:visible button[type=submit]').last().click();
    await page.getByText(/added successfully/).waitFor();
    await search.fill(newName);
    await page.waitForTimeout(400);
    const n = await dataRows().count();
    await shot(page, 'admin-add-result-desktop');
    if (n !== 1) throw new Error(`${n} rows after create`);
  });
  await step('UA12', 'admin: Edit details updates the supplier', async () => {
    await page.locator('[title="Edit details"]:visible').first().click();
    const nameInput = page.locator('form:visible input').filter({ hasNot: page.locator('[type=checkbox]') }).first();
    await nameInput.fill(`${newName} edited`);
    await shot(page, 'admin-edit-modal-desktop');
    await page.locator('form:visible button[type=submit]').last().click();
    await page.getByText(/updated successfully/).waitFor();
    await search.fill(`${newName} edited`);
    await page.waitForTimeout(400);
    if ((await dataRows().count()) !== 1) throw new Error('edited row not found');
  });
  await step('UA13', 'admin: Delete (soft) marks the supplier inactive', async () => {
    await page.locator('[title="Delete supplier"]:visible').first().click();
    await page.getByText('Delete Campus Supplier').waitFor();
    await shot(page, 'admin-delete-modal-desktop');
    await page.getByRole('button', { name: /Deactivate Supplier/ }).click();
    await page.getByText(/marked as inactive/).waitFor();
    await page.waitForTimeout(300);
    const row = await dataRows().first().innerText();
    if (!/inactive|unavailable/i.test(row)) throw new Error(`row does not show inactive: ${row.slice(0, 80)}`);
  });
  await step('UA14', 'admin: Delete (permanent) removes the supplier', async () => {
    await page.locator('[title="Delete supplier"]:visible').first().click();
    await page.getByText('Delete Campus Supplier').waitFor();
    await page.locator('input[type=checkbox]:visible').last().check();
    await page.getByRole('button', { name: /Permanently Delete/ }).click();
    await page.getByText(/permanently deleted/).waitFor();
    await page.waitForTimeout(400);
    const n = await dataRows().count();
    await shot(page, 'admin-delete-result-desktop');
    if (n !== 0) throw new Error(`${n} rows still match`);
    await search.fill('');
  });
  await step('UA15', 'admin: Users page lists accounts and searches them', async () => {
    await page.getByRole('button', { name: 'Users' }).filter({ visible: true }).first().click();
    await page.getByPlaceholder('Search by username or email...').waitFor();
    await page.getByText('alice@u.nus.edu').filter({ visible: true }).first().waitFor();
    await shot(page, 'admin-users-desktop');
    await page.getByPlaceholder('Search by username or email...').fill('bob');
    await page.waitForTimeout(400);
    const txt = await page.locator('main, body').first().innerText();
    if (!txt.includes('bob@u.nus.edu') || txt.includes('alice@u.nus.edu')) throw new Error('user search did not filter');
    await shot(page, 'admin-users-search-desktop');
  });
  await step('UA16', 'admin: Log Out returns to the login page and the session is gone', async () => {
    await page.getByRole('button', { name: 'Log Out' }).first().click();
    await page.getByRole('heading', { name: 'Admin Log In' }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Admin Log In' }).waitFor({ timeout: 15000 });
  });
  await ctx.close();
}

// ============================================================ ADMIN PORTAL, MOBILE
{
  const ctx = await browser.newContext({ viewport: MOBILE, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await step('UM1', 'admin (mobile): login page and dashboard adapt to 390px', async () => {
    await page.goto(ADMIN);
    await page.getByRole('heading', { name: 'Admin Log In' }).waitFor();
    await shot(page, 'admin-login-mobile');
    await page.locator('input[type=email]').fill('admin@nus.edu.sg');
    await page.locator('input[type=password]').fill(PW);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.locator('[title="View Details"]:visible').first().waitFor();
    const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    await shot(page, 'admin-dashboard-mobile');
    if (!noScroll) throw new Error('horizontal overflow at 390px');
    const tableVisible = await page.locator('table:visible').count();
    return `card view, table visible=${tableVisible > 0}`;
  });
  await step('UM2', 'admin (mobile): hamburger opens the navigation drawer', async () => {
    await page.locator('button:has(svg.lucide-menu)').first().click();
    await page.waitForTimeout(300);
    await shot(page, 'admin-drawer-mobile');
    await page.getByRole('button', { name: 'Users' }).last().click();
    await page.getByPlaceholder('Search by username or email...').waitFor();
    await shot(page, 'admin-users-mobile');
  });
  await step('UM3', 'admin (mobile): details modal on a card', async () => {
    await page.locator('button:has(svg.lucide-menu)').first().click().catch(() => {});
    await page.getByRole('button', { name: 'Suppliers' }).last().click().catch(() => {});
    await page.locator('[title="View Details"]:visible').first().click();
    await page.waitForTimeout(300);
    await shot(page, 'admin-details-mobile');
  });
  await ctx.close();
}

// ============================================================ STUDENT APP, MOBILE
{
  const ctx = await browser.newContext({ viewport: MOBILE, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await step('US1', 'student (mobile): login page renders', async () => {
    await page.goto(`${GW}/`);
    await page.getByRole('button', { name: 'Log In' }).waitFor();
    await shot(page, 'student-login-mobile');
  });
  await step('US1A', 'student login links to the admin login through the same origin', async () => {
    await page.getByRole('link', { name: 'Admin Log In', exact: true }).click();
    await page.getByRole('heading', { name: 'Admin Log In', exact: true }).waitFor();
    if (new URL(page.url()).pathname !== '/admin/') throw new Error('admin base path was not preserved');
    await page.reload();
    await page.getByRole('heading', { name: 'Admin Log In', exact: true }).waitFor();
    await shot(page, 'admin-login-from-student-mobile');
    await page.goto(`${GW}/`);
    await page.getByRole('button', { name: 'Log In', exact: true }).waitFor();
  });
  await step('US2', 'student (mobile): wrong password shows an error box', async () => {
    await page.locator('input[type=email]').fill('alice@u.nus.edu');
    await page.locator('input[type=password]').fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByText(/INVALID|Login failed|credentials/i).first().waitFor();
    await shot(page, 'student-login-error-mobile');
  });
  await step('US3', 'student (mobile): login with "Keep me logged in", feed renders', async () => {
    await page.locator('input[type=password]').fill(PW);
    await page.locator('input[type=checkbox]').check();
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByRole('button', { name: 'Spots' }).waitFor();
    await shot(page, 'student-feed-mobile');
  });
  await step('US4', 'student (mobile): reload keeps the session', async () => {
    await page.reload();
    await page.getByRole('button', { name: 'Spots' }).waitFor();
  });
  await step('US5', 'student (mobile): Spots tab shows the live supplier directory', async () => {
    await page.getByRole('button', { name: 'Spots' }).click();
    await page.getByPlaceholder('Search food, cafes, lockers, print hubs...').waitFor();
    const txt = await page.locator('body').innerText();
    const m = txt.match(/(\d+)\s+Verified/);
    await shot(page, 'student-spots-mobile');
    if (!m || Number(m[1]) < 21) throw new Error(`expected >=21 verified spots, saw "${m?.[0]}"`);
    return `${m[1]} verified spots`;
  });
  await step('US6', 'student (mobile): directory search filters spots', async () => {
    await page.getByPlaceholder('Search food, cafes, lockers, print hubs...').fill('print');
    await page.waitForTimeout(300);
    const txt = await page.locator('body').innerText();
    const m = txt.match(/(\d+)\s+Verified/);
    await shot(page, 'student-spots-search-mobile');
    if (!m || Number(m[1]) < 1 || Number(m[1]) >= 21) throw new Error(`search did not narrow: "${m?.[0]}"`);
    await page.getByPlaceholder('Search food, cafes, lockers, print hubs...').fill('');
    return `${m[1]} spots match "print"`;
  });
  await step('US7', 'student (mobile): Post tab pre-selects a live supplier', async () => {
    await page.getByRole('button', { name: 'Post' }).click();
    await page.locator('select:visible').first().waitFor();
    const options = await page.locator('select:visible').first().locator('option').count();
    await shot(page, 'student-post-mobile');
    if (options < 21) throw new Error(`only ${options} supplier options`);
    return `${options} supplier options`;
  });
  await step('US8', 'student (mobile): Profile shows the live account and edits the username', async () => {
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.locator('input[value="alice@u.nus.edu"]').waitFor();
    await page.getByText('STUDENT', { exact: true }).first().waitFor();
    await shot(page, 'student-profile-mobile');
  });
  await step('US9', 'student (mobile): Log Out returns to the login page and the session is gone', async () => {
    await page.getByRole('button', { name: 'Log Out' }).click();
    await page.getByRole('button', { name: 'Log In' }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Log In' }).waitFor();
  });
  await ctx.close();
}

// ============================================================ STUDENT APP, DESKTOP
{
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await step('UD1', 'student (desktop): login and Spots directory at 1440px', async () => {
    await page.goto(`${GW}/`);
    await page.locator('input[type=email]').fill('bob@u.nus.edu');
    await page.locator('input[type=password]').fill(PW);
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByRole('button', { name: 'Spots' }).waitFor();
    await shot(page, 'student-feed-desktop');
    await page.getByRole('button', { name: 'Spots' }).click();
    await page.getByPlaceholder('Search food, cafes, lockers, print hubs...').waitFor();
    await shot(page, 'student-spots-desktop');
  });

  // AI-generated (edited by Reallyeasy1)
  // Notifications (issue #52, F5): Order Service does not publish yet, so the event is published here as order_service.
  let bobId;
  await step('UD2', 'student (desktop): the socket authenticates after login and the Alerts bell shows no unread', async () => {
    await page.getByText('WS Hub: connected').waitFor(); // needs VITE_SHOW_WS_STATUS unset or true (the default)
    await page.getByRole('button', { name: /^Alerts/ }).first().waitFor();
    const login = await fetch(`${GW}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'bob@u.nus.edu', password: PW }) });
    const token = (await login.json()).data.accessToken;
    bobId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).sub;
    // Clear anything left from earlier runs through the app itself, so the badge reflects what the app knows.
    await page.getByRole('button', { name: /^Alerts/ }).first().click();
    await page.getByRole('heading', { name: 'Alerts' }).waitFor();
    const markAll = page.getByRole('button', { name: 'Mark all as read' });
    if (await markAll.isEnabled()) await markAll.click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=notification-badge]').length === 0);
    await page.getByRole('button', { name: 'Feed' }).first().click();
    if (await page.getByTestId('notification-badge').count() > 0) throw new Error('badge shown with nothing unread');
    return 'connected, badge hidden';
  });
  const orderCode = `UI-${stamp.toUpperCase()}`;
  await step('UD3', 'student (desktop): an order.accepted event for this user shows a toast and a badge of 1', async () => {
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createConfirmChannel();
    const event = { eventId: randomUUID(), eventType: 'order.accepted', timestamp: new Date().toISOString(), orderId: randomUUID(), orderCode, requesterId: bobId, courierId: randomUUID(), courierUsername: 'alice' };
    await new Promise((resolve, reject) => channel.publish('campus.events', 'order.accepted', Buffer.from(JSON.stringify(event)), { persistent: true }, (e) => (e ? reject(e) : resolve())));
    await channel.close();
    await connection.close();
    await page.getByText(`Your errand ${orderCode} was accepted`).first().waitFor();
    await page.getByTestId('notification-badge').first().waitFor();
    await shot(page, 'student-alert-toast-desktop');
    return await page.getByTestId('notification-badge').first().innerText();
  });
  await step('UD4', 'student (desktop): the Alerts view lists it; tapping it marks it read and clears the badge', async () => {
    await page.getByRole('button', { name: /^Alerts/ }).first().click();
    // One card per errand: the order code is in the card header, the steps are the rows inside it.
    const row = page.locator('li').filter({ hasText: orderCode }).getByTestId('notification-row').first();
    await row.waitFor();
    if ((await row.getAttribute('data-unread')) !== 'true') throw new Error('row not marked unread');
    await shot(page, 'student-alerts-desktop');
    await row.getByRole('button').first().click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=notification-badge]').length === 0);
    if ((await row.getAttribute('data-unread')) !== 'false') throw new Error('row still unread after tap');
    return 'read, badge cleared';
  });
  await step('UD5', 'student (desktop): under the Unread filter, opening the only unread errand keeps it open', async () => {
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createConfirmChannel();
    const code = `UI-${stamp.toUpperCase()}-B`;
    const event = { eventId: randomUUID(), eventType: 'order.accepted', timestamp: new Date().toISOString(), orderId: randomUUID(), orderCode: code, requesterId: bobId, courierId: randomUUID() };
    await new Promise((resolve, reject) => channel.publish('campus.events', 'order.accepted', Buffer.from(JSON.stringify(event)), { persistent: true }, (e) => (e ? reject(e) : resolve())));
    await channel.close();
    await connection.close();
    await page.getByTestId('notification-badge').first().waitFor();
    await page.getByRole('tab', { name: /^Unread/ }).click();
    const row = page.locator('li').filter({ hasText: code }).getByTestId('notification-row').first();
    await row.waitFor();
    await row.getByRole('button').first().click();
    await page.waitForFunction(() => document.querySelectorAll('[data-testid=notification-badge]').length === 0);
    await page.getByRole('heading', { name: code }).waitFor();
    await page.getByText("You're all caught up").first().waitFor();
    await shot(page, 'student-alerts-unread-desktop');
    await page.getByRole('tab', { name: /^All/ }).click();
    return `${code} stayed open`;
  });
  await ctx.close();
}

// ============================================================ STUDENT ORDER LIFECYCLE (F3 / ISSUE #132), DESKTOP
// AI-generated (edited by yanhwee)
{
  const aliceCtx = await browser.newContext({ viewport: DESKTOP });
  const bobCtx = await browser.newContext({ viewport: DESKTOP });
  const alicePage = await aliceCtx.newPage();
  const bobPage = await bobCtx.newPage();
  alicePage.setDefaultTimeout(20000);
  bobPage.setDefaultTimeout(20000);

  const lifecycleItem = `UAT Lifecycle Matcha ${stamp}`;
  const cancelItem = `UAT Cancel Errand ${stamp}`;
  let lifecycleCode = '';
  let cancelCode = '';

  await step('UO1', 'student (desktop): requester posts an errand via Post tab and sees it in Tasks posted (OPEN)', async () => {
    await alicePage.goto(`${GW}/`);
    await alicePage.locator('input[type=email]').fill('alice@u.nus.edu');
    await alicePage.locator('input[type=password]').fill(PW);
    await alicePage.getByRole('button', { name: 'Log In' }).click();
    await alicePage.getByRole('button', { name: 'Post' }).first().waitFor();
    await alicePage.getByRole('button', { name: 'Post' }).first().click();

    await alicePage.locator('select:visible').first().waitFor();
    await alicePage.getByPlaceholder('e.g. 1x Cold Brew Coffee + 1x Croissant').fill(lifecycleItem);
    await alicePage.getByPlaceholder('e.g. COM2 Level 2 Room #02-04 (Wearing NUS grey hoodie)').fill('COM1 Study Area');
    await alicePage.getByLabel('Reward credits').fill('5');
    const durationVal = await alicePage.getByLabel('Acceptance duration in minutes').inputValue();
    if (durationVal !== '30') throw new Error(`expected default duration 30, got ${durationVal}`);

    await alicePage.getByRole('button', { name: 'Post Errand' }).click();
    const banner = alicePage.getByText(/Errand ORD-\w+ posted\. Credits reserved\./);
    await banner.waitFor({ timeout: 20000 });
    const bannerText = await banner.innerText();
    const match = bannerText.match(/(ORD-\w+)/);
    if (!match) throw new Error(`could not parse orderCode from "${bannerText}"`);
    lifecycleCode = match[1];

    await alicePage.getByRole('button', { name: 'Tasks' }).first().click();
    const aliceCard = alicePage.getByTestId(`task-card-posted-${lifecycleCode}`);
    await aliceCard.waitFor();
    await aliceCard.getByTestId('cancel-order-btn').waitFor();
    await shot(alicePage, 'student-order-posted-desktop');
    return `${lifecycleCode} OPEN`;
  });

  await step('UO2', 'student (desktop): courier accepts the errand on Feed and sees Mark Picked Up in Tasks accepted', async () => {
    await bobPage.goto(`${GW}/`);
    await bobPage.locator('input[type=email]').fill('bob@u.nus.edu');
    await bobPage.locator('input[type=password]').fill(PW);
    await bobPage.getByRole('button', { name: 'Log In' }).click();
    await bobPage.getByRole('button', { name: 'Tasks' }).first().waitFor();

    const feedCard = bobPage.locator('div.bg-white', { hasText: lifecycleItem }).first();
    await feedCard.waitFor();
    await feedCard.getByRole('button', { name: 'Accept Errand' }).click();
    await feedCard.getByTestId('confirm-accept-order-btn').click();
    await bobPage.getByText('Errand accepted! Head to the pickup location.').waitFor();

    await bobPage.getByRole('button', { name: 'Tasks' }).first().click();
    const bobCard = bobPage.getByTestId(`task-card-accepted-${lifecycleCode}`);
    await bobCard.waitFor();
    await bobCard.getByTestId('pickup-order-btn').waitFor();
    await shot(bobPage, 'student-order-accepted-desktop');
    return `${lifecycleCode} ACCEPTED`;
  });

  await step('UO3', 'student (desktop): courier clicks Mark Picked Up -> status transitions to IN TRANSIT with Mark Delivered', async () => {
    const bobCard = bobPage.getByTestId(`task-card-accepted-${lifecycleCode}`);
    await bobCard.getByTestId('pickup-order-btn').click();
    await bobCard.getByTestId('deliver-order-btn').waitFor();
    const txt = await bobCard.innerText();
    if (!/IN TRANSIT/i.test(txt)) throw new Error(`expected IN TRANSIT on card: ${txt}`);
    await shot(bobPage, 'student-order-in-transit-desktop');
    return `${lifecycleCode} IN_TRANSIT`;
  });

  await step('UO4', 'student (desktop): courier clicks Mark Delivered -> status transitions to DELIVERED', async () => {
    const bobCard = bobPage.getByTestId(`task-card-accepted-${lifecycleCode}`);
    await bobCard.getByTestId('deliver-order-btn').click();
    await bobCard.getByText(/Delivered · Waiting for requester confirmation/i).waitFor();
    const txt = await bobCard.innerText();
    if (!/DELIVERED/i.test(txt)) throw new Error(`expected DELIVERED on card: ${txt}`);
    await shot(bobPage, 'student-order-delivered-desktop');
    return `${lifecycleCode} DELIVERED`;
  });

  await step('UO5', 'student (desktop): requester clicks Confirm Delivery -> COMPLETED and remains in history for both users', async () => {
    await alicePage.getByRole('button', { name: 'Refresh' }).click();
    const aliceCard = alicePage.getByTestId(`task-card-posted-${lifecycleCode}`);
    await aliceCard.getByTestId('complete-order-btn').waitFor();
    await aliceCard.getByTestId('complete-order-btn').click();
    await aliceCard.getByText(/Completed · Delivery confirmed/i).waitFor();
    await shot(alicePage, 'student-order-completed-requester-desktop');

    await bobPage.getByRole('button', { name: 'Refresh' }).click();
    const bobCard = bobPage.getByTestId(`task-card-accepted-${lifecycleCode}`);
    await bobCard.getByText(/Completed · 5 credits are paid once Credit Service settles the escrow/i).waitFor();
    await shot(bobPage, 'student-order-completed-courier-desktop');
    return `${lifecycleCode} COMPLETED in requester + courier history`;
  });

  await step('UO6', 'student (desktop): requester posts an errand and clicks Cancel Errand -> CANCELLED in history', async () => {
    await alicePage.getByRole('button', { name: 'Post' }).first().click();
    await alicePage.locator('select:visible').first().waitFor();
    await alicePage.getByPlaceholder('e.g. 1x Cold Brew Coffee + 1x Croissant').fill(cancelItem);
    await alicePage.getByPlaceholder('e.g. COM2 Level 2 Room #02-04 (Wearing NUS grey hoodie)').fill('Central Library');
    await alicePage.getByLabel('Reward credits').fill('3');
    await alicePage.getByRole('button', { name: 'Post Errand' }).click();

    const banner = alicePage.getByText(/Errand ORD-\w+ posted\. Credits reserved\./);
    await banner.waitFor({ timeout: 20000 });
    const bannerText = await banner.innerText();
    const match = bannerText.match(/(ORD-\w+)/);
    if (!match) throw new Error(`could not parse orderCode from "${bannerText}"`);
    cancelCode = match[1];

    await alicePage.getByRole('button', { name: 'Tasks' }).first().click();
    const cancelCard = alicePage.getByTestId(`task-card-posted-${cancelCode}`);
    await cancelCard.getByTestId('cancel-order-btn').waitFor();
    await cancelCard.getByTestId('cancel-order-btn').click();
    await cancelCard.getByText(/Cancelled · Reserved credits are returned by Credit Service/i).waitFor();
    await shot(alicePage, 'student-order-cancelled-desktop');
    return `${cancelCode} CANCELLED in requester history`;
  });

  await aliceCtx.close();
  await bobCtx.close();
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} UI checks passed; screenshots in ${SHOTS}`);
// AI-generated (edited by yanhwee)
const out = process.env.UAT_OUT ?? path.join(TEST_RESULTS_DIR, 'uat-d2-ui-results.json');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(results, null, 2));
console.log(`results written to ${out}`);
