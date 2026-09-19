# Biblioteca de prompts de una sola pasada

Todos siguen la anatomía de seis piezas de `SKILL.md §4`: entregable + canal, gancho
literal, herramienta explícita, resultado descargable, cantidad exacta, puntos exactos.
Añade la línea de marca cuando el trabajo sea de INNOVAQ o PANASUR.

## Línea de marca (pégala al final del prompt)

Lee los hex de `../assets/brand-innovaq.json` (o `../assets/brand-panasur.json`)
antes de escribirla; no los cites de memoria.

```
Marca: INNOVAQ. Fondo #0d4a6e, primario #126695, acento #F1912B, texto sobre fondo
#FFFFFF, tipografía Inter. Logo de la cuenta de Canva (Brand Kit INNOVAQ). Cierra con
el handle "innovaqsolution.com · @innovaqsolutions".
```

## 1. Carrusel de Instagram (el del video, adaptado)

```
Crea un carrusel de Instagram con el gancho "Por qué tu planta sigue perdiendo turnos
(no es lo que crees)" usando Canva con Composio. Hazlo descargable en PDF y PNG.
Incluye 5 slides con estos puntos exactos:
1) Persigues urgencias en vez de construir un plan de mantenimiento
2) Registras paradas, pero sin objetivos claros de OEE
3) Dependes de la memoria del técnico en vez de un sistema
4) Mides horas trabajadas, no disponibilidad real
Slide 5: cierre con CTA "Agenda una demo de TPM360".
[línea de marca]
```

## 2. Post único 1:1 de anuncio

```
Diseña un post cuadrado 1080x1080 para LinkedIn e Instagram usando Canva con Composio.
Titular exacto: "SIG360: tu SIG-SST en una sola pantalla". Subtítulo: "30 días gratis,
plan MYPE desde S/70". Exporta a PNG descargable. Un solo diseño, sin variantes.
[línea de marca]
```

## 3. Historia / Reel 9:16

```
Crea una historia vertical 1080x1920 en Canva con Composio, descargable en PNG.
Texto grande arriba: "¿Auditoría la próxima semana?". Texto medio: "SIG360 arma tu
evidencia en 48 horas". CTA abajo: "Desliza hacia arriba". Sin fotos de stock: solo
formas y tipografía.
[línea de marca]
```

## 4. Deck corto

```
Crea una presentación de 6 slides en Canva con Composio, descargable en PDF, titulada
"FOOD360 — trazabilidad para plantas de alimentos". Slides con estos títulos exactos:
1) El problema 2) Qué es FOOD360 3) Cómo funciona 4) Casos 5) Planes y precios
6) Siguiente paso. Rellena cada slide con máximo 3 viñetas tomadas de este texto: [pega
la descripción de PRODUCTS en global/index.html del repo www.innovaqsolution.com].
[línea de marca]
```

## 5. Flujos no visuales (mismo conector)

**Gmail — borrador, nunca envío directo:**
```
Crea un borrador en Gmail usando Composio (no lo envíes) para <cliente>, asunto exacto
"Propuesta SIG360 — <empresa>", con este cuerpo: [texto]. Devuélveme el enlace al
borrador.
```

**Notion — página de seguimiento:**
```
Crea una página en Notion con Composio dentro de la base "Clientes" titulada
"<empresa> — Onboarding SIG360" con estas secciones exactas: Contacto, Alcance,
Hitos (tabla con 4 filas: kickoff, carga de datos, capacitación, go-live), Riesgos.
```

**HubSpot — contacto y nota:**
```
En HubSpot con Composio, busca el contacto <correo>; si no existe, créalo con nombre
<nombre> y empresa <empresa>. Añade una nota con fecha de hoy: "<resumen de la
reunión>". No cambies la etapa del deal.
```

## Qué evitar

- Pedir "algo bonito" sin puntos exactos: la app decide el contenido por ti.
- Omitir la herramienta: Claude describirá el diseño en texto en vez de crearlo.
- Pedir acciones irreversibles (enviar, publicar, borrar) en el mismo prompt que la
  creación. Separa el paso y confírmalo con el usuario.
