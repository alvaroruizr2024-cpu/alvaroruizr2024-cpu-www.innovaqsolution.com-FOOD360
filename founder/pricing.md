# Precios de SIG 360°

Se apoya en tres cosas que se pueden comprobar: lo que dijeron los compradores ([`pricing-curve.md`](pricing-curve.md), 20 respuestas simuladas), lo que cobran los competidores ([`competitors.md`](competitors.md), datos de búsqueda) y lo que la empresa necesita ganar (la herramienta del CFO sobre [`numbers.json`](numbers.json)). Las respuestas de compradores simulados sirven para elegir qué probar; no son una prueba.

## Lo esencial

- **El precio no es el problema.** Ninguno de los 20 compradores simulados dio el precio como razón para no comprar, y cuatro lo dijeron expresamente ("el precio no es el problema, es el cambio").
- **Mantenga US$ 79 en el plan Inicial.** Bajarlo no responde a ninguna de las objeciones y aleja el punto de equilibrio de 19 a 26 clientes.
- **El dinero está en el escalón siguiente, que hoy no existe:** un paquete de software más acompañamiento cerca de US$ 200 al mes. Con ese ingreso por cliente el equilibrio baja de 19 a 8 clientes. Hay que construirlo y probarlo con contratistas reales antes de darlo por bueno.

## 1. El precio, y por qué

### Lo que dijeron los compradores

| Punto | Precio al mes | Qué significa |
| --- | ---: | --- |
| Demasiado barato | US$ 29,70 | Por debajo, demasiados piensan que no puede ser bueno |
| Menor resistencia | US$ 30,54 | Tantos lo ven muy barato como muy caro |
| Indiferencia | US$ 60,67 | Tantos lo llaman ganga como lo llaman caro |
| Demasiado caro | US$ 110,90 | Por encima, demasiados ya no compran |

Rango aceptable: **US$ 29,70 a US$ 110,90**. Respuestas medianas: muy barato US$ 15; ganga US$ 40; empieza a ser caro US$ 99; no lo compro US$ 150.

Cómo quedan los precios de hoy frente a las 20 respuestas:

| Precio | "Ya me parece caro" | "A ese precio no compro" | "Tan barato que desconfío" |
| --- | ---: | ---: | ---: |
| US$ 29 (plan MYPE) | 0 | 0 | 4 |
| US$ 39 | 0 | 0 | 0 |
| **US$ 79 (plan Inicial)** | 6 | 0 | 0 |
| US$ 99 | 11 | 3 | 0 |
| US$ 179 (plan Profesional) | 17 | 13 | 0 |

Los compradores respondieron mirando el plan de 10 usuarios. Los cuatro gerentes de empresas de 200 a 300 trabajadores pusieron su límite entre US$ 250 y 400, así que para ellos US$ 179 es caro pero no imposible.

### Lo que cobran los competidores

Para una empresa de hasta 10 usuarios, entre los que publican precio: US$ 79 (ISOwin, por cada norma), US$ 238 (Kawak, usuarios ilimitados), US$ 240 (Mitti, 10 puestos) y unos US$ 280 (Isolución, dato antiguo). Seleria, ISOTools Perú y Zyght no publican precio. El sustituto más usado, un servicio externo de SSOMA, cuesta desde S/ 750 al mes más IGV (unos US$ 203).

### Lo que la empresa necesita

Resultados de la herramienta del CFO, con costos fijos de US$ 1.351 al mes (el tope de S/ 5.000 que indicó el fundador):

| Precio al mes | Lo que deja cada cliente | Clientes para cubrir los costos fijos |
| ---: | ---: | ---: |
| US$ 29 | US$ 24,13 | 56 |
| US$ 39 | US$ 33,59 | 41 |
| US$ 59 | US$ 52,51 | 26 |
| **US$ 79** | **US$ 71,43** | **19** |
| US$ 99 | US$ 90,35 | 15 |
| US$ 179 | US$ 166,03 | 9 |
| US$ 200 | US$ 185,90 | 8 |

### La decisión

**Plan Inicial: US$ 79 al mes, sin cambios.** Está dentro del rango aceptable, iguala al competidor publicado más barato y nadie lo rechazó por caro. No lo baje: a US$ 59 harían falta 26 clientes en lugar de 19 para cubrir los mismos costos, el año pasaría de ganar US$ 931 a perder US$ 3.610 y no se resuelve ninguna objeción. Subirlo a US$ 99 bajaría el equilibrio a 15 clientes, pero 11 de 20 ya lo sienten caro; es una prueba para hacer con compradores reales, no una decisión para tomar hoy.

## 2. La escalera

