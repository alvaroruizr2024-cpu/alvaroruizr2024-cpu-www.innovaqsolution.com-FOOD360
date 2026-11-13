# Metodología de cálculo — INCIMMET | Centro Regional de Inteligencia SST

Versión de metodología **1.0.0** (vigente desde 2026-11-13). Este documento describe el motor `src/engine` (puro, síncrono, sin DOM). No contiene cifras reales: los ejemplos son sintéticos. Los valores marcados «por defecto» son parámetros documentados que deben confirmarse con INCIMMET antes de usarlos para decidir.

## 1. Cubo y unidades de conteo
- Hecho canónico = **proyecto × mes** (× empresa, turno y actividad cuando la fuente los trae). País y región = suma de proyectos.
- Con conteos reportados (`basis: reported_counts`) se usa la cifra de la fuente y se rotula **«conteo reportado»**: no se afirma deduplicación de eventos ni de personas.
- Con registros individuales se cuenta por **identificador único**: un evento con tres afectados es 1 evento y 3 casos. El caso más grave fija el nivel del evento (mortal → `accFatal`, con tiempo perdido → `accLti`, restringido → nivel 3, tratamiento médico → nivel 2, primeros auxilios → nivel 1). Fatalidades y casos cuentan personas. Casi accidentes y reportes de peligro alimentan los reportes preventivos; los eventos de alto potencial se separan con y sin pérdida y **nunca se suman a los accidentes**.
- La exposición (HH y dotación) siempre viene de los hechos mensuales.

## 2. Reglas generales
1. Toda tasa = Σ numeradores / Σ denominadores × constante sobre el alcance filtrado. Nunca se promedian tasas.
2. **Cobertura pareada**: un proyecto-mes entra en una tasa solo si todas las medidas del numerador y el denominador son números; si no, sale de ambos lados y se declara en la cobertura del indicador. Los conteos suman lo informado y listan lo que falta.
3. Valores: *indefinido* = el campo no existe en esa fuente (el país se excluye y se declara); *nulo* = vacío o sin cierre (nunca cero); número = dato informado (0 es un cero real).
4. Estados: denominador cero o ausente → **N/D** con motivo; cero eventos con HH válidas → valor 0 (estado «cero real»); módulo sin fuente → **fuente pendiente**; no aplicable → **N/A**; taxonomía no validada → N/D; predicción apagada → **deshabilitado**; sin conjunto cargado → todo pendiente.
5. Períodos: mes, acumulado del año (enero al mes), doce meses móviles (mes−11 al mes) o rango libre. Comparación: interanual (mismo rango −12 meses), período anterior de igual longitud, o doce meses móviles que terminan en el último mes.
6. Variación relativa solo si la base es distinta de cero; si no, cambio absoluto y nota. Los porcentajes se comparan en puntos porcentuales. Si los proyectos con exposición difieren entre los dos períodos se avisa «cobertura no equivalente».
7. Los filtros de registros (empresa, turno, actividad, riesgo, severidad, tipo de evento, zona del cuerpo, mecanismo) filtran numeradores. **Zona del cuerpo y mecanismo no reducen las HH** (no existen horas por zona ni por mecanismo) y la vista lo explica.
8. Precisión interna completa; el redondeo es solo de presentación. El idioma y el tema no cambian cifras.

## 3. Perfil reportado v1 (qué debe validarse)
| ID | Cálculo vigente | Pendiente de validar |
|---|---|---|
| R01 | Σ HH | Separación propios / contratistas |
| R02 | Media de los meses con dato de Σ dotación | Método local de dotación media |
| R03 | Todos los eventos reportados, con desglose | — |
| R04 | Accidentes con lesión tal como se reportan (personas solo con registros) | Deduplicación de personas |
| R05 | Σ accidentes mortales reportados (personas con registros) | Definición de fatalidad por país |
| R06 | Σ medidas LTI configuradas (v1: accidentes incapacitantes) | Criterio corporativo de LTI |
| R07 | Σ medidas TRI configuradas (v1: mortales + incapacitantes + niveles 3 y 2) | Taxonomía; el nivel 1 queda fuera |
| R08 | N/D con conteos reportados (se muestra el nivel 1 como apoyo) | Equivalencia nivel 1 ↔ primeros auxilios |
| R09 | Σ accidentes con daño material | — |
| R10 | Σ días perdidos; días cargados aparte cuando existen | Fuentes que combinan ambos en una fila |
| R11 | LTIFR = Σ LTI × 1.000.000 / Σ HH. **Las fatalidades no entran en este numerador** | Meta propia de LTIFR (hoy se usa la de IF como referencia) |
| R12 | «TRIFR reportado por INCIMMET» = Σ TRI × 1.000.000 / Σ HH | Taxonomía TRI |
| R13, R14 | Solo con registros de casos, × 200.000 / HH; nunca se llaman OSHA | Compatibilidad de la taxonomía |
| R15 | Eventos de alto potencial (HPRI con y sin pérdida; si no existen, potencial 5–6) × 1.000.000 / Σ HH | Definición única (aviso «definiciones mixtas») |
| R16 | Solo con casos: casos con zona del cuerpo informada (multiselección declarada) | — |

