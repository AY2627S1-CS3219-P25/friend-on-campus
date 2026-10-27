// AI Assistance Disclosure:
// Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
// Scope: Multi-client real-time UAT (issue #197): four Playwright contexts check that notifications and chat stay
// consistent in real time across a requester's two clients, the winning courier and a losing courier, with an
// opt-in restart of the Chat Service container under load. Grown from the throwaway driver that found #195.
// Author review: <to be completed by Reallyeasy1>

// AI-generated (edited by Reallyeasy1)
// Run: npx playwright install chromium && npm run test:e2e:ui:realtime
// Needs a healthy Compose stack with the seed accounts (bob is the requester: alice's seed wallet is drained by
// earlier runs; bob's holds enough). Registers one throwaway courier uatcourier-<stamp>@u.nus.edu through the API.
// Env: GW (gateway, default http://localhost); UAT_RESTART_CHAT=1 enables the Chat Service restart check, which
// runs `docker restart` on UAT_CHAT_CONTAINER (default campuserrand-chat-service); UAT_OUT overrides the JSON path.
// Results: test-results/uat-realtime/uat-realtime-results.json and screenshots in test-results/uat-realtime/.
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const GW = process.env.GW ?? 'http://localhost';
const PW = 'Password123!';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test-results/uat-realtime');
const UAT_OUT = process.env.UAT_OUT ?? path.join(OUT, 'uat-realtime-results.json');
const RESTART_CHAT = process.env.UAT_RESTART_CHAT === '1';
const CHAT_CONTAINER = process.env.UAT_CHAT_CONTAINER ?? 'campuserrand-chat-service';
const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };
mkdirSync(OUT, { recursive: true });

const stamp = Date.now().toString(36);
const results = [];
const issues = {};
const pages = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function record(id, name, pass, detail = '', skipped = false) {
  results.push({ id, name, pass, skipped, detail });
  console.log(`${skipped ? 'SKIP' : pass ? 'PASS' : 'FAIL'}  ${id.padEnd(5)} ${name}${detail ? '  -> ' + detail : ''}`);
}
async function step(id, name, fn) {
  try {
    const detail = await fn();
    record(id, name, true, typeof detail === 'string' ? detail : '');
  } catch (e) {
    record(id, name, false, (e.message || String(e)).split('\n')[0].slice(0, 240));
    await Promise.all(Object.entries(pages).map(([n, p]) => shot(p, `${id.toLowerCase()}-fail-${n.toLowerCase()}`)));
  }
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
async function waitFor(fn, timeout = 10000, every = 200) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    let ok = false;
    try { ok = await fn(); } catch { ok = false; }
    if (ok) return Date.now() - t0;
    await sleep(every);
  }
  throw new Error(`timed out after ${timeout} ms`);
}

