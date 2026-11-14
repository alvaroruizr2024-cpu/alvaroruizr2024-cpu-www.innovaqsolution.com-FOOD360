import { describe, expect, it } from "vitest";
import { calcularPlazo, feriadosPeru, localAUtc, utcALocal } from "@/lib/fechas";
import { evaluar } from "@/lib/calculo";
import { validarFila } from "@/lib/registros";
import { trocear } from "@/lib/extraccion";
import { hashPassword, verificarPassword } from "@/lib/cuentas";

describe("plazos", () => {
  it("cuenta días hábiles sin el día de partida", () => {
    expect(calcularPlazo("2026-11-12", 5, "habiles").resultado).toBe("2026-11-19");
    expect(calcularPlazo("2026-11-12", 10, "habiles").resultado).toBe("2026-11-26");
  });
  it("salta feriados nacionales y los informa", () => {
    const r = calcularPlazo("2026-12-04", 3, "habiles"); // 7, [8 y 9 feriados], 10, 11
    expect(r.resultado).toBe("2026-12-11");
    expect(r.feriadosSaltados.map((f) => f.fecha)).toEqual(["2026-12-08", "2026-12-09"]);
  });
  it("cuenta hacia atrás y admite feriados adicionales", () => {
    expect(calcularPlazo("2026-11-26", -6, "habiles").resultado).toBe("2026-11-18");
    expect(calcularPlazo("2026-11-12", 1, "habiles", ["2026-11-13"]).resultado).toBe("2026-11-16");
  });
  it("días calendario", () => {
    expect(calcularPlazo("2026-09-30", 90, "calendario").resultado).toBe("2026-12-29");
  });
  it("Semana Santa 2026 (Pascua el 5 de abril)", () => {
    const f = feriadosPeru(2026).map((x) => x.fecha);
    expect(f).toContain("2026-04-02");
    expect(f).toContain("2026-04-03");
  });
  it("rechaza fechas inexistentes", () => {
    expect(() => calcularPlazo("2026-02-30", 1, "habiles")).toThrow();
  });
  it("convierte hora local de Lima a UTC y de vuelta", () => {
    const d = localAUtc("2026-11-26 17:00", "America/Lima");
    expect(d.toISOString()).toBe("2026-11-26T22:00:00.000Z");
    expect(utcALocal(d, "America/Lima")).toBe("2026-11-26T17:00");
  });
});

describe("cálculo", () => {
  it("respeta precedencia, paréntesis y funciones", () => {
    expect(evaluar("3813480.17 - 2300941.91 - 691023.65 - 96188.61")).toBeCloseTo(725326.0, 2);
    expect(evaluar("redondear(725326 * 0.295, 0)")).toBe(213971);
    expect(evaluar("suma(1, 2, 3) * 2 ^ 3")).toBe(48);
    expect(evaluar("-(2 + 3) * 4")).toBe(-20);
  });
  it("no ejecuta código ni acepta símbolos extraños", () => {
    expect(() => evaluar("process.exit(1)")).toThrow();
    expect(() => evaluar("1; 2")).toThrow();
    expect(() => evaluar("1 / 0")).toThrow(/cero/);
    expect(() => evaluar("constructor(1)")).toThrow(/desconocida/);
  });
});

describe("validación de filas", () => {
  it("normaliza enumeraciones sin acentos y aplica valores por defecto", () => {
    const v = validarFila("requisitos", { requisito: "Ficha RUC", estado: "PENDIENTE DE VALIDACION" }, { parcial: false });
    expect(v.ok && v.data.estado).toBe("pendiente de validación");
    const b = validarFila("brechas", { prioridad: "Alta", brecha: "Falta firma" }, { parcial: false });
    expect(b.ok && b.data.estado).toBe("abierta");
  });
  it("rechaza estados inventados, campos desconocidos y faltantes obligatorios", () => {
    const v = validarFila("requisitos", { requisito: "x", estado: "casi listo", inventado: 1 }, { parcial: false });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errores.join(" ")).toMatch(/estado.*uno de/);
    if (!v.ok) expect(v.errores.join(" ")).toMatch(/campo desconocido "inventado"/);
    expect(validarFila("requisitos", { estado: "no cumple" }, { parcial: false }).ok).toBe(false);
    expect(validarFila("requisitos", { estado: "no cumple" }, { parcial: true }).ok).toBe(true);
  });
  it("valida fechas y números", () => {
    expect(validarFila("hitos", { hito: "Cierre", fecha: "26/11/2026" }, { parcial: false }).ok).toBe(false);
    const p = validarFila("presupuesto", { partida: "Excavadora", cantidad: "12", precio_unitario: 350.5 }, { parcial: false });
    expect(p.ok && p.data.cantidad).toBe(12);
  });
});

describe("utilidades", () => {
  it("trocea texto largo sin perder contenido", () => {
    const t = Array.from({ length: 300 }, (_, i) => `Párrafo ${i} con contenido de prueba.`).join("\n\n");
    const partes = trocear(t, 1000);
    expect(partes.length).toBeGreaterThan(5);
    expect(partes.join("\n\n")).toBe(t);
  });
  it("verifica contraseñas con hash scrypt", async () => {
    const h = await hashPassword("clave-segura-123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verificarPassword("clave-segura-123", h)).toBe(true);
    expect(await verificarPassword("otra-clave-456", h)).toBe(false);
  });
});
