const { chromium, devices } = require('playwright');
const base = process.env.KVIA_URL || 'http://localhost:8765/kvia-prototype';
const results = []; const errs = [];
const check = (name, ok, info='') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror ' + p.url() + ' ' + e.message));
  p.on('console', m => m.type() === 'error' && errs.push('console ' + p.url() + ' ' + m.text()));
  const go = async (u) => { await p.goto(base + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); };
  const q = () => new URL(p.url()).searchParams;

  // 1 firm switch keeps the page and context
  await go('/notices/2026-116619/?as=P1');
  await p.getByRole('button', { name: /Synthetic Company 1/ }).first().click();
  await p.getByRole('option', { name: /Synthetic Company 3/ }).click(); await p.waitForTimeout(800);
  check('firm switch keeps page', p.url().includes('/notices/2026-116619/') && q().get('as') === 'P3', p.url());
  check('firm context shown after switch', (await p.locator('aside').first().innerText()).includes('Synthetic Company 3'));
  check('firm-specific panel follows switch', (await p.getByText('For Synthetic Company 3').count()) > 0);

  // 2 language
  await go('/?as=P1'); await p.getByRole('radio', { name: 'NO' }).click(); await p.waitForTimeout(500);
  check('language switch to Norwegian', (await p.locator('h1').innerText()).startsWith('Finn'), await p.locator('h1').innerText());
  await p.getByRole('link', { name: 'Kunngjøringer' }).first().click(); await p.waitForTimeout(800);
  check('language kept across navigation', q().get('lang') === 'nb' && (await p.locator('h1').innerText()) === 'Kunngjøringer');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  check('language kept after reload', (await p.locator('h1').innerText()) === 'Kunngjøringer');
  await p.getByRole('radio', { name: 'EN' }).click(); await p.waitForTimeout(400);

  // 3 notices filters, combos, URL, clear, back
  await go('/notices/?as=P1');
  const rows = async () => (await p.locator('table tbody tr').count());
  const all = await rows();
  await p.getByRole('button', { name: /^Status:/ }).click(); await p.getByRole('option', { name: /^Active/ }).click(); await p.keyboard.press('Escape');
  const active = await rows();
  await p.getByRole('button', { name: /^Type:/ }).click(); await p.getByRole('option', { name: /^Services/ }).click(); await p.keyboard.press('Escape');
  const combo = await rows();
  check('notices: status filter', active === 12 && all === 29, `${all} → ${active}`);
  check('notices: filters combine', combo > 0 && combo < active, `${combo}`);
  check('notices: filter state in URL', q().get('status') === 'active' && q().get('ctype') === 'Services');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  check('notices: filters restored from URL', (await rows()) === combo);
  await p.getByRole('button', { name: /Estimated value:/ }).click(); await p.getByRole('option', { name: /^Unknown/ }).click(); await p.keyboard.press('Escape');
  const unknownTxt = await p.locator('table tbody').innerText();
  check('notices: unknown values never shown as zero', !/NOK 0m/.test(unknownTxt) && /Unknown/.test(unknownTxt));
  await p.getByRole('button', { name: 'Clear all' }).click(); await p.waitForTimeout(300);
  check('notices: clear all', (await rows()) === all && !q().get('status'));
  await p.getByPlaceholder(/slam/).fill('zzzz-nothing'); await p.waitForTimeout(300);
  check('notices: empty state', (await p.getByText('No notice matches these filters.').count()) === 1);
  await p.getByRole('button', { name: /Clear filters|Clear all/ }).first().click(); await p.waitForTimeout(300);
  await p.locator('thead button', { hasText: 'Fit' }).click(); await p.waitForTimeout(200);
  const firstFit = (await p.locator('table tbody tr').first().innerText());
  check('notices: sort by fit (desc first)', firstFit.includes('Vaskeri'), firstFit.slice(0, 40));
  await p.locator('thead button', { hasText: 'Deadline' }).click(); await p.locator('thead button', { hasText: 'Deadline' }).click(); await p.waitForTimeout(200);
  const lastRow = await p.locator('table tbody tr').last().innerText();
  check('notices: missing deadlines sort last in desc', lastRow.includes('—'), lastRow.slice(0, 50));
  await p.getByRole('button', { name: /^Status:/ }).click(); await p.getByRole('option', { name: /^Awarded/ }).click(); await p.keyboard.press('Escape');
  await p.locator('tbody a').first().click(); await p.waitForTimeout(800);
  await p.goBack({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  check('notices: Back returns with filters', q().get('status') === 'award' && (await rows()) === 7, p.url());

  // 4 notice detail tabs + Back
  await go('/notices/2026-116619/?as=P1');
  await p.getByRole('tab', { name: /Tender documents/ }).click(); await p.waitForTimeout(800);
  check('notice: tab in URL', q().get('tab') === 'documents');
  const canvases = await p.locator('canvas').count();
  check('notice: PDF renders', canvases === 1);
  await p.getByRole('button', { name: /R06/ }).first().click(); await p.waitForTimeout(800);
  check('notice: highlight overlay for selected requirement', (await p.locator('.hl-rect.active').count()) > 0);
  await p.goBack(); await p.waitForTimeout(500);
  check('notice: Back restores previous tab', (await p.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')) === 'true' || q().get('tab') === 'documents', p.url());
  const pdfHref = await p.locator('a[href*=".pdf"]').first().getAttribute('href').catch(() => null);
  if (pdfHref) { const r = await p.request.get(new URL(pdfHref.split('#')[0], base).href); check('notice: PDF link resolves', r.status() === 200, pdfHref); }

  // 5 screening expand + reload
  await go('/screening/?as=P2');
  await p.getByRole('button', { name: /Framework agreement for consultancy/ }).click(); await p.waitForTimeout(400);
  check('screening: open row in URL', q().get('open') === '2026-116579');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  check('screening: expanded row restored', (await p.getByText('Sub-scores per data point').count()) === 1);
  check('screening: flagged notices not scored', (await p.getByText('In review — not scored').count()) === 3);

  // 6 manual addition persistence
  await go('/prototype/run/?as=P1'); await p.getByRole('button', { name: 'Reset demo' }).click();
  await go('/screening/?as=P1&open=2026-116566');
  await p.getByRole('button', { name: 'Create diagnostic report' }).click(); await p.waitForTimeout(400);
  check('manual: processing step shown', (await p.getByText('Preparing the diagnostic report').count()) === 1);
  await p.waitForTimeout(1800);
  check('manual: report revealed', (await p.getByText('Requirement checklist').count()) === 1 && !q().get('added'));
  await go('/reports/?as=P1');
  check('manual: listed as added in this browser', (await p.getByText('Added in this browser').count()) >= 1);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  check('manual: persists after reload', (await p.getByText('Added in this browser').count()) >= 1);
  await go('/reports/?as=P2');
  check('manual: not shown for another firm', (await p.getByText('Added in this browser').count()) === 0);
  await go('/reports/2026-116566/?as=P1');
  check('manual: direct link opens report without flashing hidden state', (await p.getByText('No diagnostic report yet').count()) === 0);
  await go('/prototype/run/?as=P1'); await p.getByRole('button', { name: 'Reset demo' }).click(); await go('/reports/?as=P1');
  check('manual: reset demo removes it', (await p.getByText('Added in this browser').count()) === 0);

  // 7 report requirement selection, Back/Forward, viewer
  await go('/reports/2026-116619/?as=P1');
  await p.getByRole('button', { name: /^R06/ }).first().click(); await p.waitForTimeout(300);
  await p.locator('#req-R01 > button').click(); await p.waitForTimeout(600);
  check('report: requirement in URL', q().get('req') === 'R01');
  check('report: PDF + highlight', (await p.locator('canvas').count()) === 1 && (await p.locator('.hl-rect').count()) > 0);
  await p.goBack(); await p.waitForTimeout(500);
  check('report: Back restores previous requirement', q().get('req') === 'R06', p.url());
  await p.goForward(); await p.waitForTimeout(500);
  check('report: Forward', q().get('req') === 'R01');

  // 8 invalid URL state
  await go('/screening/?as=P9'); await p.waitForTimeout(800);
  check('invalid firm falls back', q().get('as') === 'P1' && (await p.locator('h1').count()) === 1, p.url());
  await go('/reports/2026-116566/?as=P1&lot=Z&req=R99');
  check('invalid lot/req ignored gracefully', (await p.locator('h1').count()) === 1);

  // 9 theme persistence
  await go('/?as=P1'); await p.getByRole('button', { name: /Dark|Light/ }).first().click(); await p.waitForTimeout(200);
  const th1 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await p.reload({ waitUntil: 'networkidle' });
  const th2 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('theme persists', th1 === th2 && !!th1, `${th1}/${th2}`);
  await p.getByRole('button', { name: 'Follow system' }).click();

  // 10 keyboard
  await go('/notices/?as=P1'); await p.keyboard.press('Tab');
  const skip = await p.evaluate(() => document.activeElement?.textContent);
  check('keyboard: skip link first', skip === 'Skip to content', skip);
  await p.getByRole('button', { name: /^Status:/ }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  const opened = await p.getByRole('listbox').count(); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  check('keyboard: dropdown opens and Escape closes', opened === 1 && (await p.getByRole('listbox').count()) === 0);

  // 11 CSV export
  await go('/prototype/test-log/?as=P1');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Export CSV' }).click()]);
  const path = await dl.path(); const txt = require('fs').readFileSync(path, 'utf8');
  check('test log: CSV export', txt.split('\r\n').length >= 12 && txt.includes('Learning / revision'), dl.suggestedFilename());

  // 12 copy button
  await go('/prototype/prompts/?as=P1&view=input');
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await p.getByRole('button', { name: 'Copy' }).first().click(); await p.waitForTimeout(200);
  check('prompts: copy works', (await p.getByText('Copied').count()) === 1);

  // 13 mobile drawer + document reader
  const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
  m.on('pageerror', e => errs.push('mobile pageerror ' + e.message));
  await m.goto(base + '/reports/2026-116619/?as=P1', { waitUntil: 'networkidle' }); await m.waitForTimeout(600);
  await m.getByRole('button', { name: 'Menu' }).click(); await m.waitForTimeout(300);
  check('mobile: drawer opens', (await m.getByRole('dialog').count()) === 1);
  await m.keyboard.press('Escape'); await m.waitForTimeout(300);
  check('mobile: drawer closes', (await m.getByRole('dialog').count()) === 0);
  await m.locator('#req-R06 > button').click(); await m.waitForTimeout(300);
  await m.getByRole('button', { name: 'Show in document' }).click(); await m.waitForTimeout(1200);
  check('mobile: full-screen reader at cited page', (await m.getByRole('dialog').count()) === 1 && (await m.getByText('Page 4 / 6').count()) === 1);
  check('mobile: highlight in reader', (await m.locator('.hl-rect').count()) > 0);

  console.log(results.join('\n'));
  console.log('\nERRORS:\n' + (errs.join('\n') || 'none'));
  await b.close();
})().catch(e => { console.log(results.join('\n')); console.error('SCRIPT FAILED', e.message); process.exit(1); });