async function login(page, email) {
  await page.goto(`${GW}/`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(PW);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.getByRole('button', { name: 'Post' }).first().waitFor();
}
const nav = async (page, tab) => page.getByRole('button', { name: new RegExp(`^${tab}`) }).first().click();
// The unread badge is read from a client on a list tab; the errand page is checked for its own live status instead.
const badge = async (page) => {
  const b = page.getByTestId('notification-badge');
  return (await b.count()) ? Number((await b.first().innerText()).trim()) || 0 : 0;
};
async function refreshList(page) {
  const r = page.getByRole('button', { name: 'Refresh' });
  if (await r.count()) await r.first().click(); else await page.reload();
}
async function openCard(page, card) {
  await card.waitFor();
  await card.getByTestId('open-errand-link').click();
  await page.getByTestId('status-tracker').waitFor();
  return page.getByTestId('errand-details');
}
const openPosted = async (page, code) => { await nav(page, 'Tasks'); return openCard(page, page.getByTestId(`task-card-posted-${code}`)); };
async function openFromFeed(page, item) {
  await nav(page, 'Feed');
  await refreshList(page);
  return openCard(page, page.locator('article', { hasText: item }).first());
}
async function postErrand(page, item, reward) {
  await nav(page, 'Post');
  await page.locator('select:visible').first().waitFor();
  await page.getByPlaceholder('e.g. 1x Cold Brew Coffee + 1x Croissant').fill(item);
  await page.getByPlaceholder('e.g. COM2 Level 2 Room #02-04 (Wearing NUS grey hoodie)').fill('COM1 Study Area');
  await page.getByLabel('Reward credits').fill(String(reward));
  await page.getByRole('button', { name: 'Post Errand' }).click();
  const banner = page.getByText(/Errand ORD-\w+ posted\. Credits reserved\./);
  await banner.waitFor({ timeout: 20000 });
  return (await banner.innerText()).match(/(ORD-\w+)/)[1];
}
// Message markers M-<side>-<n> read out of the chat list, in display order.
const msgs = (page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('[data-testid=chat-panel] ul > li')).flatMap((li) => li.innerText.match(/M-[a-z]+-\d+/g) ?? []));
async function send(page, text) {
  const ta = page.getByLabel('Message');
  await ta.fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
  await waitFor(async () => (await ta.inputValue()) === '', 10000, 100);
}
/** A send that may be refused: 'sent', 'Send disabled (…)' or the panel's error text. */
async function trySend(page, text, timeout = 15000) {
  const ta = page.getByLabel('Message');
  await ta.fill(text);
  const sendBtn = page.getByRole('button', { name: 'Send' });
  if (await sendBtn.isDisabled()) { await ta.fill(''); return `Send disabled (chat "${await chatTitle(page)}")`; }
  await sendBtn.click();
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await ta.inputValue()) === '') return 'sent';
    const panel = (await page.getByTestId('chat-panel').innerText()).replace(/\s+/g, ' ');
    const m = panel.match(/(Connection lost[^.]*|No reply from the server[^.]*|not sent[^.]*|try again[^.]*)/i);
    if (m) return `error: ${m[1].trim()}`;
    await sleep(200);
  }
  return 'no outcome';
}
const chatTitle = async (page) => page.locator('[data-testid=chat-panel] [title^="Chat "]').first().getAttribute('title').catch(() => null);
async function alertRows(page, code, re) {
  await nav(page, 'Alerts');
  await page.getByRole('heading', { name: 'Alerts' }).waitFor();
  await sleep(600);
  return page.getByTestId('notification-row').evaluateAll((els, [c, src]) => els.map((e) => e.innerText.replace(/\s+/g, ' ')).filter((t) => t.includes(c) && new RegExp(src, 'i').test(t)), [code, re.source]);
}
async function acceptOn(page) {
  const d = page.getByTestId('errand-details');
  await d.getByTestId('accept-order-btn').click();
  await d.getByTestId('confirm-accept-order-btn').click();
}
async function acceptOutcome(page) {
  const d = page.getByTestId('errand-details');
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    if (await d.getByTestId('pickup-order-btn').count()) return { won: true, ms: Date.now() - t0 };
    const text = (await d.innerText()).replace(/\s+/g, ' ');
    const m = text.match(/([^.]*(?:another courier|already|no longer|conflict|taken)[^.]*)/i);
    if (m) return { won: false, ms: Date.now() - t0, text: m[1].trim().slice(0, 140) };
    await sleep(200);
  }
  return { won: false, ms: 15000, text: 'no outcome within 15 s' };
}
const dockerRestart = (container) => new Promise((resolve) => execFile('docker', ['restart', container], (err, stdout, stderr) => resolve({ err, out: `${stdout}${stderr}`.trim() })));

const browser = await chromium.launch();
const mk = async (name, viewport) => {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  issues[name] = [];
  pages[name] = page;
  page.on('pageerror', (e) => issues[name].push(`pageerror: ${e.message.slice(0, 160)}`));
  page.on('response', (r) => { if (r.status() >= 400) issues[name].push(`${r.status()} ${r.request().method()} ${r.url().replace(GW, '')}`); });
  page.on('requestfailed', (r) => issues[name].push(`requestfailed ${r.method()} ${r.url().replace(GW, '')} ${r.failure()?.errorText ?? ''}`));
  return page;
};
const R1 = await mk('R1', DESKTOP);
const R2 = await mk('R2', MOBILE);
const C1 = await mk('C1', DESKTOP);
const C2 = await mk('C2', DESKTOP);

