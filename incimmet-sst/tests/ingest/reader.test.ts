import { describe, expect, it } from 'vitest';
import { extractRefs, isDateFormat, readWorkbook, serialToIso, translateFormula } from '../../src/ingest/xlsx/read';
import { writeWorkbook } from '../../src/ingest/xlsx/write';
import { buildXlsx } from './helpers';

describe('lector XLSX', () => {
  const bytes = buildXlsx([
    { name: 'DEMO Datos', hiddenRows: [3], hiddenCols: [17], cells: {
      A1: 'Horas & <días> "DEMO"', B1: 12.5, C1: true, D1: { e: '#DIV/0!', f: 'B1/0' }, E1: { d: '2031-10-01' }, F1: { v: 49218, style: 2 }, G1: { v: 7.5, style: 3 },
      H1: { inline: 'en línea' }, I1: { rich: ['DEMO ', 'enriquecido'] }, J1: { f: 'B1*2', v: 25 }, K1: { f: 'IF(B1=0," ",B1)', v: ' ' }, L1: { v: 0.5, style: 1 }, M1: { v: 49218.75, style: 1 }, N1: 0, O1: { style: 1 },
      A2: 1, B2: 10, A3: 2, B3: 20, A4: 3, B4: 30,
      C2: { f: 'A2+$B2*B$2+SUM($A$2:A2)+LOG10(A2)+\'DEMO Otra\'!A2+LEN("A2")+SUM(A:A)+SUM(2:2)', v: 1, shared: { si: 0, ref: 'C2:C4' } }, C3: { v: 2, shared: { si: 0 } }, C4: { v: 3, shared: { si: 0 } },
      D2: { f: 'A2*2', v: 2, shared: { si: 1, ref: 'D2:E2' } }, E2: { v: 20, shared: { si: 1 } },
    } },
    { name: 'DEMO Otra', state: 'hidden', cells: { A2: 5 } },
    { name: 'DEMO MuyOculta', state: 'veryHidden', cells: {} },
  ]);
  const wb = readWorkbook(bytes);
  const s = wb.sheets[0];
  const cell = (a: string) => s.cells.get(a);

  it('lee valores, tipos y estados de hoja', () => {
    expect(wb.sheets.map((x) => [x.name, x.state])).toEqual([['DEMO Datos', 'visible'], ['DEMO Otra', 'hidden'], ['DEMO MuyOculta', 'veryHidden']]);
    expect(cell('A1')).toEqual({ v: 'Horas & <días> "DEMO"', t: 's', f: null });
    expect(cell('B1')).toEqual({ v: 12.5, t: 'n', f: null });
    expect(cell('C1')).toEqual({ v: true, t: 'b', f: null });
    expect(cell('H1')?.v).toBe('en línea');
    expect(cell('I1')?.v).toBe('DEMO enriquecido');
    expect(cell('J1')).toEqual({ v: 25, t: 'n', f: '=B1*2' });
    expect(cell('K1')).toEqual({ v: ' ', t: 's', f: '=IF(B1=0," ",B1)' });
    expect(cell('N1')).toEqual({ v: 0, t: 'n', f: null });
    expect(cell('O1')).toBeUndefined();
    expect(s.maxRow).toBe(4);
    expect(s.hiddenRows.has(3)).toBe(true);
    expect(s.hiddenCols.has(17)).toBe(true);
  });
  it('conserva los errores guardados como error, nunca como cero', () => {
    expect(cell('D1')).toEqual({ v: '#DIV/0!', t: 'e', f: '=B1/0' });
  });
  it('reconoce fechas por formato integrado y personalizado', () => {
    expect(cell('E1')).toEqual({ v: '2031-10-01', t: 'd', f: null });
    expect(cell('F1')).toEqual({ v: '2034-10-01', t: 'd', f: null });
    expect(cell('G1')).toEqual({ v: 7.5, t: 'n', f: null });
    expect(cell('L1')?.v).toBe('12:00:00');
    expect(cell('M1')?.v).toBe('2034-10-01T18:00:00');
    expect(isDateFormat(14, undefined)).toBe(true);
    expect(isDateFormat(2, undefined)).toBe(false);
    expect(isDateFormat(170, '[$-409]mmm\\-yy;@')).toBe(true);
    expect(isDateFormat(171, '#,##0.00\\ "m";[Red]\\-#,##0.00')).toBe(false);
    expect(serialToIso(1, false)).toBe('1900-01-01');
    expect(serialToIso(61, false)).toBe('1900-03-01');
    expect(serialToIso(0, true)).toBe('00:00:00');
    expect(readWorkbook(buildXlsx([{ name: 'DEMO', cells: { A1: { v: 10, style: 1 } } }], { date1904: true })).sheets[0].cells.get('A1')?.v).toBe('1904-01-11');
  });
  it('traduce fórmulas compartidas respetando $, rangos, literales, hojas y funciones', () => {
    expect(cell('C2')?.f).toBe('=A2+$B2*B$2+SUM($A$2:A2)+LOG10(A2)+\'DEMO Otra\'!A2+LEN("A2")+SUM(A:A)+SUM(2:2)');
    expect(cell('C3')?.f).toBe('=A3+$B3*B$2+SUM($A$2:A3)+LOG10(A3)+\'DEMO Otra\'!A3+LEN("A2")+SUM(A:A)+SUM(3:3)');
    expect(cell('C4')?.f).toBe('=A4+$B4*B$2+SUM($A$2:A4)+LOG10(A4)+\'DEMO Otra\'!A4+LEN("A2")+SUM(A:A)+SUM(4:4)');
    expect(cell('C4')?.v).toBe(3);
    expect(cell('E2')).toEqual({ v: 20, t: 'n', f: '=B2*2' });
    expect(translateFormula('SUM($EF56:EO59)*1000000/EO83', 0, 1)).toBe('SUM($EF56:EP59)*1000000/EP83');
    expect(translateFormula('A1+ATAN2(B1,C1)+DEC2BIN(D1)+A1B+AB12!C3+$A:$B+C:D', 2, 1)).toBe('B3+ATAN2(C3,D3)+DEC2BIN(E3)+A1B+AB12!D5+$A:$B+D:E');
    expect(translateFormula('A1', -1, 0)).toBe('#REF!');
    expect(translateFormula("'[4]DEMO 2031'!$H$98+\"A1\"", 5, 5)).toBe("'[4]DEMO 2031'!$H$98+\"A1\"");
  });
  it('extrae referencias y distingue las calificadas con hoja', () => {
    expect(extractRefs('+SUM(CS41+CS75)')).toEqual([{ c1: 97, r1: 41, c2: 97, r2: 41, qualified: false }, { c1: 97, r1: 75, c2: 97, r2: 75, qualified: false }]);
    expect(extractRefs('SUM(A1:B3)+Hoja2!C5')).toEqual([{ c1: 1, r1: 1, c2: 2, r2: 3, qualified: false }, { c1: 3, r1: 5, c2: 3, r2: 5, qualified: true }]);
  });
  it('lee los metadatos y no abre comentarios', () => {
    expect(wb.props).toEqual({ creator: 'DEMO Autor', lastModifiedBy: 'DEMO Editor', modified: '2031-07-01T10:00:00Z' });
    expect(JSON.stringify([...s.cells.values()])).not.toContain('COMENTARIO');
  });
});

