# Los números de INNOVAQ Solutions (línea SIG 360°)

## La nota del CFO

**Cómo leer este documento.** La herramienta cuenta "unidades al día". Aquí una unidad es un cliente pagando un mes de SIG 360°, y el mes se trató como un solo "día". Donde la tabla en inglés dice *a day*, lea **clientes de pago en ese mes**. Los montos están en dólares y antes de IGV.

**Qué se modeló y qué no.** Solo la suscripción de SIG 360° a US$ 79, cargando con todos los costos fijos de la empresa. Los ingresos de consultoría no están porque no se informaron. Por eso el resultado dice cuánto le falta al software para sostener la empresa por sí solo, no cuánto gana o pierde INNOVAQ en total.

- **El margen.** Cada cliente deja US$ 71,43 al mes después de sus costos directos (90% del precio). El problema no está ahí. Está en que hacen falta **105 clientes de pago** para cubrir los costos fijos, y hoy hay entre 1 y 5.
- **La línea que hay que vigilar: cuánto paga cada cliente.** A US$ 79 el equilibrio está en 105 clientes; a US$ 200 por cliente baja a 40. Ni siquiera triplicar el ritmo de ventas supuesto hace rentable el primer año a US$ 79 (pérdida de US$ 37.754). El segundo factor son los costos fijos: en el extremo bajo del rango que usted dio (S/ 15.000) el equilibrio es de 57 clientes; en el alto (S/ 40.000), de 152.
- **Caja.** Con el ritmo de ventas supuesto, la línea de software pierde **US$ 72.041 en el primer año** con el costo fijo medio (entre US$ 31.505 y US$ 112.589 según el extremo del rango). Dicho de otro modo: la consultoría u otra fuente tiene que aportar en promedio **US$ 6.003 al mes (unos S/ 22.200)** durante ese año para que la empresa no pierda. Con el costo fijo bajo serían US$ 2.625 al mes; con el alto, US$ 9.382.
- **Tres formas de mejorar el resultado**, con el número que cambia:
  1. **Subir el ingreso por cliente a US$ 200** con un paquete de software más acompañamiento: el equilibrio baja de 105 a 40 clientes y la pérdida del primer año de US$ 72.041 a US$ 44.568, con el mismo número de clientes. Todavía no incluye lo que cuesta prestar ese servicio.
  2. **Bajar costos fijos.** Cada S/ 1.000 menos al mes (US$ 270) son casi 4 clientes menos para llegar al equilibrio. En el extremo bajo del rango la pérdida del año es de US$ 31.505.
  3. **Vender más rápido.** Con el doble de clientes cada mes la pérdida baja a US$ 54.898; con el triple, a US$ 37.754. Ayuda, pero menos que las dos anteriores.
- **El ritmo de ventas es una estimación, y el panel no la respalda.** Se supuso que se parte de 3 clientes y que se suman entre 2 y 5 clientes netos al mes, hasta 43 en el mes 12. En el panel de 20 compradores simulados ninguno pagaría en el primer mes; 8 dijeron que a lo mucho abrirían la prueba gratuita, sin pagar. Hasta que haya datos reales de cuántas pruebas se convierten en pago, trate este ritmo como optimista.
- **Las condiciones de dinero del directorio** ([`board.md`](board.md)): la 14 (US$ 200 o más por cliente) no se cumple hoy; la 15 (costo de conseguir un cliente recuperado en 12 meses) y la 10 (costo de la garantía) no se pueden calcular sin datos suyos.

**Lo que falta para que estos números sean reales** (detalle en [`cfo-sources.md`](cfo-sources.md)): la cifra exacta de costos fijos, cuántos de los clientes actuales pagan SIG 360° y cuánto, los ingresos mensuales de consultoría, la factura real de nube y la comisión real de cobro.

Esto no es asesoría financiera, tributaria ni legal. Un contador debe revisar la estructura, la planilla y los impuestos antes de mover dinero.

## Escenarios corridos con la herramienta

| Escenario | Deja cada cliente | Costos fijos al mes | Clientes para el equilibrio | Resultado del año 1 |
| --- | ---: | ---: | ---: | ---: |
| **Base: US$ 79, costo fijo medio** | US$ 71,43 | US$ 7.432 | **105** | **-US$ 72.041** |
| Costo fijo bajo (S/ 15.000) | US$ 71,43 | US$ 4.054 | 57 | -US$ 31.505 |
| Costo fijo alto (S/ 40.000) | US$ 71,43 | US$ 10.811 | 152 | -US$ 112.589 |
| Precio US$ 59 | US$ 52,51 | US$ 7.432 | 142 | -US$ 76.582 |
| Precio US$ 99 | US$ 90,35 | US$ 7.432 | 83 | -US$ 67.500 |
| US$ 200 por cliente | US$ 185,90 | US$ 7.432 | 40 | -US$ 44.568 |
| US$ 200 por cliente, costo fijo bajo | US$ 185,90 | US$ 4.054 | 22 | -US$ 4.032 |
| US$ 200 por cliente, costo fijo alto | US$ 185,90 | US$ 10.811 | 59 | -US$ 85.116 |
| Base con el doble de clientes cada mes | US$ 71,43 | US$ 7.432 | 105 | -US$ 54.898 |
| Base con el triple de clientes cada mes | US$ 71,43 | US$ 7.432 | 105 | -US$ 37.754 |

En los escenarios con otro precio la comisión de cobro se recalculó con la misma fórmula (5,4% más US$ 0,30).

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

Fixed costs: $7,432 a month (Costos fijos de toda la empresa (punto medio del rango del fundador: S/ 15.000 a 40.000, a S/ 3,70) $7,432).

- **Break-even: 105 cliente-mess a day.** Below that you lose money every month.
- **Profit margin at your plan** (43 a day): **-128%** of every sale, after every cost.

### Year 1, month by month

| month | cliente-mess a day | revenue | profit | cumulative (after $0 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | $237 | -$7,218 | -$7,218 |
| 2 | 5 | $395 | -$7,075 | -$14,293 |
| 3 | 7 | $553 | -$6,932 | -$21,225 |
| 4 | 10 | $790 | -$6,718 | -$27,942 |
| 5 | 13 | $1,027 | -$6,503 | -$34,446 |
| 6 | 16 | $1,264 | -$6,289 | -$40,735 |
| 7 | 20 | $1,580 | -$6,003 | -$46,738 |
| 8 | 24 | $1,896 | -$5,718 | -$52,456 |
| 9 | 28 | $2,212 | -$5,432 | -$57,888 |
| 10 | 33 | $2,607 | -$5,075 | -$62,963 |
| 11 | 38 | $3,002 | -$4,718 | -$67,680 |
| 12 | 43 | $3,397 | -$4,361 | -$72,041 |

- **Year 1 operating profit: -$72,041** on $18,960 of revenue.
- After the $0 startup spend: -$72,041.
- Startup money earned back: not within year 1.
- Cash you need before it pays for itself: **$72,041**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | -128% | 105 | -$72,041 |
| Price -10% | -154% | 117 | -$73,937 |
| Volume -20% | -183% | 105 | -$75,469 |
| Unit costs +15% | -130% | 106 | -$72,313 |

### Red flags

- Year 1 loses money on operations (-$72,041).
- The startup spend is not earned back within year 1.
