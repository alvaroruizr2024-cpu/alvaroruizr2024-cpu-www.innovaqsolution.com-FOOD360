# Casos de uso INNOVAQ y PANASUR: prompts listos para pegar

Cada caso dice qué skill usa, qué debe aportar el usuario y el prompt. Cambia el
producto (FOOD360, SIG360, ERP360, TPM360, HOTEL360, SALUD360, AGRO360, CATASTRO360,
PMO360), el sector y el país según corresponda.

Los prompts no inventan datos del negocio. Donde hace falta una cifra, un cliente o un
precio, lo pide.

---

## 1. marketing-psychology (instalada)

**Aporta el usuario:** el texto o la oferta a revisar. Para FOOD360 el contexto ya está
en `.claude/product-marketing.md`; para otros productos, tres líneas sobre comprador,
precio y alternativa actual.

```
Usa marketing-psychology. Revisa esta propuesta de FOOD360 para un obrador de pastelería
con dos tiendas: [pega la propuesta]. Dime los tres cambios que más subirían la
probabilidad de cierre, cada uno con el modelo que lo sustenta, el texto reescrito, la
comprobación ética y cómo lo medimos. No uses cifras de la demo como si fueran de
clientes.
```

```
Usa marketing-psychology. Tengo que presentar tres planes de [producto] a [tipo de
cliente]. Precios actuales: [precios]. Propón el orden, el ancla, qué incluye cada
plan y cuál marco como recomendado. Señala cualquier cosa que roce la urgencia falsa.
```

```
Usa marketing-psychology. El cliente dice "ya lo llevamos en Excel y nos funciona".
Dame tres respuestas para una reunión, basadas en sesgo del statu quo y costes de
cambio, sin menospreciar su forma actual de trabajar.
```

## 2. teach (instalada)

**Aporta el usuario:** para qué quiere aprenderlo y dónde debe guardarse el aula.

```
/teach Quiero que el equipo de un obrador aprenda a mantener sus escandallos en
FOOD360. Tienen 20 minutos a la semana. Crea el aula en aprendizaje/escandallos-food360/
y empieza por preguntarme qué deben ser capaces de hacer al acabar.
```

```
/teach Soy consultor nuevo en INNOVAQ y necesito dominar ISO 9001 lo suficiente para
acompañar una auditoría interna en seis semanas. Usa solo la norma y fuentes oficiales,
cítalas en cada lección y crea un glosario que luego usaremos en los informes.
```

```
/teach Quiero aprender inglés para reuniones con proveedores. Sigue donde lo dejamos.
```

## 3. chief-of-staff (instalada, beta)

**Aporta el usuario:** el objetivo, el plazo y la confirmación de dónde va la wiki. Esta
skill lanza varios agentes: conviene acordar el alcance antes.

```
/chief-of-staff Objetivo: dejar listo para demo el módulo de trazabilidad de FOOD360 en
tres semanas. Propón la wiki en docs/wiki/, dime cuántos agentes vas a usar y para qué,
y espera mi sí antes de lanzar más de tres a la vez. Nada se fusiona ni se despliega
sin mi confirmación.
```

```
/chief-of-staff Objetivo: preparar la auditoría de seguimiento ISO 45001 de [cliente]
con SIG360. Empieza por un inventario de requisitos y evidencias que faltan. Guarda
cada decisión con fecha en la wiki. No envíes nada al cliente: me lo pasas a mí.
```

## 4. anatomy (requiere instalación)

**Aporta el usuario:** la aprobación para instalarla y la idea a explicar. Sirve para
mecanismos; no para gráficas ni organigramas.

```
Usa anatomy. Quiero una figura interactiva para la web de FOOD360 que muestre el
recorrido de un lote: recepción de materia prima, almacén FEFO, producción, etiquetado
y venta. Que se pueda separar por etapas y que un control mueva el lote por el
recorrido. Tema claro y oscuro. No la publiques en ninguna galería.
```

```
Usa anatomy. Explica con una máquina cómo funciona el ciclo Planificar-Hacer-Verificar-
Actuar de un sistema de gestión, para una formación de SIG360. Entrégala también como
lámina A4 en PDF.
```

## 5. last30days (requiere instalación y, para TikTok y X, claves)

**Aporta el usuario:** la aprobación para instalarla y las claves de las fuentes que
quiera activar. Sin claves cubre Reddit, Hacker News, Polymarket y GitHub.

```
/last30days software de gestión para pastelerías y obradores en España: qué piden, de
qué se quejan y qué herramientas nombran. Tabla con fuente, fecha, cita y qué implica
para FOOD360. Di qué fuentes estaban activas y cuáles no.
```

```
/last30days facturación electrónica obligatoria para pymes en España: dudas y quejas más
repetidas en el último mes. Separa lo que es opinión de lo que cita una norma, y no des
ningún plazo legal sin enlazar la fuente oficial.
```

```
/last30days [competidor] opiniones de clientes. No incluyas nombres de nuestros clientes
en la búsqueda.
```

Los temas de búsqueda salen hacia servicios externos. No se usan como tema nombres de
clientes, cifras internas ni nada confidencial.

---

## Combinación: lanzar un módulo de un producto 360

1. `last30days` (o `agent-reach`): qué dice el sector este mes.
2. `marketing-psychology`: oferta, precios y mensajes, con el contexto de producto.
3. `anatomy`: una figura que explique el mecanismo en la página.
4. `teach`: aula de incorporación para el primer cliente.
5. `chief-of-staff`: coordina los cuatro pasos y guarda las decisiones en la wiki.

Cada paso se puede hacer por separado. El quinto solo compensa si el objetivo dura
semanas.
