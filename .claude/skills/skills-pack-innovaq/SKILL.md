---
name: skills-pack-innovaq
description: Guía y mantenimiento del pack de cinco skills de terceros que INNOVAQ adoptó desde un video (chief-of-staff, anatomy, teach, marketing-psychology y last30days). Dice cuál usar para cada pedido, cuáles están instaladas y cuáles requieren instalación aprobada, y cómo instalar, actualizar o quitar cada una fijada a un commit revisado. Úsala cuando el usuario pregunte "qué skill uso para…", "las skills del video", "las 5 skills ocultas", "instala anatomy", "instala last30days", "actualiza las skills de terceros", "de dónde salió esta skill" o "qué necesita last30days para TikTok o X", cuando pida una figura o máquina interactiva que explique algo técnico y anatomy no esté instalada, o cuando pida qué se dijo de un tema en el último mes y last30days no esté instalada. También para aplicar el pack a FOOD360, SIG360, ERP360 y PANASUR. Use for choosing, installing, updating or auditing the third-party skill pack.
license: MIT
---

# Pack de skills INNOVAQ: cinco skills de terceros, localizadas y fijadas

Esta skill nace de un video (TikTok de @antonspain.ia, "5 skills de Claude que casi nadie
conoce"). El video nombra cinco skills y no da enlaces: pide comentar "OCULTAS" para
recibirlos por mensaje directo. Aquí están localizadas en sus repositorios, contrastadas
con la fuente y aplicadas a INNOVAQ Solutions, con lo que el video omite: licencias,
requisitos, claves de pago y qué parte es demostración. La transcripción y la tabla de
verificación están en `references/video-transcripcion.md`.

---

## 0. Las cinco skills y su estado

| Skill | Qué hace | Origen | Cómo se instala |
|-------|----------|--------|----------------------------|
| `chief-of-staff` | Persigue un objetivo grande coordinando subagentes en segundo plano, con wiki de memoria | mattpocock/skills (beta) | Solo texto: skill `chief-of-staff` del pack |
| `teach` | Profesor particular con aula persistente: misión, lecciones, chuletas, registros | mattpocock/skills | Solo texto: skill `teach` del pack |
| `marketing-psychology` | 72 modelos mentales y sesgos aplicados a marketing, precios y ventas | coreyhaines31/marketingskills | Solo texto: skill `marketing-psychology` del pack |
| `anatomy` | Figuras isométricas interactivas en SVG que explican una idea técnica como una máquina | wheresryan22/anatomy | **Aparte y con aprobación**: lleva código Node; ver sección 2 |
| `last30days` | Investiga qué se dijo de un tema en 30 días en Reddit, X, YouTube, TikTok y más | mvanhorn/last30days-skill | **Aparte y con aprobación**: lleva un motor Python y usa claves; ver sección 2 |

Las cinco son de licencia MIT. Las tres primeras son solo texto: se leyeron enteras y se
copiaron sin tocar el cuerpo, con una sección "Adaptación INNOVAQ" al final. En el
repositorio de FOOD360 están en `.claude/skills/`. Las otras dos son programas (40 y
65 MB de repositorio) y no se copiaron a un repositorio de producto: se instalan aparte,
con aprobación, desde un commit fijado. Qué hay instalado en esta máquina lo dice el
paso 1 de la sección 2.

Commits, rutas y comandos oficiales: `references/fuentes.md`.

## 1. Qué skill para cada pedido

| El usuario pide | Skill | Antes de empezar |
|-----------------|-------|------------------|
| "Lleva tú este objetivo", "coordina agentes para lanzar X" | `chief-of-staff` | Solo bajo pedido explícito. Acordar dónde va la wiki. |
| "Quiero aprender X", "hazme un curso de X", "siguiente lección" | `teach` | Preguntar para qué lo quiere aprender y dónde vive el aula. |
| "Por qué no compran", "cómo presento el precio", "mejora esta propuesta" | `marketing-psychology` | Leer `.claude/product-marketing.md`. |
| "Explícame cómo funciona X con algo visual", "figura isométrica", "diagrama interactivo" | `anatomy` | Comprobar que está instalada (sección 2). |
| "Qué se dice de X", "qué opinan de la competencia este mes" | `last30days` | Comprobar que está instalada y qué fuentes tiene activas. |

Cuando el pedido cae en `anatomy` o `last30days` y no están instaladas, dilo en una línea,
ofrece instalarla y, mientras tanto, resuelve con lo que haya:

- En lugar de `anatomy`: una página HTML interactiva hecha a mano (controles, piezas
  etiquetadas, vista explosionada). Será más sencilla que una figura del kit; dilo.
- En lugar de `last30days`: `agent-reach` o `deep-research` si están disponibles, o la
  búsqueda web con ventana de 30 días. Sin claves no hay TikTok ni búsqueda en X; dilo
  en vez de presentar un informe parcial como completo.

## 2. Instalar `anatomy` y `last30days`

Las dos traen programas que Claude ejecutará en la máquina del usuario. Instalar exige un
sí explícito del usuario en esa conversación; un sí antiguo no vale.

### Paso 1. Ver qué hay

```bash
bash scripts/instalar_skill.sh estado
```

La ruta es relativa a la carpeta de esta skill (en el repositorio de FOOD360,
`.claude/skills/skills-pack-innovaq/`).

Muestra qué skills del pack están presentes, en qué carpeta, y si la máquina cumple los
requisitos (Node 20.10 o superior y Chrome para `anatomy`; Python 3.12 o superior para
`last30days`). No instala ni modifica nada.

### Paso 2. Instalar desde el commit revisado

```bash
bash scripts/instalar_skill.sh anatomy
bash scripts/instalar_skill.sh last30days
```

Descarga el commit fijado en `references/fuentes.md`, comprueba que es ese, y copia la
skill a `~/.claude/skills/<nombre>`. No ejecuta nada de lo descargado. Con `--dest DIR`
instala en otra carpeta y con `--ultimo` toma la rama principal en vez del commit
fijado (solo después de revisar qué cambió).

La vía oficial de cada autor también vale, y se actualiza sola, pero no fija versión:

| Skill | Comando oficial |
|-------|-----------------|
| `anatomy` | `npx skills add wheresryan22/anatomy -g -a claude-code` |
| `last30days` | `/plugin marketplace add mvanhorn/last30days-skill` y después `/plugin install last30days` |

No uses las dos vías a la vez: Claude Code no deduplica y la skill aparecería dos veces.

### Paso 3. Lo que solo puede aportar el usuario

- **`anatomy`**: nada. No pide claves ni `npm install`. Una figura es una sesión larga
  de construcción y comprobaciones, no una respuesta inmediata.
- **`last30days`**: Reddit, Hacker News, Polymarket y GitHub funcionan sin configurar.
  El resto depende del usuario:

  | Fuente | Qué hace falta | Coste |
  |--------|----------------|-------|
  | X | Token de la API de X, sesión iniciada en x.com en un navegador, o clave de xAI o Xquik | Según la vía |
  | YouTube | `yt-dlp` instalado | Gratis |
  | TikTok, Instagram, Threads, LinkedIn | Clave de ScrapeCreators | 10 000 llamadas gratis, luego de pago |
  | Búsqueda web | Clave de Brave (opcional) | 2 000 consultas gratis al mes |

  Las claves se piden con el formulario seguro de credenciales del entorno o las pone el
  usuario en `~/.config/last30days/.env`. Nunca se pegan en el chat ni se guardan en el
  repositorio. La primera ejecución abre un asistente que puede instalar utilidades
  adicionales y pedir leer cookies del navegador: cada paso necesita un sí; un silencio
  no es consentimiento.

En una sesión en la nube, lo instalado en `~/.claude/skills` desaparece al cerrar el
contenedor. Para tenerlas siempre, el usuario las guarda en su perfil de claude.ai o las
añade al script de arranque del entorno.

## 3. Casos INNOVAQ / PANASUR

- **Lanzamiento de un módulo de FOOD360**: `last30days` para saber qué piden los
  obradores, `marketing-psychology` para la oferta y la página, `anatomy` para una figura
  del flujo de un lote, `teach` para formar al cliente y `chief-of-staff` para coordinar
  todo con una wiki de decisiones.
- **Propuesta de consultoría o auditoría**: `marketing-psychology` revisa cómo se
  presenta el precio y el riesgo de no actuar, sin alarmismo.
- **Incorporación de consultores y clientes**: un aula de `teach` por tema, con glosario
  único.

Prompts listos para pegar, por producto: `references/casos-innovaq.md`.

## 4. Mantener, actualizar, quitar

- **Actualizar una de las tres de texto**: sigue el `UPSTREAM.md` de su carpeta. Se
  descarga la versión vigente, se lee entera, se sustituye solo el cuerpo y se anota el
  commit nuevo. Es texto que Claude obedece; no se actualiza a ciegas.
- **Actualizar `anatomy` o `last30days`**: revisa el registro de cambios del autor,
  cambia el commit en `scripts/instalar_skill.sh` y en `references/fuentes.md`, y
  reinstala.
- **Quitar**: borra la carpeta de la skill. `last30days` guarda además su configuración
  en `~/.config/last30days/`.
- **Diagnóstico**: `instalar_skill.sh estado`. Si una skill instalada no aparece en la
  lista de la sesión, suele faltar reiniciar la sesión.

## 5. Límites que no se negocian

- No se instala código de terceros sin el sí del usuario, ni se ejecuta para "probar".
- Las claves van por el formulario de credenciales o por el archivo de configuración del
  usuario, nunca por el chat ni al repositorio.
- `anatomy` puede publicar una figura en una galería pública (`scripts/publish.mjs`).
  Nada de un cliente ni interno de INNOVAQ se publica ahí sin autorización expresa.
- `last30days` envía el tema de la búsqueda a cada fuente y al buscador. No se le pasan
  nombres de clientes ni datos confidenciales como tema.
- Lo que digan las redes es materia prima, no un hecho: un informe de `last30days` cita
  la fuente y la fecha de cada afirmación.
- La identificación de `chief-of-staff` y `teach` se hizo por nombre y comportamiento,
  porque el video no enlaza nada. Si el autor del video apuntaba a otros repositorios,
  se corrige en `references/fuentes.md`.

## Archivos de esta skill

| Archivo | Cuándo leerlo |
|---------|---------------|
| `references/fuentes.md` | Para saber de dónde sale cada skill, su commit, licencia, requisitos y comando oficial. |
| `references/video-transcripcion.md` | Para ver qué dice y muestra el video y cómo se contrastó cada afirmación. |
| `references/casos-innovaq.md` | Para aplicar el pack a un producto o servicio concreto con prompts listos. |
| `scripts/instalar_skill.sh` | Para ver el estado del pack o instalar `anatomy` y `last30days` desde el commit fijado. |
