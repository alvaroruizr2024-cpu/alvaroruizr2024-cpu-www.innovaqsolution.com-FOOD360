/* Contraste WCAG de los pares de tokens (texto ≥ 4.5 · iconos y marcas ≥ 3 · extremo de rampa ≥ 2): node src/dev/checkContrast.cjs */
const fs = require('fs');
const css = fs.readFileSync(__dirname + '/../styles/tokens.css', 'utf8');
const block = (sel) => { const i = css.indexOf(sel), j = css.indexOf('}', i); const o = {}; for (const m of css.slice(i, j).matchAll(/--([\w-]+):\s*([^;]+);/g)) o[m[1]] = m[2].trim(); return o; };
const rgb = (v, under) => { if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)); const [r, g, b, a = 1] = v.match(/\(([^)]+)\)/)[1].split(',').map(Number); return under ? [r, g, b].map((c, i) => c * a + under[i] * (1 - a)) : [r, g, b]; };
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
let fails = 0, n = 0;
const chk = (theme, label, fg, bg, min) => { n++; const r = cr(fg, bg); if (r < min) { fails++; console.log(`FAIL ${theme} ${label}: ${r.toFixed(2)} < ${min}`); } };
for (const [theme, sel] of [['dark', ":root, :root[data-theme='dark']"], ['light', ":root[data-theme='light']"]]) {
  const t = block(sel), s = rgb(t.surface);
  for (const bg of ['bg', 'surface', 'surface-2', 'surface-3']) for (const fg of ['text', 'text-2', 'text-3']) chk(theme, `${fg} on ${bg}`, rgb(t[fg]), rgb(t[bg]), 4.5);
  for (const bg of ['surface', 'surface-2']) chk(theme, `accent on ${bg}`, rgb(t.accent), rgb(t[bg]), 4.5);
  chk(theme, 'on-accent on accent', rgb(t['on-accent']), rgb(t.accent), 4.5);
  for (const k of ['ok', 'warn', 'crit']) { chk(theme, `${k} icon on surface`, rgb(t[k]), s, 3); chk(theme, `text on ${k}-bg`, rgb(t.text), rgb(t[`${k}-bg`], s), 4.5); chk(theme, `${k} icon on ${k}-bg`, rgb(t[k]), rgb(t[`${k}-bg`], s), 3); }
  chk(theme, 'text on neutral-bg', rgb(t.text), rgb(t['neutral-bg'], s), 4.5);
  for (const k of ['deemph', 'series-1', 'series-2', 'series-3']) chk(theme, `${k} on surface`, rgb(t[k]), s, 3);
  for (let i = 1; i <= 5; i++) { chk(theme, `seq-${i} on surface`, rgb(t[`seq-${i}`]), s, 2); chk(theme, `ramp-ink-${i} on seq-${i}`, rgb(t[`ramp-ink-${i}`]), rgb(t[`seq-${i}`]), 4.5); }
}
const hdr = rgb('#0B3C63');
for (const [l, fg, bg, min] of [['text', '#F3F7FC', '#0B3C63', 4.5], ['text-2', '#C9D8E8', '#0B3C63', 4.5], ['text-3', '#A9BCD0', '#0B3C63', 4.5], ['text-2 on control', '#C9D8E8', '#0A3050', 4.5], ['on-accent', '#062033', '#54C8F0', 4.5], ['text on menu', '#F3F7FC', '#0E3556', 4.5]]) chk('header', l, rgb(fg), rgb(bg), min);
void hdr;
console.log(`contrast pairs: ${n} · fails: ${fails}`);
process.exit(fails ? 1 : 0);
