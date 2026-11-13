# Verificación y aceptación

Resultados obtenidos el 13-nov-2026 en el contenedor de desarrollo con Chromium sin interfaz gráfica, cuyo WebGL se emula por software (SwiftShader).
Las cifras reales no aparecen aquí: el repositorio es público.

## Pruebas automatizadas

| Conjunto | Resultado |
|---|---|
| `npm test` (vitest: motor, ingesta, lector y escritor XLSX) | 65 de 65 superadas |
| `npm run typecheck` | Sin errores |
| `npm run build` | Correcto |
| Lector XLSX frente a una extracción independiente (openpyxl) de los tres libros | 100 % de las celdas no vacías coinciden en valor guardado y en fórmula |
| Valores esperados de la revisión manual de los tres libros | 91 de 91 aserciones superadas (comprobación privada, fuera del repositorio) |
| `scripts/accept-e2e.cjs` con datos DEMO y con datos reales | Todas superadas (detalle abajo) |
| Recorrido de interacción `src/dev/smoke.cjs` con el motor real | Superado: fichas, catálogo, metodología, importación, conciliación, personalización, filtros, idiomas, cepillo temporal, presentación, exportaciones CSV/PNG/PDF y adaptación a pantallas pequeñas. Con datos reales no se prueban la matriz de controles ni la figura corporal, porque su fuente está pendiente. |

## Criterios de la sección 17 del encargo

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | La suma regional de numeradores y denominadores coincide con los países | PASA | `tests/engine/acceptance.test.ts` |
| 2 | Un evento con varios afectados sigue siendo un evento y n casos | PASA | ídem |
| 3 | Los filtros recalculan todo y conservan denominadores válidos | PASA | Prueba del motor y recorrido del navegador: el filtro de zona corporal no cambia las horas trabajadas y explica por qué |
| 4 | HH cero da N/D; cero accidentes con HH válidas da tasa cero | PASA | Prueba del motor |
| 5 | Las actividades futuras no reducen el cumplimiento a la fecha | PASA | Prueba del motor |
| 6 | Una reprogramación conserva el vencimiento original y la historia | PASA | Prueba del motor |
| 7 | Las dos cohortes de cierre de acciones no se confunden | PASA | Prueba del motor (O07 frente a O08 sobre un caso construido) |
| 8 | Tema e idioma no alteran cifras, filtros ni significado | PASA | `accept-e2e.cjs`: los mismos 10 valores en ES/EN/PT y en tema claro u oscuro, con datos reales y DEMO |
| 9 | La alternativa 2D responde las mismas consultas | PASA | Seleccionar Colombia en 2D produce las mismas horas que el chip de país; la lista accesible ofrece las mismas acciones |
| 10 | Las exportaciones coinciden con la vista y respetan permisos | PARCIAL | CSV, XLSX, PNG y PDF salen del mismo modelo y llevan filtros, idioma, corte, metodología y marca DEMO. No existe capa de permisos: una aplicación estática no la sustituye. |
| 11 | Sin predicción validada no hay cifras inventadas | PASA | Con datos reales la compuerta queda cerrada y muestra el motivo (el modelo no supera a la referencia simple) |
| 12 | Ningún verde oculta una falla crítica activa | PASA | Prueba del motor |
| 13 | Lámina legible en las resoluciones objetivo | PASA | 1920 × 1080 y 1440 × 900 sin desplazamiento vertical y sin texto menor de 11 px, en los dos temas y los tres idiomas |
| — | Prueba aritmética: 6 incapacitantes, 4.280.550 HH, 186 días | PASA | IF 1,402 · IS 43,452 · IA 0,06091; además 0,65 × 4,34 / 1.000 = 0,002821 |

## Rendimiento medido

Medido en este contenedor, sin GPU, con la compilación de producción (`vite preview`) y datos DEMO, salvo indicación. Seis repeticiones por caso.

| Medida | Resultado |
|---|---|
| Tarjetas utilizables tras la navegación | 1,1 a 2,8 s |
| Respuesta del filtro de país con el mapa 2D | Mediana 195 ms (136 a 237 ms) |
| Respuesta del filtro de país con el globo 3D | Mediana 600 a 760 ms |
| Cálculo de la lámina en el motor (`sheet()`) | 110 a 170 ms |

La meta de 300 ms se cumple con el mapa 2D. Con el globo 3D no se cumple en este contenedor, porque el WebGL emulado por CPU bloquea el hilo principal en cada fotograma. En un equipo con GPU no se ha medido.

## No verificado

- Rendimiento en un equipo con GPU y en navegadores distintos de Chromium.
- Control de acceso por rol a datos y exportaciones: requiere una capa de servicio.
- Logotipo oficial: el sitio incimmet.com no fue accesible desde el entorno de construcción; la cabecera usa un rótulo tipográfico.
