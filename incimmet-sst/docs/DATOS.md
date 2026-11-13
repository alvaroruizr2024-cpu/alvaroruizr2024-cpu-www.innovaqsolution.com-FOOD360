# Datos: ingesta, tabla larga y conciliación

Este documento describe cómo se convierten los tres libros Excel de origen en un único conjunto de datos (`Dataset`, tipo `real`) y qué reglas se aplican. No contiene cifras ni nombres reales: el repositorio es público y los libros, el conjunto generado y el registro de conciliación viven solo en `private/` (ignorado por git) o en el equipo de quien los carga.

## 1. Flujo

```
libro .xlsx ──► lector propio (src/ingest/xlsx/read.ts)
            ──► detección de perfil por estructura (profiles/detect.ts)
            ──► perfil: corporativo · colombia · formulario de contratista
            ──► hechos mensuales + cifras reportadas + metas + hallazgos
            ──► conciliación (reconcile.ts) ──► Dataset único
```

- `ingestApi.ingestFiles(archivos, previo?)` (en `src/ingest/index.ts`) admite uno, dos o tres libros. Las fuentes que faltan quedan registradas como hallazgo «fuente no cargada»; si se pasa un conjunto previo, se conserva lo ya cargado de las fuentes que no se vuelven a importar.
- `toStatRows(dataset)` deriva la tabla larga de estadísticas mensuales (apartado 4).
- `ingestApi.writeWorkbook(hojas)` genera un XLSX mínimo para las exportaciones.

## 2. Perfiles de importación

El perfil se decide por la estructura del libro, nunca por el nombre del archivo.

| Perfil | Se reconoce por | País | Qué se importa |
|---|---|---|---|
| `corporate` | Existe una hoja `MediaMovilNN` | Perú | Solo la hoja `MediaMovilNN` de mayor NN. Las demás hojas son vistas superpuestas y se marcan como no usadas. |
| `colombia` | La celda A3 de una hoja dice «COLOMBIA GENERAL» | Colombia | Esa hoja: el bloque general (consolidado) y un bloque por proyecto. |
| `incired` | Hoja `Estatistica` con la etiqueta «HOMEM HORAS TRABALHADAS» | Brasil | Solo esa hoja. Las hojas ocultas y la hoja de casos sin registros no se combinan. |

### 2.1. Bloques guiados por etiquetas (corporativo y Colombia)

`profiles/blocks.ts` no usa posiciones fijas:

- Un bloque empieza en el encabezado de potencial de gravedad («CLASIFICACION POR:» con la marca PG en el formato nuevo; «POTENCIAL DE GRAVEDAD» en el formato anterior). Su título es la celda de texto aislada inmediatamente superior; el prefijo «N. » se retira del nombre.
- Las filas se reconocen por su etiqueta, comparada sin tildes, mayúsculas, espacios ni signos. En el formato nuevo el nivel sale de la columna contigua (5-6, 4, 3, 2, 1).
- Los meses de cada sección salen de las celdas de fecha de **su propio** encabezado. Una columna sin fecha después de la última fecha (totales) se ignora. Si el encabezado forma una secuencia mensual continua y alguna celda intermedia está vacía o tiene una fecha fuera de secuencia, la columna toma el mes que le corresponde en esa secuencia y la corrección queda en el registro de conciliación.
- La primera fila bajo «INDICADOR MENSUAL» es el TRIFR del mes aunque su rótulo diga otra cosa. La sección «acumulado» del formato anterior equivale a 12 meses móviles (así lo indican sus fórmulas), no a un acumulado del año.
- El consolidado se identifica porque su fila de horas suma filas de otros bloques. Cada consolidado encabeza una sección; en el libro corporativo solo se importa la sección del consolidado de formato nuevo. Las secciones de formato anterior (vista histórica regional y copia de otro país) no se importan y generan un hallazgo informativo.
- Los bloques de formato anterior dentro de la sección importada son proyectos históricos: se conservan separados, con el sufijo `-hist` en su identificador y estado cerrado, aunque su nombre coincida con el de un bloque vigente.

Correspondencia de filas → medida (`MeasureKey`) o indicador reportado:

| Sección | Filas | Destino |
|---|---|---|
| Potencial de gravedad | niveles 5-6, 4, 3, 2, 1 | `pg56`, `pg4`, `pg3`, `pg2`, `pg1` |
| Accidentes por nivel | mortales, incapacitantes, leves 3/2/1 | `accFatal`, `accLti`, `accNv3`, `accNv2`, `accNv1` |
| Otros conteos | a la persona, a la propiedad, incidentes a persona/propiedad, incidentes investigados, HPRI con/sin pérdida | `accPerson`, `accProperty`, `incPerson`, `incProperty`, `incInvestigated`, `hpriLoss`, `hpriNoLoss` |
| Indicador mensual | horas, días perdidos, trabajadores, desempeño | `hh`, `lostDays`, `workers`, `ssomaScore` |
| Indicador mensual / anual / 12 meses | TRIFR o TACSA, IF, IS, IA y sus componentes agregados | cifras reportadas (`ReportedStat`) con `periodType` `month`, `ytd` o `rolling12` |
| Metas | límite de TRIFR, meta de IF, IS, IA | `Target` corporativo (consolidado) o de proyecto |

