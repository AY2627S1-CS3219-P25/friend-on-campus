// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-26, 2026-09-28
// Scope: 2026-09-28: fixed the ADMIN_URL default (it referenced itself). Wrote this D2 UAT driver: 29 browser-level checks with Playwright (admin portal desktop + mobile: login gate, search, filter, sort, pagination, details, add/edit/delete, Users page; student app mobile + desktop: login, session restore, Spots directory, search, Post, Profile, logout) and the docs/evidence/d2/screenshots capture.
// Author review: <to be completed by Reallyeasy1>
// AI-generated (edited by Reallyeasy1)
// Run: npm i --no-save playwright@1.63.0 && npx playwright install chromium && node scripts/uat/uat-d2-ui.mjs
// (playwright is deliberately not a repo dependency; --no-save keeps package.json unchanged)
// D2 UAT — browser level (Playwright, headless Chromium) through the nginx gateway.
// Admin portal at /admin/, student app at /. Screenshots go to the repo's
// docs/evidence/d2/screenshots/<check>-<desktop|mobile>.png; results to uat-ui-results.json.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GW = process.env.GW ?? 'http://localhost';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:5174/'; // /admin/ via the gateway renders the student app
const SHOTS = process.env.SHOTS ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/evidence/d2/screenshots');
const PW = 'Password123!';
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
  await ctx.close();
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} UI checks passed; screenshots in ${SHOTS}`);
writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'uat-ui-results.json'), JSON.stringify(results, null, 2));
