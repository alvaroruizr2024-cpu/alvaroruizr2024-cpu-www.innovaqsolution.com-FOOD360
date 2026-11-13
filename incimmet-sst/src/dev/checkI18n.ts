/** Comprueba que toda clave ui.* usada en el código exista en ES/EN/PT: `npx tsx src/dev/checkI18n.ts`. */
import fs from 'node:fs';
import path from 'node:path';
import '../i18n/ui';
import { allKeys, hasKey } from '../i18n/core';

const files: string[] = [];
const walk = (d: string): void => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(map|engine|ingest|domain|i18n)$/.test(e.name)) walk(p); }
    else if (/\.tsx?$/.test(e.name) && !/checkI18n/.test(e.name)) files.push(p);
  }
};
walk(path.resolve(process.cwd(), 'src'));
const missing = new Set<string>(), prefixes = new Set<string>();
const use = (key: string, dynamic: boolean): void => { if (dynamic) prefixes.add(key); else if (!hasKey('es', key)) missing.add(key); };
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/['"`](ui\.[A-Za-z0-9_.]+?)(\$\{|['"`])/g)) use(m[1], m[2] === '${');
  if (/mockEngine/.test(f)) {
    for (const m of src.matchAll(/\bT\((['`])([A-Za-z0-9_.]+?)(\$\{|['`])/g)) use(`ui.mock.${m[2]}`, m[3] === '${');
    for (const m of src.matchAll(/'((?:av|req)\.[A-Za-z0-9_.]+)'/g)) use(`ui.mock.${m[1]}`, false);
  }
}
const keys = allKeys('es').filter((k) => k.startsWith('ui.'));
const emptyPrefix = [...prefixes].filter((p) => !keys.some((k) => k.startsWith(p)));
const untranslated = (['en', 'pt'] as const).flatMap((l) => keys.filter((k) => !hasKey(l, k)).map((k) => `${l}:${k}`));
console.log(`ui keys: ${keys.length} · missing: ${missing.size} · prefixes without keys: ${emptyPrefix.length} · untranslated: ${untranslated.length}`);
if (missing.size) console.log('missing: ' + [...missing].join(' '));
if (emptyPrefix.length) console.log('empty prefixes: ' + emptyPrefix.join(' '));
if (untranslated.length) console.log('untranslated: ' + untranslated.slice(0, 20).join(' '));
process.exit(missing.size || emptyPrefix.length || untranslated.length ? 1 : 0);
