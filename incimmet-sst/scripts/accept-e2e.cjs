/* Comprobaciones de aceptación en navegador (criterios 8, 9 y 13 de la sección 17) y mediciones de rendimiento.
 * Uso: npx vite --port 5173 &  →  node scripts/accept-e2e.cjs [http://127.0.0.1:5173] [demo|real]
 * Imprime PASS/FAIL y tiempos medidos; no guarda cifras. */
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://127.0.0.1:5173', data = process.argv[3] || 'demo';
const parse = (s, lang) => { const t = s.replace(/[^\d.,\-−]/g, '').replace('−', '-'); return lang === 'en' ? Number(t.replace(/,/g, '')) : Number(t.replace(/\./g, '').replace(',', '.')); };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = [], ok = (n, c, d = '') => out.push(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`);
  const read = async (p, lang) => p.$$eval('.card .val, .ctx .val', (els) => els.map((e) => e.textContent.trim())).then((a) => a.map((x) => parse(x, lang)));
  // 8 + 13: idioma/tema no cambian cifras; sin desplazamiento en las resoluciones objetivo; medición de carga
  let ref = null;
  for (const [lang, theme, w, h] of [['es', 'dark', 1920, 1080], ['es', 'light', 1440, 900], ['en', 'dark', 1440, 900], ['pt', 'light', 1920, 1080]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const t0 = Date.now();
    await p.goto(`${base}/?data=${data}&lang=${lang}&theme=${theme}`);
    await p.waitForSelector('.card .val'); const tCards = Date.now() - t0;
    await p.waitForTimeout(1500);
    const vals = await read(p, lang);
    const geo = await p.evaluate(() => ({ sy: document.documentElement.scrollHeight - innerHeight, small: [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() && e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 11).length }));
    if (!ref) ref = vals;
    ok(`cifras idénticas ${lang}/${theme}`, vals.length === ref.length && vals.every((v, i) => Object.is(v, ref[i]) || Math.abs(v - ref[i]) < 1e-9), `${vals.length} valores`);
    ok(`${w}×${h} sin desplazamiento vertical (${lang}/${theme})`, geo.sy <= 0, `scroll=${geo.sy}`);
    ok(`${w}×${h} texto ≥ 11 px (${lang}/${theme})`, geo.small === 0, `${geo.small} elementos menores`);
    out.push(`TIME  tarjetas utilizables tras navegar (${w}×${h}, ${lang}): ${tCards} ms`);
    if (lang === 'es' && theme === 'dark') {
      // rendimiento de filtro: país
      const before = await p.locator('.ctx .val').first().innerText();
      const t1 = Date.now(); await p.getByRole('button', { name: /^CO$|Colombia/ }).first().click();
      await p.waitForFunction((b0) => document.querySelector('.ctx .val')?.textContent.trim() !== b0, before.trim(), { polling: 'raf' });
      out.push(`TIME  respuesta del filtro de país (clic → cifras nuevas): ${Date.now() - t1} ms`);
      const coHH = await p.locator('.ctx .val').first().innerText();
      await p.getByRole('button', { name: /Restablecer|Reset|Redefinir/ }).first().click(); await p.waitForTimeout(400);
      // 9: la vista 2D responde la misma consulta (seleccionar Colombia)
      await p.getByRole('button', { name: /^2D$/ }).first().click(); await p.waitForTimeout(800);
      await p.locator('.rm-2d .rm-pin button[aria-label*="Colombia"]').first().click(); await p.waitForTimeout(600);
      const co2d = await p.locator('.ctx .val').first().innerText();
      ok('9 · 2D: seleccionar Colombia filtra igual que el chip de país', co2d.trim() === coHH.trim(), `${co2d.trim()} vs ${coHH.trim()}`);
      await p.getByRole('button', { name: /Restablecer|Reset|Redefinir/ }).first().click(); await p.waitForTimeout(400);
      await p.getByRole('button', { name: /^Lista$|^List$/ }).first().click(); await p.waitForTimeout(500);
      const rows = await p.locator('.rm-table tbody tr').count();
      ok('9 · lista accesible equivalente con filas de países/proyectos', rows >= 4, `${rows} filas`);
    }
    await p.close();
  }
  await b.close();
  console.log(out.join('\n'));
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
