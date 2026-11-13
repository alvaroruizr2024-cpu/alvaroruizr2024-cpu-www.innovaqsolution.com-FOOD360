import { describe, expect, it } from 'vitest';
import { readWorkbook } from '../../src/ingest/xlsx/read';
import { labelKey, parseBlocks } from '../../src/ingest/profiles/blocks';
import { detectTemplateDuplicates } from '../../src/ingest/profiles/blockSource';
import { detectProfile } from '../../src/ingest/profiles/detect';
import { buildXlsx, monthsFrom, NEW_FORMAT, OLD_FORMAT, putBlock, type Val } from './helpers';
import { colombiaWorkbook, contractorWorkbook, corporateWorkbook } from './fixtures';

describe('analizador de bloques guiado por etiquetas', () => {
  it('normaliza etiquetas sin tildes, mayúsculas ni espacios', () => {
    expect(labelKey(' Días  perdidos por Acc. Anual ')).toBe('DIASPERDIDOSPORACCANUAL');
    expect(labelKey('N° de trabajadores')).toBe('NDETRABAJADORES');
    expect(labelKey('Nv. 5,6')).toBe('NV56');
  });
  it('lee un bloque de formato nuevo con niveles en la columna contigua', () => {
    const cells: Record<string, Val> = {};
    const months = monthsFrom('2031-01', 8);
    putBlock(cells, NEW_FORMAT, 2, 4, { title: '7. DEMO UNIDAD', start: 5, months, values: { hh: [1, 2, 3, 4, 5, 6, 7, 8], pg4: [0, 1], accNv2: [0, 0, 1] }, headerOverride: { 3: null, 4: { d: '2032-05-01' } } });
    cells.L31 = 999; // columna posterior a la última fecha del encabezado (totales)
    const bs = parseBlocks(readWorkbook(buildXlsx([{ name: 'DEMO', cells }])).sheets[0]);
    expect(bs.labelCol).toBe(2);
    expect(bs.blocks).toHaveLength(1);
    const b = bs.blocks[0];
    expect([b.title, b.name, b.number, b.format, b.titleRow, b.headerRow]).toEqual(['7. DEMO UNIDAD', 'DEMO UNIDAD', 7, 'new', 5, 6]);
    const by = (ind: string, period = 'month') => b.rows.find((r) => r.ind === ind && r.period === period);
    expect(by('pg56')?.label).toBe('PG (5, 6)');
    expect(by('pg4')?.kind).toBe('measure');
    expect(by('accNv2')?.label).toBe('Accidentes leves (2)');
    expect(['accFatal', 'accLti', 'accNv3', 'accNv1', 'accPerson', 'accProperty', 'incPerson', 'incProperty', 'hpriLoss', 'hpriNoLoss', 'hh', 'lostDays', 'workers', 'ssomaScore'].every((k) => by(k)?.kind === 'measure')).toBe(true);
    expect(by('TRIFR')?.label).toBe('TACSA ACUM 12 M');       // primera fila tras «INDICADOR MENSUAL», aunque esté mal rotulada
    expect(by('TRIFR')?.kind).toBe('index');
    expect(by('TRIFR', 'ytd')?.label).toBe('TRIFR ACUM AÑO');
    expect(by('hh', 'rolling12')?.kind).toBe('index');
    expect(b.rows.filter((r) => r.kind === 'target_corporate').map((r) => r.ind)).toEqual(['TRIFR', 'IF']);
    expect(b.rows.filter((r) => r.kind === 'target_project').map((r) => r.ind)).toEqual(['TRIFR']);
    // meses = fechas del encabezado de la propia sección; vacío y fecha fuera de secuencia se resuelven con la secuencia mensual
    expect(b.months).toEqual(months);
    expect(by('hh')?.cols.map((c) => c[1])).toEqual(months);
    expect(by('hh')?.byMonth.get('2031-05')).toBe(8);
    expect(by('hh')?.cols.some((c) => c[0] === 12)).toBe(false);
    expect(bs.headerFixes.length).toBeGreaterThan(0);
    expect(bs.headerFixes[0]).toMatchObject({ blank: 1, wrong: 1 });
    expect(by('TRIFR', 'month')?.cols).toBe(by('hh')?.cols);
  });
  it('lee un bloque de formato anterior sin columna de niveles', () => {
    const cells: Record<string, Val> = {};
    putBlock(cells, OLD_FORMAT, 1, 2, { title: 'DEMO MINA  ', start: 3, months: monthsFrom('2030-11', 4), values: { hh: [10, 20, 30, 40], pg4: [1, 1, 1, 1] } });
    const bs = parseBlocks(readWorkbook(buildXlsx([{ name: 'DEMO', cells }])).sheets[0]);
    const b = bs.blocks[0];
    expect([bs.labelCol, b.name, b.number, b.format]).toEqual([1, 'DEMO MINA', null, 'old']);
    expect(b.months).toEqual(['2030-11', '2030-12', '2031-01', '2031-02']);
    expect(b.rows.filter((r) => r.period === 'month' && r.kind === 'measure').map((r) => r.ind)).toEqual(['pg56', 'pg4', 'pg3', 'pg2', 'pg1', 'accFatal', 'accLti', 'accNv3', 'accNv2', 'accNv1', 'accProperty', 'incInvestigated', 'hh', 'lostDays', 'workers']);
    expect(b.rows.find((r) => r.ind === 'TACSA' && r.period === 'month')?.kind).toBe('index');
    expect(b.rows.find((r) => r.ind === 'TACSA' && r.period === 'rolling12')?.label).toBe('TACSA ACUM'); // «acumulado» = 12 meses móviles
    expect(b.consolidated).toBe(false);
  });
  it('identifica el consolidado por las referencias de sus fórmulas y detecta el perfil del libro', () => {
    const corp = readWorkbook(corporateWorkbook());
    const bs = parseBlocks(corp.sheets.find((s) => s.name === 'MediaMovil31')!);
    expect(bs.blocks.map((b) => [b.name, b.consolidated, b.format])).toEqual([['', true, 'new'], ['DEMO ALFA', false, 'new'], ['DEMO BETA', false, 'new'], ['DEMO GAMMA', false, 'new'], ['DEMO DELTA', false, 'new'], ['DEMO HISTORICO', false, 'old']]);
    expect([...bs.blocks[0].refBlocks].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(bs.blocks[5].hidden).toBe(true);
    expect(detectProfile(corp)).toBe('corporate');
    expect(detectProfile(readWorkbook(colombiaWorkbook()))).toBe('colombia');
    expect(detectProfile(readWorkbook(contractorWorkbook()))).toBe('incired');
    expect(detectProfile(readWorkbook(buildXlsx([{ name: 'DEMO', cells: { A1: 'x' } }])))).toBe('unknown');
  });
  it('detecta restos de plantilla: tramo idéntico (el origen continúa) y valor aislado fuera de la ventana activa', () => {
    const mk = (start: string, vals: Array<number | null>) => new Map(monthsFrom(start, vals.length).map((m, i) => [m, vals[i]] as [string, number | null]).filter((x): x is [string, number] => x[1] !== null));
    const origin = mk('2031-01', [50, 60, 70, 80, 90, 95]);
    const copy = mk('2031-01', [50, 60, 70, null, null, null, null, 300, 310, 320, 330]);
    const isolated = mk('2031-01', [50, null, null, null, null, null, 200, 210, 220, 230]);
    const twin = mk('2031-01', [50, 60, 70, 80, 90, 95, 99]);
    const f = detectTemplateDuplicates([origin, copy, isolated]);
    expect([...f[0]]).toEqual([]);
    expect([...f[1]].sort()).toEqual(['2031-01', '2031-02', '2031-03']);
    expect([...f[2]]).toEqual(['2031-01']);
    expect(detectTemplateDuplicates([mk('2031-01', [5, 6, 0, 7]), mk('2031-01', [5, 6, 0, 8])]).every((s) => s.size === 0)).toBe(true); // menos de 3 meses idénticos
    expect(detectTemplateDuplicates([origin, twin])[1].size).toBe(0); // la serie más larga es el origen; la corta no continúa → se marca la corta
    expect([...detectTemplateDuplicates([origin, twin])[0]].length).toBe(6);
  });
});