Esquema corporativo de conciliación: **C01** IF = (mortales + incapacitantes) × 1.000.000 / HH; **C02** IS = días × 1.000.000 / HH; **C03** IA = IF × IS / 1.000; **C04** TRIFR/TACSA. Cuando existe la cifra guardada en el origen para el mismo alcance y período (un proyecto o un país completo; mes, acumulado o doce meses) se muestra junto a la recalculada y se marca «difiere» si |Δ| > 0,5 %.

Adaptadores nacionales (panel «Metodología local»): **PE01–PE03** = fórmulas mineras anteriores, solo Perú, con advertencia sobre días cargados. **CO01** = accidentes del mes de corte / trabajadores del mes × 100; **CO02** = (días de incapacidad + días cargados) / trabajadores × 100; **CO03** = mortales / accidentes del año × 100 (N/D sin accidentes); **CO04–CO06** requieren agregados de enfermedad laboral y ausentismo (fuente pendiente si no existen). **BR01** TF = (accidentes sin y con alejamiento) × 1.000.000 / HHT; **BR02** TG = días × 1.000.000 / HHT, como metodología configurada. CO01 no se suma ni se compara con PE01, LTIFR ni BR01.

## 4. Preventivos, proactivos y salud
- Razones genéricas Σ numerador / Σ denominador × 100 sobre agregados mensuales por programa (P01, P02, P06–P16, O02–O04, O06, O16, H01–H03, H06–H08). Sin filas → N/D; denominador 0 → N/A; programa sin datos → fuente pendiente.
- **P03** = verificaciones exigibles realizadas / exigibles del período. **P04** = conformes con evidencia / válidas realizadas. **P05** = controles críticos cuya última verificación válida falló sin recuperación verificada al corte. Si P05 > 0, P04 nunca es verde (estado crítico y aviso de falla activa).
- **O07** = cerradas y aceptadas de la cohorte **abierta** en el período. **O08** = cerradas en plazo de la cohorte que **vence** en el período. **O09** = abiertas con vencimiento original anterior al corte (críticas, total y % de abiertas). **O11** = mismo hallazgo en el mismo proyecto dentro de 12 meses. **O15** = mediana y percentil 90 del retraso, con tramos 0–30 / 31–60 / 61–90 / 90+. La antigüedad se mide desde la apertura y el retraso desde el **vencimiento original**: reprogramar no borra el retraso ni la historia.
- **O12** = actividades exigibles terminadas y aceptadas / exigibles a la fecha (vencimiento base ≤ corte, año del período): las actividades futuras no lo reducen. **O13** = terminadas / todas las aprobadas del año. **O14** = O12 ponderado por los pesos aprobados.
- **P17/P18**: volumen e intensidad de capacitación; la intensidad solo se calcula con unidades validadas. **H04/H05**: por agente y método. Salud siempre agregada, sin personas.

## 5. Estado y metas
Dirección «bajar»: verde ≤ meta; ámbar ≤ meta × (1 + banda); rojo por encima. Dirección «subir»: espejo. Sin meta → neutral. Fatalidades y fallas activas: 0 verde, > 0 rojo. Banda por defecto 20 % (`warnBand`). La meta es la vigente en el último mes del período: la del proyecto si hay exactamente uno filtrado; si no, la corporativa (con aviso de alcance no confirmado para Colombia y Brasil). Umbrales por defecto sin meta cargada: P03 y P04 90 %, O12 85 %, H01 95 %. Las tasas llevan intervalo exacto de Poisson al 95 % y aviso de exposición pequeña cuando Σ HH es menor que `smallExposureHH` (por defecto 100.000).