### 2.2. Formulario de contratista

- Los meses son texto sin año: el año se toma del nombre del archivo (o de sus metadatos) y se registra como provisional.
- Filas: accidentes sin y con baja (`accNoLostTime`, `accLti`), días perdidos más debitados (`lostDays`, combinados), horas de capacitación (`trainingHours`, unidad por confirmar), horas trabajadas (`hh`), dotación (`workers`). Las tasas, el porcentaje de capacitación y la columna de acumulado se guardan como cifras reportadas.
- Un mes con horas trabajadas y celdas de accidentes vacías queda como `null` con calidad `not_closed`: nunca se asume «cero accidentes».
- El proyecto se crea con el nombre de la empresa del formulario, sin cliente, coordenadas ni zona horaria (pendiente de maestro aprobado). El nombre del responsable no se importa.
- Se ignoran, con hallazgo: la celda bajo «Meta» que es una suma, las filas de constantes sin etiqueta y el acumulado que promedia porcentajes.

## 3. Reglas de precedencia

1. Una única fuente canónica por país, proyecto, mes y medida: los **bloques de proyecto**. Perú desde la hoja `MediaMovilNN` más reciente; Colombia solo desde su propio libro (nunca desde la copia oculta del corporativo); Brasil desde el formulario de contratista.
2. Los consolidados, índices, acumulados y móviles de la fuente se guardan en `reported` únicamente para conciliar: nunca se suman como hechos.
3. Mensual, acumulado del año y 12 meses móviles se guardan por separado (`periodType`).
4. No se importan meses posteriores al último mes con horas trabajadas en algún proyecto de la fuente.
5. No se interpola ni se rellena con ceros. Los meses sin exposición, con todos los conteos en cero o vacíos y fuera de la ventana activa del bloque no se materializan como hechos.
6. `cutoffMonth` = último mes con datos entre las fuentes cargadas.

## 4. Diccionario de la tabla larga

`toStatRows(dataset)` y `private/out/estadisticas_mensuales.csv` (separador `;`, UTF-8 con BOM) contienen una fila por país, proyecto, mes, indicador y tipo de período. No equivale a un registro individual de eventos.

| Columna CSV | Campo | Contenido |
|---|---|---|
| país | `country` | `PE`, `CO`, `BR` |
| proyecto | `project` | Nombre del bloque; `*` = consolidado del país |
| mes | `month` | `AAAA-MM` |
| población | `population` | `all`: la fuente no separa personal propio y contratista |
| indicador | `indicator` | Medida o índice de origen (`hh`, `accLti`, `IF`, `TRIFR`, `TACSA`, `TF`…) |
| valor original | `rawValue` | Valor tal como está guardado (número, texto o error como `#DIV/0!`) |
| valor numérico | `value` | Número normalizado; vacío si no hay dato válido |
| unidad | `unit` | `hh`, `people`, `days`, `events`, `hours`, `score`, `per1e6hh`, `index`, `pct` |
| tipo de período | `periodType` | `month`, `ytd`, `rolling12` |
| archivo, hoja, celda | `file`, `sheet`, `cell` | Procedencia exacta |
| fórmula de origen | `formula` | Texto de la fórmula (las compartidas se expanden celda a celda) |
| calidad | `quality` | Bandera del apartado 5 |
| versión | `version` | Versión de taxonomía (`reportado-v1`) |
| tipo de valor | `valueKind` | `stored` = guardado en la fuente; `recalculated` = suma de bloques de proyecto |

## 5. Valores y banderas de calidad

En `MonthlyFact.v`: `undefined` = la fila no existe en la fuente; `null` = existe pero no hay dato válido; número = valor informado (0 es un cero escrito). Cada medida lleva su procedencia en `p[k] = { c: 'Hoja!A1', f, raw, q }`.

| Bandera | Significado | Tratamiento |
|---|---|---|
| `ok` | Valor válido | Se usa |
| `empty` | Celda vacía | `null` |
| `error` | Error guardado (división por cero u otro) | `null`; se cuenta, nunca se sustituye por cero |
| `not_closed` | Hay exposición pero el numerador está vacío | `null`; el mes queda fuera de los recálculos pareados |
| `template_duplicate` | Horas idénticas a las de otro bloque: tres o más meses consecutivos (el origen es el bloque cuya serie continúa) o un valor aislado fuera de la ventana activa | Todas las medidas del mes quedan en `null`; el valor bruto se conserva en `raw` |
| `placeholder` | Horas simbólicas con dotación cero | `hh = null` |
| `hardcoded` | Constante escrita donde el patrón de la fila es una fórmula | Se conserva y se marca |
| `future`, `excluded` | Reservadas (los meses futuros no se importan) | — |