const c2Name = `uatcourier-${stamp}`;
const c2Email = `${c2Name}@u.nus.edu`;
let c2Ready = false;
try {
  const res = await fetch(`${GW}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: c2Name, email: c2Email, password: PW }) });
  c2Ready = res.ok;
  if (!c2Ready) console.log('register C2 failed', res.status, (await res.text()).slice(0, 200));
} catch (e) { console.log('register C2 error', e.message); }

const item = `UAT RT Bubble Tea ${stamp}`;
const item2 = `UAT RT Cancel ${stamp}`;
let code = '';
let code2 = '';
let winner = null;
let loser = null;
let winnerName = '';

await step('RT01', 'four clients log in; notification socket connected on each', async () => {
  await Promise.all([login(R1, 'bob@u.nus.edu'), login(R2, 'bob@u.nus.edu'), login(C1, 'alice@u.nus.edu'), c2Ready ? login(C2, c2Email) : Promise.resolve()]);
  const all = [R1, R2, C1, ...(c2Ready ? [C2] : [])];
  await Promise.all(all.map((p) => p.getByText('WS Hub: connected').waitFor()));
  return `${all.length} clients connected${c2Ready ? ` (C2 = ${c2Name}, registered via the API)` : ' (C2 registration failed; race skipped)'}; bob unread before: R1=${await badge(R1)} R2=${await badge(R2)}`;
});

await step('RT02', 'requester posts; the posting receipt reaches the requester\'s second client live (card and badge, no reload)', async () => {
  await nav(R2, 'Tasks');
  const b0 = await badge(R2);
  code = await postErrand(R1, item, 2);
  const cardMs = await waitFor(async () => (await R2.getByTestId(`task-card-posted-${code}`).count()) > 0, 15000);
  const badgeMs = await waitFor(async () => (await badge(R2)) > b0, 10000);
  await shot(R2, 'rt02-r2-mobile-tasks-live');
  await openPosted(R1, code);
  return `${code}; on R2 the Tasks card appeared after ${cardMs} ms and the badge went ${b0}→${await badge(R2)} after ${badgeMs} ms, no reload`;
});

await step('RT03', 'courier Feed shows the new errand without Refresh (15 s poll while the Feed is on screen)', async () => {
  await nav(C1, 'Feed');
  const ms = await waitFor(async () => (await C1.locator('article', { hasText: item }).count()) > 0, 25000, 500);
  await openCard(C1, C1.locator('article', { hasText: item }).first());
  if (c2Ready) await openFromFeed(C2, item);
  return `C1 Feed showed the card ${ms} ms after the Feed tab was opened, no Refresh; C2 after Refresh; both opened the errand page`;
});

await step('RT04', 'two couriers accept at the same moment: exactly one wins; requester clients get one alert each; R1 page ACCEPTED live', async () => {
  if (!/OPEN/i.test(await R1.getByTestId('errand-details').innerText())) throw new Error('R1 page not OPEN before the race');
  const couriers = c2Ready ? [C1, C2] : [C1];
  await Promise.all(couriers.map((p) => acceptOn(p)));
  const outcomes = await Promise.all(couriers.map((p) => acceptOutcome(p)));
  const wins = outcomes.filter((o) => o.won).length;
  if (wins !== 1) throw new Error(`expected exactly one winner, got ${wins}: ${JSON.stringify(outcomes)}`);
  const wi = outcomes.findIndex((o) => o.won);
  winner = couriers[wi];
  loser = c2Ready ? couriers[1 - wi] : null;
  winnerName = winner === C1 ? 'alice' : c2Name;
  const liveMs = await waitFor(async () => /ACCEPTED/i.test(await R1.getByTestId('errand-details').innerText()), 15000);
  await shot(R1, 'rt04-r1-accepted-live');
  if (loser) await shot(loser, 'rt04-loser-conflict');
  const r2Rows = await alertRows(R2, code, /accepted/);
  const r1Rows = await alertRows(R1, code, /accepted/);
  await openPosted(R1, code);
  await openPosted(R2, code);
  if (r2Rows.length !== 1 || r1Rows.length !== 1) throw new Error(`accepted alerts: R2=${r2Rows.length} R1=${r1Rows.length} (expected 1 each)`);
  return `winner=${winnerName}; loser saw "${loser ? outcomes[1 - wi].text : 'n/a'}"; R1 page ACCEPTED ${liveMs} ms after the race; one accepted alert on each requester client${r2Rows[0].includes(winnerName) ? ', naming the winner' : ' (winner not named)'}`;
});

await step('RT05', 'first chat exchange is live both ways; the losing courier gets no chat', async () => {
  await send(winner, 'M-w-1');
  const toR1 = await waitFor(async () => (await msgs(R1)).includes('M-w-1'), 10000);
  const toR2 = await waitFor(async () => (await msgs(R2)).includes('M-w-1'), 10000);
  await send(R1, 'M-r-1');
  const toW = await waitFor(async () => (await msgs(winner)).includes('M-r-1'), 10000);
  const toR2b = await waitFor(async () => (await msgs(R2)).includes('M-r-1'), 10000);
  let loserNote = 'no second courier';
  if (loser) {
    await loser.reload();
    await loser.getByTestId('status-tracker').waitFor();
    const panels = await loser.getByTestId('chat-panel').count();
    const accept = await loser.getByTestId('accept-order-btn').count();
    loserNote = `loser after reload: chat panels=${panels}, accept buttons=${accept}`;
    if (panels || accept) throw new Error(loserNote);
  }
  await shot(R1, 'rt05-r1-chat');
  return `winner→R1 ${toR1} ms, winner→R2 ${toR2} ms, R1→winner ${toW} ms, R1→R2 ${toR2b} ms; ${loserNote}`;
});

await step('RT06', 'concurrent burst 5+5: all three clients end with the same ordered list', async () => {
  await Promise.all([
    (async () => { for (let i = 2; i <= 6; i += 1) await send(R1, `M-r-${i}`); })(),
    (async () => { for (let i = 2; i <= 6; i += 1) await send(winner, `M-w-${i}`); })(),
  ]);
  const ms = await waitFor(async () => (await msgs(R1)).length === 12 && (await msgs(R2)).length === 12 && (await msgs(winner)).length === 12, 15000);
  const [a, b, c] = await Promise.all([msgs(R1), msgs(R2), msgs(winner)]);
  const same = JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(b) === JSON.stringify(c);
  const unique = new Set(a).size === a.length;
  await shot(R2, 'rt06-r2-mobile-burst');
  if (!same || !unique) throw new Error(`lists differ or duplicate: R1=${a.join(',')} R2=${b.join(',')} W=${c.join(',')}`);
  return `12 messages, identical order on R1, R2 and winner, settled ${ms} ms after the last send: ${a.join(' ')}`;
});

await step('RT07', 'client offline: indicator shows it and Send is disabled; back online reconnects and catches up without reload', async () => {
  await R2.context().setOffline(true);
  const dropMs = await waitFor(async () => /disconnected/i.test((await chatTitle(R2)) ?? ''), 5000, 100);
  const sendDisabled = await R2.getByRole('button', { name: 'Send' }).isDisabled();
  for (let i = 7; i <= 9; i += 1) await send(winner, `M-w-${i}`);
  await sleep(1000);
  const absentOffline = !(await msgs(R2)).includes('M-w-9');
  await R2.context().setOffline(false);
  const upMs = await waitFor(async () => (await chatTitle(R2)) === 'Chat connected', 15000, 100);
  const ms = await waitFor(async () => (await msgs(R2)).length === 15, 30000, 250);
  await shot(R2, 'rt07-r2-after-online');
  if (!sendDisabled) throw new Error('Send was enabled while offline');
  return `indicator went disconnected ${dropMs} ms after the network dropped, Send disabled; M-w-9 absent while offline=${absentOffline}; reconnected ${upMs} ms after going online and all 15 present ${ms} ms after that`;
});

await step('RT08', 'persistence: R1 reload shows the same list as the winner', async () => {
  await R1.reload();
  await R1.getByTestId('status-tracker').waitFor();
  await waitFor(async () => (await msgs(R1)).length === 15, 15000);
  const [a, c] = await Promise.all([msgs(R1), msgs(winner)]);
  if (JSON.stringify(a) !== JSON.stringify(c)) throw new Error(`after reload R1=${a.join(',')} winner=${c.join(',')}`);
  return '15 messages, same order after reload';
});

// Opt-in: restarts a container on the host running the stack, so it never happens by surprise.
if (!RESTART_CHAT) {
  record('RT14', 'Chat Service restarts under three connected clients', true, 'set UAT_RESTART_CHAT=1 to run; restarts ' + CHAT_CONTAINER, true);
} else {
  await step('RT14', 'Chat Service restarts under three connected clients: sends fail cleanly, everyone reconnects, history agrees', async () => {
    const before = await Promise.all([chatTitle(R1), chatTitle(R2), chatTitle(winner)]);
    if (before.some((t) => t !== 'Chat connected')) throw new Error(`not all connected before restart: ${before.join(', ')}`);
    const restart = dockerRestart(CHAT_CONTAINER);
    const dropMs = await waitFor(async () => (await Promise.all([R1, R2, winner].map(chatTitle))).some((t) => t !== 'Chat connected'), 30000, 250);
    const during = await trySend(winner, 'M-w-10');
    const r = await restart;
    if (r.err) throw new Error(`docker restart failed: ${r.out.slice(0, 120)}`);
    const upMs = await waitFor(async () => (await Promise.all([R1, R2, winner].map(chatTitle))).every((t) => t === 'Chat connected'), 90000, 500);
    const after = await trySend(winner, 'M-w-11');
    if (after !== 'sent') throw new Error(`send after reconnect: ${after}`);
    const ms = await waitFor(async () => { const [a, b, c] = await Promise.all([msgs(R1), msgs(R2), msgs(winner)]); return a.includes('M-w-11') && JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(b) === JSON.stringify(c); }, 20000, 250);
    const list = await msgs(R1);
    await shot(winner, 'rt14-winner-after-restart');
    return `clients saw the drop ${dropMs} ms after restart began; send during downtime: ${during}; all reconnected ${upMs} ms later; post-restart message on all three ${ms} ms after send; ${list.length} messages identical`;
  });
}

await step('RT09', 'pickup and deliver propagate live: R1 page status, R2 badge on the Tasks tab', async () => {
  await nav(R2, 'Tasks');
  const b0 = await badge(R2);
  await winner.getByTestId('pickup-order-btn').click();
  const t1 = await waitFor(async () => /IN TRANSIT/i.test(await R1.getByTestId('errand-details').innerText()), 15000);
  const bm1 = await waitFor(async () => (await badge(R2)) > b0, 15000);
  const b1 = await badge(R2);
  await winner.getByTestId('deliver-order-btn').click();
  const t2 = await waitFor(async () => /DELIVERED/i.test(await R1.getByTestId('errand-details').innerText()), 15000);
  const bm2 = await waitFor(async () => (await badge(R2)) > b1, 15000);
  const rows = await alertRows(R2, code, /delivered/);
  await shot(R1, 'rt09-r1-delivered-live');
  if (rows.length !== 1) throw new Error(`delivered alerts on R2: ${rows.length}`);
  return `R1 page IN TRANSIT after ${t1} ms, DELIVERED after ${t2} ms (no reload); R2 badge ${b0}→${b1} after ${bm1} ms, →${await badge(R2)} after ${bm2} ms; one delivered alert`;
});

await step('RT10', 'confirm delivery closes the courier\'s chat live and alerts the courier', async () => {
  await R1.getByTestId('complete-order-btn').click();
  const ms = await waitFor(async () => /read-only/i.test(await winner.getByTestId('chat-panel').innerText()), 20000);
  const composer = await winner.getByLabel('Message').count();
  await shot(winner, 'rt10-winner-chat-readonly');
  const rows = await alertRows(winner, code, /confirmed|completed/);
  if (composer) throw new Error('composer still rendered after close');
  if (rows.length !== 1) throw new Error(`completion alerts on the courier: ${rows.length}`);
  return `read-only notice on the courier ${ms} ms after confirmation, composer gone; one completion alert`;
});

await step('RT11', 'unread counts agree between the requester\'s two clients; mark all read on R1 clears R2 live', async () => {
  await nav(R1, 'Tasks');
  await nav(R2, 'Tasks');
  await sleep(1000);
  const [a, b] = await Promise.all([badge(R1), badge(R2)]);
  if (a !== b || a === 0) throw new Error(`R1 badge ${a} vs R2 badge ${b}`);
  await nav(R1, 'Alerts');
  await R1.getByRole('heading', { name: 'Alerts' }).waitFor();
  const markAll = R1.getByRole('button', { name: 'Mark all as read' });
  if (await markAll.isEnabled()) await markAll.click();
  const ms = await waitFor(async () => (await badge(R2)) === 0, 20000);
  await shot(R2, 'rt11-r2-badge-cleared');
  return `both clients showed ${a} unread; R2 cleared ${ms} ms after R1 marked all read`;
});

await step('RT12', 'cancel after acceptance reaches the courier live; chat retained read-only; one cancellation alert', async () => {
  code2 = await postErrand(R1, item2, 1);
  await openFromFeed(C1, item2);
  await acceptOn(C1);
  await C1.getByTestId('pickup-order-btn').waitFor();
  await send(C1, 'M-c-1');
  const d = await openPosted(R1, code2);
  await waitFor(async () => (await msgs(R1)).includes('M-c-1'), 10000);
  await d.getByTestId('cancel-order-btn').click();
  await d.getByTestId('end-state').getByText(/Cancelled/i).waitFor();
  const ms = await waitFor(async () => /Cancelled/i.test(await C1.getByTestId('end-state').innerText().catch(() => '')), 20000);
  const panel = await C1.getByTestId('chat-panel').count();
  const ro = /read-only/i.test(panel ? await C1.getByTestId('chat-panel').innerText() : '');
  const kept = (await msgs(C1)).includes('M-c-1');
  await shot(C1, 'rt12-c1-cancelled-live');
  const rows = await alertRows(C1, code2, /cancelled/);
  if (!panel || !ro || !kept) throw new Error(`courier after cancel: panel=${panel} readOnly=${ro} historyKept=${kept}`);
  if (rows.length !== 1) throw new Error(`cancellation alerts on the courier: ${rows.length}`);
  return `${code2}: courier page Cancelled ${ms} ms after the requester cancelled, chat kept read-only, one cancellation alert`;
});

await step('RT13', 'HTTP and console hygiene: only the expected 4xx/5xx (session restore before login, new wallet 404, accept 409, chat 502 during the restart)', async () => {
  const expected = (l) => /^401 (GET|POST) \/api\/auth\//.test(l) || /^404 GET \/api\/credits\/wallet/.test(l) || /^409 (POST|PATCH) \/api\/orders\/.*accept/.test(l) || (RESTART_CHAT && /^502 GET \/api\/chat\//.test(l));
  const bad = Object.entries(issues).flatMap(([n, list]) => list.filter((l) => !expected(l)).map((l) => `${n}: ${l}`));
  const seen = Object.entries(issues).flatMap(([, list]) => list);
  if (bad.length) throw new Error(`${bad.length} unexpected: ${bad.slice(0, 4).join(' | ')}`);
  return `${seen.length} expected only: ${[...new Set(seen.map((s) => s.replace(/[0-9a-f-]{36}/g, ':id')))].join(' | ')}`;
});

writeFileSync(UAT_OUT, JSON.stringify({ stamp, code, code2, winner: winnerName, c2Email, restartChat: RESTART_CHAT, results, issues }, null, 2));
await browser.close();
const failed = results.filter((r) => !r.pass).length;
const skipped = results.filter((r) => r.skipped).length;
console.log(`\n${results.length - failed}/${results.length} real-time checks passed${skipped ? ` (${skipped} skipped)` : ''}; results in ${UAT_OUT}`);
process.exit(failed ? 1 : 0);