| Escalón | Qué es | Precio | Por qué subir |
| --- | --- | --- | --- |
| Entrada | SIG 360° para 3 usuarios y 1 sede | Hoy US$ 29. **Probar US$ 39** | US$ 29 queda por debajo de la línea de "demasiado barato" (4 de 20 desconfían) y exige 56 clientes para cubrir los costos, casi el triple que el plan Inicial |
| Bueno | SIG 360° Inicial, 10 usuarios y 1 sede | **US$ 79** | El plan de referencia |
| Mejor | SIG 360° más acompañamiento: la empresa carga los documentos y registros del cliente y una persona con nombre lo acompaña hasta la auditoría | **Probar US$ 199 y US$ 249 al mes** | Responde a lo que pidieron 10 de 20 (que les carguen sus registros). Queda al nivel del servicio externo más barato (unos US$ 203 más IGV) y baja el equilibrio a 8 clientes |
| Completo | Implementación ISO o del sistema de la Ley 29783 como proyecto cerrado | Por cotización, publicando un "desde" | El comprador ya paga entre S/ 12.000 y 35.000 por esto a un consultor (una sola fuente) |

Dos arreglos en la escalera actual:

- **El salto de 10 a 50 usuarios.** Siete de 20 dijeron o temieron que 10 usuarios y 1 sede no les alcancen, y que pasar a US$ 179 "ya es otra conversación con gerencia". Opciones para probar: no contar como usuarios a los supervisores de campo que solo registran, o un plan intermedio.
- **El plan Empresarial (US$ 349).** Cuesta 47% más que Kawak (US$ 238 con usuarios ilimitados y 346 reseñas, según resultados de búsqueda). O baja hasta ese nivel, o incluye un servicio que Kawak no da.

El escalón "Mejor" no se puede dar por bueno todavía. Con la oferta actual (solo software), 15 de 20 compradores no pagarían US$ 199. Falta describir el paquete, calcular cuánto cuesta entregarlo y volver a probarlo; eso lo hace `/founder-offer`.

## 3. La oferta de apertura

Sin descuentos, para no enseñar al comprador a esperar rebajas: **carga inicial de documentos y registros incluida para los primeros 5 contratistas que contraten el plan anual, hasta el 31 de enero de 2027.** El límite es real porque depende de las horas del equipo. El número y la fecha son una propuesta; fíjelos según su capacidad y verifique con el CFO cuánto cuesta cada carga antes de prometerla.

No use un precio tachado ("antes US$ X") que nunca se cobró. El sitio dice hoy "PRECIO DE LANZAMIENTO" y "precios exclusivos por tiempo limitado" sin fecha de cierre: póngale fecha o retírelo.

## 4. Qué probar con compradores reales

1. **US$ 79 frente a US$ 99 en el plan Inicial.** Dos páginas idénticas salvo el precio, durante cuatro semanas. Mida cuántos inician la prueba y cuántos pagan al terminarla.
2. **US$ 199 frente a US$ 249 en el paquete con acompañamiento.** Tres pilotos pagados a cada precio con contratistas que tengan una auditoría con fecha.
3. **US$ 29 frente a US$ 39 en el plan de entrada**, con el mismo método que el punto 1.

Antes de cualquier prueba, resuelva dos cosas que hoy confunden la lectura del precio:

- **IGV.** El sitio no dice si los precios lo incluyen. Con 18%, US$ 79 serían US$ 93,22, todavía dentro del rango aceptable.
- **Moneda.** Tres de 20 mencionaron como molestia que sea "una mensualidad en dólares". Muestre el precio en soles primero.

Y corrija el descuento anual: el sitio anuncia 20% y el precio publicado (10 meses por 12) equivale a 16,7%.

## 5. Las objeciones de precio del panel, en sus palabras

Son respuestas de compradores simulados. Sirven para investigar; no se pueden usar como testimonios.

1. **No es el precio, es el cambio.** "El problema no es el precio al mes, es el tiempo que toma implementarlo: quién carga todos mis documentos al sistema, cuántas semanas demora, y si lo que salga de ahí me lo va a aceptar el inspector y mi cliente igual que lo que ya tengo." (P006)
2. **El salto al plan de US$ 179.** "Con 10 usuarios no cubro a mi gente, tendría que pedir el plan de US$ 179 y eso ya lo tiene que aprobar gerencia, que hoy ve que el Excel 'funciona'." (P011)
3. **Miedo a que suba o a que la empresa desaparezca.** "Si subo todos mis procedimientos, IPERC y registros ahí y luego suben el precio o la empresa desaparece, me quedo sin sistema en plena auditoría o licitación y sin saber cómo sacar mi información." (P002)

## Siguiente paso

`/founder-offer` arma el paquete del escalón "Mejor" y lo vuelve a pasar por el panel. Si el precio cambia, actualice `numbers.json` y vuelva a correr `/founder-cfo`.