Metas: `stored` es el valor de la celda; `effective` es el valor modal del año calendario. Si difieren, `flagKey = rec.target.autofill_suspect`.

## 6. Registro de conciliación

`Dataset.reconciliation` (y `private/out/reconciliacion.{json,csv,md}`) reúne:

- **(a) Consolidado frente a suma de bloques**, por país, mes y medida. Cuando difieren se analizan las referencias de la fórmula del consolidado para nombrar la causa: bloques con datos que la fórmula no suma, referencia a una fila con otra etiqueta, constante escrita, horas marcadas como no válidas o causa no identificada.
- **(b) Índices reportados frente a recalculados** (IF, IS, IA, TRIFR/TACSA, TF, TG; mes, año y 12 meses), con la fórmula de origen (× 1.000.000 / horas trabajadas) y solo con meses pareados numerador/denominador. En estos registros, valor reportado, recalculado y delta corresponden al último mes del tramo.
- **(c) Hallazgos estructurales**: celdas con error, meses con solo encabezado, numerador sin cierre, restos de plantilla, marcadores de posición, metas con autorrelleno, hojas y secciones no importadas, encabezados corregidos, año tomado del nombre del archivo, hojas ocultas no combinadas, dotación ausente, ubicación pendiente de maestro y cambios de composición de las fórmulas.

Los meses consecutivos del mismo hallazgo se fusionan. Severidad: `material` si difiere un conteo o un KPI se mueve más de 0,5 %; `minor` o `info` en el resto. Cada registro indica fuente elegida, motivo, regla aplicada, KPI afectados, valores y celdas. Columnas del CSV: id, severidad, país, proyecto, meses, KPI afectados, diferencia, fuente elegida, motivo, regla aplicada, valor reportado, valor recalculado, delta, celdas. Los textos están en `src/i18n/rec.ts` (es, en, pt).

## 7. Disponibilidad de módulos

Exposición, accidentes y potencial quedan disponibles cuando hay datos; capacitación queda parcial (una sola fuente y unidad por confirmar). Casos, controles, plan anual, acciones, salud, higiene, programas y mapa por proyecto quedan pendientes, con la lista de tablas requeridas y su plantilla en `/templates/<tabla>.csv` (`eventos`, `casos`, `controles`, `verificaciones`, `plan_anual`, `acciones`, `salud_agregada`, `higiene`, `programas`, `proyectos`). La predicción queda deshabilitada.

## 8. Privacidad

- Los **comentarios de celda no se leen**: pueden contener datos personales. El lector ni siquiera descomprime comentarios, dibujos ni vínculos externos.
- Autor y último editor del libro no se guardan en el conjunto de datos; solo la fecha de modificación.
- Las hojas ocultas se listan con su estado; no se combinan con el reporte vigente hasta confirmar año, unidad y procedencia.
- No se importan nombres de responsables ni otros datos de personas.
- Pruebas y ejemplos usan únicamente libros sintéticos con nombres «DEMO», construidos dentro de cada prueba.

## 9. Uso local: `npm run ingest`

```
npm run ingest                         # lee todos los .xlsx de private/sources/**
npm run ingest -- ruta/a.xlsx ruta/b.xlsx
```

Genera en `private/out/`: `dataset.real.json`, `reconciliacion.json`, `reconciliacion.csv`, `reconciliacion.md` y `estadisticas_mensuales.csv`, e imprime un resumen. En desarrollo, la aplicación sirve ese conjunto solo desde el equipo local.

## 10. Importador en el navegador

El mismo código corre en el navegador: el archivo elegido se lee como bytes en memoria, se procesa con `ingestApi.ingestFiles` y el resultado se entrega a la aplicación. El módulo de ingesta no hace peticiones de red ni usa APIs de servidor; los datos no salen del equipo. La huella SHA-256 de cada archivo se calcula localmente para identificar la versión cargada.

## 11. Lector y escritor XLSX

- Lector: cadenas compartidas y en línea (texto enriquecido concatenado), booleanos, errores, fechas por formato (integrados 14–22 y 45–47, o personalizados con d/m/y fuera de comillas y corchetes), sistema de fechas 1904, entidades XML, fórmulas compartidas traducidas celda a celda (respeta `$`, literales, hojas y rangos; no toca nombres de función), estado de hojas, filas y columnas ocultas y metadatos básicos.
- Escritor: libro mínimo válido con cadenas en línea, texto escapado y nombres de hoja saneados a 31 caracteres.
- Límites: no evalúa fórmulas (usa el valor guardado), no lee estilos visuales, tablas dinámicas ni hojas de gráfico.

## 12. Verificación

- `npx vitest run tests/ingest`: lector, escritor, analizador de bloques, hechos, conciliación e i18n con libros sintéticos.
- Verificación privada (no versionada, en `private/checks/`): comparación celda a celda del lector contra un volcado independiente y comprobación de los valores esperados de cada libro real.
