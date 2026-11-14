// Evaluador aritmético seguro (sin eval). El agente lo usa para que todo total sea
// reproducible en lugar de "calcularlo de cabeza".
// Soporta: + - * / ^ % (resto), paréntesis, y funciones redondear(x, n), suma(...), min(...),
// max(...), abs(x). Decimales con punto.

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenizar(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9._]/.test(s[j])) j++;
      const txt = s.slice(i, j).replace(/_/g, "");
      const v = Number(txt);
      if (!Number.isFinite(v)) throw new Error(`número no válido: "${txt}"`);
      out.push({ t: "num", v });
      i = j;
    } else if (/[a-záéíóúñ]/i.test(c)) {
      let j = i;
      while (j < s.length && /[a-záéíóúñ_]/i.test(s[j])) j++;
      out.push({ t: "id", v: s.slice(i, j).toLowerCase() });
      i = j;
    } else if ("+-*/^%(),".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else {
      throw new Error(`carácter no permitido: "${c}". Use números con punto decimal y los operadores + - * / ^ % ( ).`);
    }
  }
  return out;
}

const FUNCIONES: Record<string, (a: number[]) => number> = {
  redondear: ([x, n = 0]) => {
    const f = 10 ** n;
    return Math.round((x + Number.EPSILON) * f) / f;
  },
  round: ([x, n = 0]) => FUNCIONES.redondear([x, n]),
  suma: (a) => a.reduce((s, x) => s + x, 0),
  sum: (a) => FUNCIONES.suma(a),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  abs: ([x]) => Math.abs(x),
};

export function evaluar(expresion: string): number {
  const toks = tokenizar(expresion);
  let p = 0;
  const ver = () => toks[p];
  const es = (v: string) => ver()?.t === "op" && ver().v === v;
  const comer = (v: string) => {
    if (!es(v)) throw new Error(`se esperaba "${v}" en "${expresion}"`);
    p++;
  };

  function expr(): number {
    let v = termino();
    while (es("+") || es("-")) {
      const op = toks[p++].v;
      const d = termino();
      v = op === "+" ? v + d : v - d;
    }
    return v;
  }
  function termino(): number {
    let v = unario();
    while (es("*") || es("/") || es("%")) {
      const op = toks[p++].v;
      const d = unario();
      if ((op === "/" || op === "%") && d === 0) throw new Error("división entre cero");
      v = op === "*" ? v * d : op === "/" ? v / d : v % d;
    }
    return v;
  }
  function unario(): number {
    if (es("-")) {
      p++;
      return -unario();
    }
    if (es("+")) {
      p++;
      return unario();
    }
    return potencia();
  }
  function potencia(): number {
    const base = atomo();
    if (es("^")) {
      p++;
      return base ** unario();
    }
    return base;
  }
  function atomo(): number {
    const t = ver();
    if (!t) throw new Error(`expresión incompleta: "${expresion}"`);
    if (t.t === "num") {
      p++;
      return t.v;
    }
    if (t.t === "id") {
      // Solo funciones propias de la tabla: "constructor", "toString", etc. no son funciones válidas.
      const fn = Object.hasOwn(FUNCIONES, t.v) ? FUNCIONES[t.v] : undefined;
      if (!fn) throw new Error(`función desconocida: "${t.v}". Disponibles: redondear, suma, min, max, abs.`);
      p++;
      comer("(");
      const args: number[] = [];
      if (!es(")")) {
        args.push(expr());
        while (es(",")) {
          p++;
          args.push(expr());
        }
      }
      comer(")");
      if (!args.length) throw new Error(`"${t.v}" necesita al menos un argumento`);
      return fn(args);
    }
    if (es("(")) {
      p++;
      const v = expr();
      comer(")");
      return v;
    }
    throw new Error(`símbolo inesperado "${t.v}" en "${expresion}"`);
  }

  const v = expr();
  if (p < toks.length) throw new Error(`sobra "${toks[p].v}" en "${expresion}"`);
  if (!Number.isFinite(v)) throw new Error("el resultado no es un número finito");
  return v;
}
