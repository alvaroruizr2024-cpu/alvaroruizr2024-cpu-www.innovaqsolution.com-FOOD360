# Los números de INNOVAQ Solutions (línea SIG 360°)

## La nota del CFO

**Cómo leer este documento.** La herramienta cuenta "unidades al día". Aquí una unidad es un cliente pagando un mes de SIG 360°, y el mes se trató como un solo "día". Donde la tabla en inglés dice *a day*, lea **clientes de pago en ese mes**. Los montos están en dólares y antes de IGV.

**Qué se modeló y qué no.** Solo la suscripción de SIG 360° a US$ 79, cargando con todos los costos fijos de la empresa. El fundador corrigió ese dato: los costos fijos no superan S/ 5.000 al mes, y se usó ese tope (US$ 1.351). Los ingresos de consultoría no están porque no se informaron; todo lo que la consultoría aporte mejora estos resultados.

- **El margen.** Cada cliente deja US$ 71,43 al mes después de sus costos directos (90% del precio). Con 43 clientes, el margen después de todos los costos es de 51%.
- **El punto de equilibrio: 19 clientes de pago.** Hoy hay entre 1 y 5. Con costos tan bajos la meta es alcanzable; faltan unos 15 clientes.
- **La línea que hay que vigilar: el ritmo al que entran clientes que pagan.** El primer año cierra con **US$ 931 de ganancia** solo si se cumple el ritmo supuesto (de 3 a 43 clientes en doce meses). Es un resultado frágil:
  - con 10% menos de clientes, pierde US$ 783; con 20% menos, pierde US$ 2.497;
  - si solo entra 1 cliente neto al mes, pierde US$ 8.926;
  - si se queda en 3 clientes todo el año, pierde US$ 13.641.
- **El panel no respalda ese ritmo.** De 20 compradores simulados, ninguno pagaría en el primer mes y 8 dijeron que a lo mucho abrirían la prueba gratuita, sin pagar. Hasta tener datos reales de cuántas pruebas terminan en pago, trate el ritmo supuesto como optimista.
- **Caja.** Hacen falta **US$ 4.249** para cubrir los seis primeros meses, que son los que pierden, si el ritmo se cumple. Si los clientes no crecen, hasta US$ 13.641 en el año.
- **Tres formas de mejorar el resultado**, con el número que cambia:
  1. **Subir el ingreso por cliente a US$ 200** con un paquete de software más acompañamiento: el equilibrio baja de 19 a 8 clientes y el año pasa de US$ 931 a US$ 28.404 con el mismo ritmo. Incluso entrando un solo cliente neto al mes, el año cierra en US$ 2.750. Estas cifras todavía no descuentan lo que cuesta prestar el servicio.
  2. **No apoyarse en el plan de US$ 29.** A ese precio el equilibrio sube a 56 clientes y el año pierde US$ 10.421 con el mismo ritmo.
  3. **Probar US$ 99 en el plan Inicial:** el equilibrio baja a 15 clientes y el año sube a US$ 5.472. Hay que probarlo con compradores reales, porque 11 de 20 del panel ya lo sienten caro.
- **Contratar cambia la cuenta.** Una primera persona de S/ 2.000 a 4.500 al mes sube el equilibrio de 19 a entre 27 y 36 clientes a US$ 79. A US$ 200 por cliente lo deja entre 11 y 14.
- **Las condiciones de dinero del directorio** están en [`board.md`](board.md), con su estado después de estos números. La 14 (US$ 200 o más por cliente) no se cumple hoy. La 15b (el software cubre solo los costos fijos en doce meses) se cumple en el papel: el ritmo supuesto llega a 19 clientes en el mes 7.

**Una pregunta que cambia la lectura.** Si los S/ 5.000 no incluyen un sueldo para usted, la ganancia de este modelo es lo que le queda por su trabajo, no un excedente.

**Lo que falta para que estos números sean reales** (detalle en [`cfo-sources.md`](cfo-sources.md)): el desglose de los costos fijos, cuántos de los clientes actuales pagan SIG 360° y cuánto, los ingresos mensuales de consultoría, la factura real de nube y la comisión real de cobro.

Esto no es asesoría financiera, tributaria ni legal. Un contador debe revisar la estructura, la planilla y los impuestos antes de mover dinero.

## Escenarios corridos con la herramienta

