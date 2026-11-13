/** Diccionario del motor (eng.*) en ES / EN / PT-BR. Tablas clave|es|en|pt en src/engine/i18n. */
import { PART1 } from '../engine/i18n/part1';
import { PART2 } from '../engine/i18n/part2';
import { PART3 } from '../engine/i18n/part3';
import { type Bundle, registerDict } from './core';

export function engBundle(): Bundle {
  const b: Bundle = { es: {}, en: {}, pt: {} };
  for (const line of `${PART1}\n${PART2}\n${PART3}`.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('|');
    if (parts.length !== 4) throw new Error(`eng.ts: fila mal formada: ${line.slice(0, 60)}`);
    const [key, es, en, pt] = parts.map((x) => x.trim());
    if (key in b.es) throw new Error(`eng.ts: clave duplicada ${key}`);
    b.es[key] = es; b.en[key] = en; b.pt[key] = pt;
  }
  return b;
}
registerDict(engBundle());