describe('escritor XLSX', () => {
  it('ida y vuelta con el lector', () => {
    const long = 'DEMO nombre de hoja demasiado largo para Excel [con] símbolos: * ? / \\';
    const bytes = writeWorkbook([
      { name: long, rows: [['país', 'valor', null, 'a < b & "c"'], ['DEMO', 1234.5, null, ''], [], [null, 0, -3e-7, 'línea 1\nlínea 2']] },
      { name: long, rows: [[1]] },
      { name: '', rows: [] },
    ]);
    const wb = readWorkbook(bytes);
    expect(wb.sheets).toHaveLength(3);
    expect(wb.sheets.every((x) => x.name.length <= 31 && !/[\[\]:*?/\\]/.test(x.name))).toBe(true);
    expect(new Set(wb.sheets.map((x) => x.name.toLowerCase())).size).toBe(3);
    const c = wb.sheets[0].cells;
    expect(c.get('A1')).toEqual({ v: 'país', t: 's', f: null });
    expect(c.get('D1')?.v).toBe('a < b & "c"');
    expect(c.get('B2')).toEqual({ v: 1234.5, t: 'n', f: null });
    expect(c.get('C1')).toBeUndefined();
    expect(c.get('D2')).toBeUndefined();
    expect(c.get('B4')?.v).toBe(0);
    expect(c.get('C4')?.v).toBe(-3e-7);
    expect(c.get('D4')?.v).toBe('línea 1\nlínea 2');
    expect(wb.sheets[0].maxRow).toBe(4);
    expect(wb.sheets[2].cells.size).toBe(0);
  });
});
