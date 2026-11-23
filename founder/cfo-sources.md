# De dónde sale cada número del CFO

Orden de confianza: primero los documentos del fundador, después los precios públicos que se pueden comprobar, al final las estimaciones. Hoy **no hay ningún documento del fundador** (cotizaciones, facturas, planilla), así que todo lo que no viene del sitio público es un rango dicho de palabra o una estimación.

| Dato en `numbers.json` | Valor | De dónde sale | Solidez |
| --- | ---: | --- | --- |
| Precio por cliente al mes | US$ 79 | Plan Inicial de SIG 360° publicado en www.innovaqsolution.com/global/ (leído el 23 de noviembre de 2026) | Dato público. No se sabe si incluye IGV ni cuántos clientes están en cada plan |
| Comisión de cobro | US$ 4,57 | **Estimación:** 5,4% más US$ 0,30 por cobro, la tarifa comercial que PayPal ha publicado para vendedores en Perú. No se pudo abrir la página de tarifas en esta sesión | Verificar en la página de tarifas de PayPal o en una liquidación real |
| Nube y base de datos por cliente | US$ 3,00 | **Estimación** sin respaldo documental: una plataforma compartida entre clientes cuesta pocos dólares por cliente | Reemplazar por la factura mensual de nube dividida entre los clientes activos |
| Costos fijos al mes | US$ 7.432 | Punto medio del rango que dio el fundador (S/ 15.000 a 40.000), a S/ 3,70 por dólar, el tipo de cambio que usa su sitio | Rango dicho de palabra. Se corrieron también los dos extremos: US$ 4.054 y US$ 10.811 |
| Gasto único de arranque | US$ 0 | Nadie informó ningún gasto por hacer; el software ya está construido | Añadir aquí el presupuesto de lanzamiento cuando exista |
| Clientes de pago mes a mes | 3, 5, 7, 10, 13, 16, 20, 24, 28, 33, 38, 43 | **Estimación.** Parte de 3 (punto medio de "entre 1 y 5 clientes de pago") y suma 2 clientes netos al mes en el primer trimestre, 3 en el segundo, 4 en el tercero y 5 en el cuarto | La más débil de todas. No hay datos de visitas, pruebas iniciadas, conversión ni bajas. El panel simulado no la respalda (0 de 20 pagarían el primer mes) |
| Días por mes | 1 | Truco de lectura: la herramienta trabaja "por día" y una suscripción se cobra por mes | No es un supuesto de negocio |

## Lo que solo el fundador puede dar

1. La cifra exacta de costos fijos y su desglose (sueldos, nube y herramientas, oficina, contador).
2. Cuántos de los clientes actuales pagan SIG 360°, en qué plan, y desde cuándo.
3. Los ingresos mensuales de consultoría de los últimos seis meses.
4. Cuántas pruebas gratuitas se iniciaron y cuántas terminaron en pago.
5. Cuántas horas toma cargar los documentos de un cliente nuevo y cuánto cuesta esa hora. Sin esto no se puede poner precio al paquete con acompañamiento ni calcular una garantía.

## Datos de terceros usados como referencia (no entran en `numbers.json`)

Vienen de [`competitors.md`](competitors.md) y son resultados de búsqueda, no lecturas directas de cada página: servicio externo de SSOMA desde S/ 750 al mes más IGV; consultoría de implementación entre S/ 12.000 y 35.000 (una sola fuente); Kawak a US$ 238 al mes.
