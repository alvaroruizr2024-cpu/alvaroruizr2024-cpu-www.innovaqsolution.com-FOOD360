# Plan previo — INCIMMET | Centro Regional de Inteligencia SST

**Anticipar riesgos. Verificar controles. Proteger personas.** · Perú, Colombia y Brasil · ES / EN / PT-BR · versión 0.1 (13-nov-2026)

## 1. Síntesis del diseño elegido
Centro de control regional geoespacial en **una sola lámina**: el mapa regional 3D orienta, los gráficos explican y las señales conducen a acciones verificables. Estética «sala de control minera»: azul profundo, bordes luminosos moderados, cifras destacadas con minitendencias y un bloque claro de señales y próximos pasos. Los adornos no compiten con los datos.

| Referente | Qué se adopta | Límite |
|---|---|---|
| CesiumJS | Globo 3D navegable, selección de país/proyecto, acercamientos controlados | Alternativa 2D y lista accesible equivalentes |
| Palantir Foundry Map | Cadena proyecto → evento → riesgo → control → acción → evidencia | Patrón de interacción, sin copiar interfaces |
| NVIDIA Omniverse | Profundidad, materiales e iluminación del territorio | Nada decorativo se llama gemelo digital |
| Apple visionOS | Capas, foco y transiciones breves | Interacción de navegador |

Decisión técnica: el globo 3D se implementa con **three.js (react-globe.gl)** en un fragmento diferido, sin teselas, tokens ni servicios externos; el componente respeta un contrato (`RegionMapProps`) que permite sustituirlo por CesiumJS. La vista 2D es SVG (funciona sin WebGL).

## 2. Esquema de la lámina (1920 × 1080 y 1440 × 900 sin desplazamiento)
```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ ENCABEZADO 8 %  logo · título · período · países/proyecto · comparar · idioma · tema · datos │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ BANDA EJECUTIVA 15 %  contexto (HH, dotación) + 8 tarjetas de decisión                       │
├──────────────────────────────┬──────────────────────────────┬─────────────────────────────┤
│ MAPA REGIONAL 3D / 2D / lista │ EVOLUCIÓN: recuentos · tasas ·│ CONTROLES CRÍTICOS Y         │
│ capas, leyenda, proyectos     │ exposición (ejes separados)   │ SEÑALES TEMPRANAS       43 % │
├──────────────────────────────┼──────────────────────────────┼─────────────────────────────┤
│ PLAN ANUAL / capacitación     │ SALUD Y LESIONES / potencial  │ ACCIONES Y PRÓXIMOS PASOS 28%│
├──────────────────────────────┴──────────────────────────────┴─────────────────────────────┤
│ PIE 6 %  filtros activos · calidad y cobertura · metodología · estado de las fuentes         │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```
Paneles laterales (no cambian de ruta): ficha de KPI, catálogo de KPI, metodología local, ficha de proyecto, señal, conciliación, importación y personalización de tarjetas.

## 3. Fuentes disponibles y qué alimentan
| Fuente (perfil de importación) | País | Qué aporta | Tratamiento |
|---|---|---|---|
| Libro corporativo de estadísticas (hoja `MediaMovilNN` más reciente) | Perú | HH, dotación, días perdidos, accidentes por nivel, daños materiales, incidentes, HPRI, potencial, metas | Bloques por proyecto como hechos; consolidado solo para conciliar |
| Libro de estadísticas de Colombia | Colombia | Igual esquema (formato anterior) | Bloques por proyecto; consolidado solo para conciliar |
| Formulario estadístico de contratista (INCIRED) | Brasil | HHT, accidentes con/sin alejamiento, días, horas de capacitación | Mes sin cierre de accidentes ≠ cero |

| Familia | Estado en la primera versión |
|---|---|
| Exposición, accidentes por nivel, potencial/HPRI, IF·IS·IA·TRIFR/TACSA | Disponible: recalculado desde componentes y conciliado con la cifra de origen |
| Capacitación | Parcial (solo una fuente; unidad por confirmar) |
| Plan anual, controles críticos y verificaciones, acciones, salud e higiene, casos (cuerpo, mecanismo, causa) | **Fuente pendiente**: módulos preparados con requisitos y plantillas; sin cifras inventadas |
| Coordenadas de proyectos | Pendiente de maestro validado: países + lista de proyectos |
| Predicción | Deshabilitada por defecto; solo señales tempranas por reglas |