| Escenario | Deja cada cliente | Clientes para el equilibrio | Resultado del año 1 | Caja necesaria |
| --- | ---: | ---: | ---: | ---: |
| **Base: US$ 79, costos fijos de US$ 1.351, ritmo supuesto** | US$ 71,43 | **19** | **US$ 931** | **US$ 4.249** |
| 10% menos de clientes | US$ 71,43 | 19 | -US$ 783 | US$ 4.700 |
| 20% menos de clientes | US$ 71,43 | 19 | -US$ 2.497 | US$ 5.228 |
| La mitad de clientes | US$ 71,43 | 19 | -US$ 7.640 | US$ 7.831 |
| El doble de clientes | US$ 71,43 | 19 | US$ 18.074 | US$ 1.910 |
| Solo 1 cliente neto más al mes (de 3 a 14) | US$ 71,43 | 19 | -US$ 8.926 | US$ 8.926 |
| Sin crecer: 3 clientes todo el año | US$ 71,43 | 19 | -US$ 13.641 | US$ 13.641 |
| Precio US$ 29 | US$ 24,13 | 56 | -US$ 10.421 | US$ 10.421 |
| Precio US$ 39 | US$ 33,59 | 41 | -US$ 8.150 | US$ 8.244 |
| Precio US$ 59 | US$ 52,51 | 26 | -US$ 3.610 | US$ 5.662 |
| Precio US$ 99 | US$ 90,35 | 15 | US$ 5.472 | US$ 3.322 |
| US$ 200 por cliente | US$ 185,90 | 8 | US$ 28.404 | US$ 1.264 |
| US$ 200 por cliente, solo 1 cliente neto más al mes | US$ 185,90 | 8 | US$ 2.750 | US$ 2.108 |
| Costos fijos de S/ 3.000 (US$ 811) | US$ 71,43 | 12 | US$ 7.411 | US$ 1.458 |
| Con una primera contratación de S/ 2.000 al mes | US$ 71,43 | 27 | -US$ 5.561 | US$ 8.136 |
| Con una primera contratación de S/ 4.500 al mes | US$ 71,43 | 36 | -US$ 13.661 | US$ 14.313 |
| US$ 200 por cliente, con una contratación de S/ 2.000 | US$ 185,90 | 11 | US$ 21.912 | US$ 2.920 |
| US$ 200 por cliente, con una contratación de S/ 4.500 | US$ 185,90 | 14 | US$ 13.812 | US$ 5.771 |

En los escenarios con otro precio la comisión de cobro se recalculó con la misma fórmula (5,4% más US$ 0,30). Por eso difieren un poco de la tabla *What if* de abajo, que cambia el precio sin tocar los costos.

## El informe de la herramienta (escenario base)

Every number below comes from the input file. Nothing is looked up or guessed.

### One cliente-mes

| line | per cliente-mes |
| --- | ---: |
| Price | $79.00 |
| Comisión de cobro PayPal (estimación: 5,4% + US$ 0,30) | -$4.57 |
| Nube y base de datos por cliente (estimación) | -$3.00 |
| **Contribution** (what each cliente-mes leaves to pay the fixed costs) | **$71.43** (90%) |

### The margin that matters

Fixed costs: $1,351 a month (Costos fijos de toda la empresa (tope que dio el fundador: S/ 5.000 al mes, a S/ 3,70) $1,351).

- **Break-even: 19 cliente-mess a day.** Below that you lose money every month.
- **Profit margin at your plan** (43 a day): **51%** of every sale, after every cost.

### Year 1, month by month

| month | cliente-mess a day | revenue | profit | cumulative (after $0 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | $237 | -$1,137 | -$1,137 |
| 2 | 5 | $395 | -$994 | -$2,131 |
| 3 | 7 | $553 | -$851 | -$2,982 |
| 4 | 10 | $790 | -$637 | -$3,618 |
| 5 | 13 | $1,027 | -$422 | -$4,041 |
| 6 | 16 | $1,264 | -$208 | -$4,249 |
| 7 | 20 | $1,580 | $78 | -$4,171 |
| 8 | 24 | $1,896 | $363 | -$3,808 |
| 9 | 28 | $2,212 | $649 | -$3,159 |
| 10 | 33 | $2,607 | $1,006 | -$2,153 |
| 11 | 38 | $3,002 | $1,363 | -$789 |
| 12 | 43 | $3,397 | $1,720 | $931 |

- **Year 1 operating profit: $931** on $18,960 of revenue.
- After the $0 startup spend: $931.
- Startup money earned back: month 12.
- Cash you need before it pays for itself: **$4,249**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 51% | 19 | $931 |
| Price -10% | 45% | 22 | -$965 |
| Volume -20% | 41% | 19 | -$2,497 |
| Unit costs +15% | 49% | 20 | $659 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
