/* Verificación visual: node src/dev/shots.cjs [baseUrl] [filtro]  → private/shots/*.png + comprobaciones (sin desplazamiento, sin errores de consola, sin texto recortado, fuente ≥ 11 px). */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const base = process.argv[2] || 'http://localhost:5173', only = process.argv[3] || '';
  const out = path.resolve(__dirname, '../../private/shots');
  fs.mkdirSync(out, { recursive: true });
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  let browser;
  try { browser = await chromium.launch({ args }); } catch { browser = await chromium.launch({ args, executablePath: '/usr/bin/google-chrome' }); }
  let failed = 0;
  { const warm = await browser.newPage(); await warm.goto(`${base}/?data=demo&mock=full`, { waitUntil: 'load' }).catch(() => {}); await warm.waitForTimeout(7000); await warm.close(); }
  for (const mock of ['reported', 'full']) for (const theme of ['dark', 'light']) for (const [w, h] of [[1920, 1080], [1440, 900]]) {
    const name = `${mock}-${theme}-${w}x${h}`;
    if (only && !name.includes(only)) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
    await page.goto(`${base}/?data=demo&mock=${mock}&theme=${theme}&lang=es`, { waitUntil: 'load' });
    await page.waitForSelector('.sheet[data-ready] .card', { timeout: 30000 }).catch(() => errors.push('sheet not ready'));
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => {
      const de = document.documentElement, clipped = [];
      let minFont = 99, minEl = '';
      const clipAnc = (el) => { let p = el.parentElement; while (p && p !== document.body) { const cs = getComputedStyle(p), o = cs.overflowX + cs.overflowY; if (/auto|scroll/.test(o)) return null; if (/hidden|clip/.test(o)) return p; p = p.parentElement; } return null; };
      for (const el of document.querySelectorAll('.sheet *')) {
        if (el.closest('.sr,.mapbox,select,option')) continue;
        if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const fs = parseFloat(cs.fontSize); if (fs < minFont) { minFont = fs; minEl = String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className) || el.tagName; }
        if (el.closest('.trunc') || el.closest('svg')) continue;
        const range = document.createRange(); range.selectNodeContents(el); const rr = range.getBoundingClientRect();
        if (!rr.width) continue;
        const anc = clipAnc(el), own = /hidden|clip/.test(cs.overflowX + cs.overflowY);
        const box = own ? el.getBoundingClientRect() : anc ? anc.getBoundingClientRect() : null;
        if (box && (rr.right > box.right + 1.5 || rr.bottom > box.bottom + 1.5 || rr.left < box.left - 1.5 || rr.top < box.top - 1.5)) clipped.push(`${String(el.className).slice(0, 24) || el.tagName}:"${el.textContent.trim().slice(0, 28)}"`);
      }
      return { sy: de.scrollHeight - de.clientHeight, sx: de.scrollWidth - de.clientWidth, clipped: [...new Set(clipped)].slice(0, 10), minFont, minEl };
    });
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    const ok = r.sy <= 0 && r.sx <= 0 && !errors.length && !r.clipped.length && r.minFont >= 11;
    if (!ok) failed++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} scrollY=${r.sy} scrollX=${r.sx} errors=${errors.length} clipped=${r.clipped.length} minFont=${r.minFont}${r.minFont < 11 ? `(${r.minEl})` : ''}`);
    if (errors.length) console.log('   errors: ' + [...new Set(errors)].slice(0, 4).join(' | '));
    if (r.clipped.length) console.log('   clipped: ' + r.clipped.join(' | '));
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