Datos de demostración: conjunto separado, reproducible, activado con un selector explícito y marcado «DEMO» en pantalla y exportaciones.

## 4. Reglas de cálculo
1. Hechos canónicos = proyecto × mes. Total país y regional = suma de proyectos. Toda tasa = Σ numeradores / Σ denominadores × constante; nunca promedio de tasas.
2. **Cobertura pareada**: un proyecto-mes entra en una tasa solo si numerador y denominador están informados; lo excluido se declara.
3. Denominador cero o ausente → **N/D** con motivo. Cero eventos con exposición válida → 0. Sin programa aplicable → N/A. Campo inexistente en una fuente ≠ cero.
4. Perfil reportado v1 (hasta validar taxonomías): LTIFR = accidentes incapacitantes × 1.000.000 / HH (sin fatalidades); «TRIFR reportado por INCIMMET» = niveles 2 a 6 × 1.000.000 / HH (el nivel 1 queda fuera, como en la fórmula de origen). No se convierten niveles a categorías OSHA.
5. IF, IS, IA y TRIFR/TACSA del esquema corporativo (×1.000.000 HH) se recalculan y se muestran junto a la cifra guardada en origen (grupo C). En Colombia no se rotulan como Resolución 0312; CO01–CO06 usan trabajadores como denominador y no se comparan con PE01, LTIFR ni BR01.
6. Períodos: mes, acumulado del año y doce meses móviles. Comparación interanual, período anterior equivalente o doce meses; variación relativa solo con base distinta de cero; diferencias de porcentajes en puntos porcentuales; aviso si la cobertura no es equivalente.
7. Estado: verde ≤ meta; ámbar hasta meta × 1,2; rojo por encima (bandas configurables y versionadas). Ningún verde si hay una falla crítica activa. Intervalo de Poisson al 95 % y aviso de exposición pequeña en las tasas.
8. Señales tempranas por reglas con evidencia, alcance, prioridad, rol sugerido y plazo sugerido. El modo predictivo solo se habilita con historial, validación fuera de muestra y aprobación explícita; si no, muestra la razón y ninguna cifra.

## 5. Arquitectura
```
src/domain   contratos de datos (types.ts) y de vista (model.ts)
src/ingest   lector/escritor XLSX propio (fflate), perfiles de los tres libros, conciliación  → Dataset
src/engine   cubo proyecto×mes, catálogo de 82 KPI (+C01–C04, SIG), señales, compuerta predictiva, calidad, DEMO → SheetModel
src/ui       lámina, tarjetas, gráficos SVG, paneles, importador, exportaciones, estado único de filtros
src/map      globo 3D diferido, mapa 2D SVG, lista accesible
src/i18n     núcleo + diccionarios ui/eng/kpi/rec/map en ES, EN y PT-BR
```
Un único estado de filtros recalcula todo. La interfaz solo conoce `SheetModel`; cambiar idioma o tema no toca cifras.

## 6. Seguridad de datos
El repositorio es público: **no contiene Excel, cifras reales ni nombres de personas**. Los libros se procesan en el navegador (o con `npm run ingest` en local) y quedan en `private/` (ignorado por git) o en IndexedDB del equipo del usuario. Los comentarios de celda no se leen (contienen datos personales). Una aplicación estática no sustituye un control de acceso: publicar con datos reales exige autenticación en la capa de servicio.

## 7. Verificación prevista
Pruebas automatizadas de la sección 17 del encargo (13 criterios + aritmética IF/IS/IA), comparación celda a celda del lector XLSX contra una extracción independiente, capturas en 1920 × 1080 y 1440 × 900 en ambos temas y tres idiomas, y mediciones reales de carga y de respuesta de filtros en un equipo declarado.