## 6. Señales tempranas (por reglas; no son probabilidades)
| Regla | Condición por defecto | Prioridad |
|---|---|---|
| Tasa de 12 meses sobre la meta | LTIFR o TRIFR > meta con HH ≥ exposición mínima | crítica si > 2 × meta; si no, alta |
| Racha | ≥ 1 accidente registrable en cada uno de los últimos 3 meses | alta |
| Alto potencial | evento de alto potencial en los últimos 3 meses | alta |
| Rampa de exposición | HH +50 % en 3 meses con ≥ 5.000 HH | media |
| Puntaje SSOMA | caída ≥ 10 puntos frente a la media de 3 meses | media |
| Datos | numerador sin cierre, dotación ausente, conciliación material, fuente atrasada | alta / media |
| Controles | falla crítica activa · cobertura de verificación < 90 % | crítica · alta |
| Acciones y plan | críticas vencidas · cumplimiento a la fecha < 85 % | crítica · media |
| Salud | vigilancia médica < 95 % | media |

Cada señal indica qué cambió, evidencia con cifras (y celda de origen cuando viene de un hecho), alcance, prioridad, **rol sugerido «por configurar»** (nunca un nombre), plazo sugerido 7 / 15 / 30 / 60 días y un control recomendado, que es una recomendación y no una ejecución. No se inventan causas. Sin registros de acciones, los «próximos pasos» salen de vacíos de datos, módulos pendientes y diferencias materiales de conciliación.

## 7. Compuerta predictiva (D01–D08)
- Candidato: modelo gamma-Poisson (binomial negativa) con descuento exponencial 0,9 sobre conteos mensuales TRI con HH como exposición. Referencia: tasa de los 12 meses previos × HH futuras supuestas (media de los últimos 3 meses, publicada).
- Evaluación de origen móvil sin información posterior, horizontes 30 / 60 / 90 días: puntaje logarítmico medio frente a la referencia, cobertura del intervalo al 80 % (transformada integral de probabilidad en el punto medio, por tratarse de conteos) y error absoluto medio.
- Se habilita solo si hay ≥ 36 meses y ≥ 30 eventos, el candidato iguala o supera a la referencia, la cobertura está entre 0,70 y 0,90, no hay deriva de alcance (≤ 25 % de las HH en proyectos que empezaron o terminaron en 12 meses), no hay numeradores sin cierre en los últimos 3 meses **y** existe aprobación explícita (`predictiveApproved`) o el conjunto es de demostración (entonces todo se marca **simulación sin validez operativa**).
- Si no se habilita: se listan todos los motivos, se muestran las métricas de validación y las salidas son nulas. No se inventan cifras.
- D02 = 1 − P(N = 0) del modelo validado; D03 = E[N] × 1.000.000 / HH supuestas; D04 = residuo estandarizado frente a la línea base ajustada por exposición (umbral descriptivo 3σ, disponible sin compuerta); D05 y D06 solo con registros de acciones y plan (frecuencias empíricas con verificación fuera de muestra); D07 = controles críticos con ≥ 2 fallas en 6 meses; D08 = escenario HH ± 10 % con la hipótesis a la vista. No se predicen fatalidades individuales ni se puntúan trabajadores.

## 8. Puntaje de atención (0–100, nunca con %)
Variables y pesos: LTIFR de 12 meses frente a la meta 30 · TRIFR de 12 meses frente a la meta 20 · eventos de alto potencial en 3 meses 20 · rampa de exposición 10 · vacíos de datos 10 · puntaje SSOMA 10. Normalización mín–máx sobre todos los proyectos del conjunto (no cambia al filtrar). Las variables ausentes se reponderan y se declaran. Es una ayuda de priorización, no un riesgo estadístico.

## 9. Calidad y trazabilidad
Q01 completitud de campos obligatorios por proyecto-mes activo · Q02 proyecto-mes con HH válidas / esperados · Q03 meses marcados como duplicado de plantilla / recibidos · Q04 N/D sin fechas de reporte (con registros: reporte dentro de 1 día, por defecto) · Q05 meses de atraso de cada fuente frente al corte. La matriz de cobertura muestra país × medida clave × últimos 12 meses con los estados correcto, faltante, sin cierre, sin exposición, error, futuro o no aplica.

## 10. Datos de demostración
`demoDataset(seed = 7)` genera un conjunto reproducible y sintético (nombres «DEMO», coordenadas ficticias no verificadas, 36 meses). Se activa con un selector explícito, queda marcado en pantalla y en exportaciones y nunca se mezcla con datos reales.

## 11. Verificación
`npx vitest run tests/engine` cubre los criterios 1–8, 11 y 12 de la sección 17 del encargo, la prueba aritmética (IF ≈ 1,402 · IS ≈ 43,452 · IA ≈ 0,06091 y 0,65 × 4,34 / 1.000 = 0,002821), cobertura pareada, indefinido ≠ cero, modos de comparación, intervalo de Poisson, reproducibilidad del conjunto de demostración, textos en tres idiomas y tiempo de `sheet()` inferior a 300 ms.
