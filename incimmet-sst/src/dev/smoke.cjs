/* Prueba de humo interactiva (paneles, teclado, filtros, idiomas, exportaciones, modo presentación, reflujo): node src/dev/smoke.cjs [baseUrl] */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const base = process.argv[2] || 'http://localhost:5173', out = path.resolve(__dirname, '../../private/shots');
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  let browser;
  try { browser = await chromium.launch({ args }); } catch { browser = await chromium.launch({ args, executablePath: '/usr/bin/google-chrome' }); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [], res = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  const expect = (c, msg) => { if (!c) throw new Error(msg); };
  const esc = async () => { await page.keyboard.press('Escape'); await page.waitForSelector('.drawer', { state: 'detached' }); };
  const step = async (name, fn) => {
    try { const r = await fn(); res.push(`ok   ${name}${r ? ' — ' + r : ''}`); }
    catch (e) { res.push(`FAIL ${name} — ${String(e.message || e).split('\n')[0].slice(0, 150)}`); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(200); }
  };
  const menu = async (i) => { await page.click('.menu > button'); await page.locator('.menu-i').nth(i).click(); };
  const shot = (n) => page.screenshot({ path: path.join(out, n) });
  await page.goto(`${base}/?data=demo&mock=full&theme=dark&lang=es`, { waitUntil: 'load' });
  await page.waitForSelector('.sheet[data-ready] .card', { timeout: 30000 });
  await page.waitForTimeout(1500);
  await step('kpi sheet: click, focus trap, Esc, focus return', async () => {
    await page.locator('.card').nth(1).click(); await page.waitForSelector('.drawer');
    expect(await page.evaluate(() => !!document.activeElement.closest('.drawer')), 'focus not in drawer');
    for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.drawer')), 'focus escaped the drawer');
    const title = await page.locator('.drawer h2').innerText(); await shot('drawer-kpi.png'); await esc();
    expect(await page.evaluate(() => document.activeElement.classList.contains('card')), 'focus not returned');
    return title;
  });
  await step('kpi sheet by keyboard (Enter)', async () => { await page.locator('.card').nth(2).focus(); await page.keyboard.press('Enter'); await page.waitForSelector('.drawer'); await esc(); });
  await step('catalogue + search', async () => { await menu(1); await page.waitForSelector('.drawer .cat'); const all = await page.locator('.cat-r').count(); await page.fill('.drawer input[type=search]', 'R1'); const n = await page.locator('.cat-r').count(); await esc(); expect(all >= 80 && n > 0 && n < all, `counts ${all}/${n}`); return `${all} → ${n}`; });
  await step('local methodology tabs', async () => { await menu(2); await page.waitForSelector('.drawer [role=tab]'); await page.getByRole('tab', { name: 'Colombia' }).click(); const rows = await page.locator('.drawer .tbl tbody tr').count(); await esc(); expect(rows > 0, 'no rows'); return `${rows} rows`; });
  await step('import drawer + templates', async () => { await menu(3); await page.waitForSelector('.drawer .drop'); const links = await page.locator('.tpl a').count(); const r = await page.evaluate(() => fetch('/templates/plan_anual.csv').then((x) => x.status)); await shot('drawer-import.png'); await esc(); expect(links === 9 && r === 200, `templates ${links} status ${r}`); });
  await step('reconciliation table', async () => { await menu(4); await page.waitForSelector('.drawer .tbl'); const rows = await page.locator('.drawer .tbl tbody tr').count(); await esc(); expect(rows >= 1, 'no rows'); return `${rows} rows`; });
  await step('customise slot + reset', async () => { await menu(0); await page.waitForSelector('.slots select'); await page.locator('.slots select').first().selectOption('R15'); await esc(); const code = await page.locator('.card .code').first().innerText(); await menu(0); await page.locator('.drawer .row .btn').first().click(); await esc(); const back = await page.locator('.card .code').first().innerText(); expect(code === 'R15' && back !== 'R15', `first card ${code} → ${back}`); });
  await step('country filter + footer chip', async () => { const before = await page.locator('.ctx .val').first().innerText(); await page.locator('.hdr .chips button').nth(1).click(); await page.waitForSelector('.fchip'); const after = await page.locator('.ctx .val').first().innerText(); await page.locator('.fchip').first().click(); await page.waitForSelector('.fchip', { state: 'detached' }); expect(before !== after, 'context did not change'); return `${before} → ${after}`; });
  await step('languages EN / PT without raw keys', async () => {
    await page.getByRole('button', { name: 'EN', exact: true }).click(); const en = await page.locator('.title').innerText();
    const rawEn = await page.evaluate(() => (document.body.innerText.match(/\b(ui|kpi|eng|map|rec)\.[a-z][\w.]+/g) || []).slice(0, 5));
    await page.getByRole('button', { name: 'PT', exact: true }).click(); const pt = await page.locator('.title').innerText(); await page.waitForTimeout(400);
    const rawPt = await page.evaluate(() => (document.body.innerText.match(/\b(ui|kpi|eng|map|rec)\.[a-z][\w.]+/g) || []).slice(0, 5));
    await shot('lang-pt-1440x900.png'); await page.getByRole('button', { name: 'ES', exact: true }).click();
    expect(/OHS/.test(en) && /Inteligência/.test(pt), `${en} | ${pt}`); expect(!rawEn.length && !rawPt.length, 'raw keys: ' + [...rawEn, ...rawPt].join(','));
  });
  await step('signal, gate and risk-cell drawers', async () => { await page.locator('.signal').first().click(); await page.waitForSelector('.drawer'); await esc(); await page.locator('.gate').click(); await page.waitForSelector('.drawer .tbl'); await esc(); await page.locator('.mx-c').first().click(); await page.waitForSelector('.drawer dl'); await esc(); });
  await step('projects tab + project sheet', async () => { await page.getByRole('tab', { name: 'Proyectos' }).click(); await page.waitForSelector('.tbl-proj'); await shot('tab-projects.png'); await page.locator('.tbl-proj .link-btn').first().click(); await page.waitForSelector('.drawer .trend-svg'); await page.waitForTimeout(300); await shot('drawer-project.png'); await esc(); await page.getByRole('tab', { name: 'Series' }).click(); });
  await step('trend keyboard brush + undo', async () => { await page.locator('.panel .trend').focus(); for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft'); await page.keyboard.down('Shift'); for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowLeft'); await page.keyboard.up('Shift'); await page.keyboard.press('Enter'); await page.waitForSelector('.hdr-2 .chip'); const chip = await page.locator('.hdr-2 .chip').innerText(); await page.locator('.hdr-2 button.btn-icon').click(); await page.waitForSelector('.hdr-2 .chip', { state: 'detached' }); return chip; });
  await step('body-zone filter keeps hours worked', async () => { const hh = await page.locator('.ctx .val').first().innerText(); await page.locator('.body-list .rowbtn').first().click(); await page.waitForSelector('.fchip'); const hh2 = await page.locator('.ctx .val').first().innerText(); const note = await page.locator('.health-l .hint').innerText(); await page.locator('.fchip').first().click(); expect(hh === hh2, 'HH changed'); expect(/denominador/.test(note), 'no denominator note'); });
  await step('presentation mode', async () => { await menu(5); await page.waitForSelector('.tour'); const z1 = await page.locator('.sheet').getAttribute('data-tour'); await page.locator('.tour-s button').nth(2).click(); const z2 = await page.locator('.sheet').getAttribute('data-tour'); await shot('tour.png'); await page.keyboard.press('Escape'); await page.waitForSelector('.tour', { state: 'detached' }); expect(z1 === 'band' && z2 === 'risk', `${z1}/${z2}`); });
  await step('exports CSV (BOM), PNG and PDF', async () => {
    const dl = async (i) => { await page.click('.menu > button'); const [d] = await Promise.all([page.waitForEvent('download', { timeout: 45000 }), page.locator('.menu-row button').nth(i).click()]); return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }; };
    const csv = await dl(2); expect(csv.buf[0] === 0xef && csv.buf[1] === 0xbb && csv.buf[2] === 0xbf, 'no BOM');
    const png = await dl(0); expect(png.buf.length > 50000 && png.buf.slice(1, 4).toString() === 'PNG', 'png invalid');
    const pdf = await dl(1); expect(pdf.buf.slice(0, 4).toString() === '%PDF', 'pdf invalid');
    return `${csv.name} ${csv.buf.length} B · png ${png.buf.length} B · pdf ${pdf.buf.length} B`;
  });
  await step('onboarding (data=none) → demo', async () => { await page.goto(`${base}/?data=none`, { waitUntil: 'load' }); await page.waitForSelector('.onboard-box'); await shot('onboarding.png'); await page.locator('.onboard-box .btn').nth(1).click(); await page.waitForSelector('.card'); });
  await step('reflow below 1360 × 760', async () => { await page.setViewportSize({ width: 1100, height: 700 }); await page.waitForTimeout(700); const r = await page.evaluate(() => { const b = document.querySelector('.band').getBoundingClientRect(), c = document.querySelector('.row-c').getBoundingClientRect(), k = document.querySelector('.card').getBoundingClientRect(); return { sy: document.documentElement.scrollHeight - innerHeight, sx: document.documentElement.scrollWidth - innerWidth, stacked: b.bottom <= c.top + 1 && k.height >= 120 && k.bottom <= b.bottom + 1 }; }); await shot('reflow-1100x700.png'); expect(r.sy > 200 && r.sx <= 0 && r.stacked, `sy=${r.sy} sx=${r.sx} stacked=${r.stacked}`); return `scrollY=${r.sy}`; });
  console.log(res.join('\n'));
  console.log('console errors: ' + errors.length + (errors.length ? ' → ' + [...new Set(errors)].slice(0, 4).join(' | ') : ''));
  await browser.close();
  process.exit(res.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
