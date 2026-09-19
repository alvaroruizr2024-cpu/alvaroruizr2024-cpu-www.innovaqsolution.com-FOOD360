# Origen: "Claude diseña por ti" (TikTok @revolutia.ai)

Video vertical de 42 s (576×1024, 30 fps), recibido por WhatsApp el 18-09-2026 como
`VID-20260918-WA0098.mp4`. Presentador con gorra en un estudio con plantas; pantalla
grabada arriba, subtítulos morados abajo.

## Guion (reconstruido de los subtítulos, 1 s por línea)

> Claude puede diseñar cualquier cosa sin que toques herramientas de diseño. Y se
> configura así: ve a Claude, Personalizar, luego a Conectores y luego a "Add custom
> connector" (conector personalizado). Busca este servicio que se llama Composio, crea
> tu cuenta, busca Claude en la lista y copia el enlace. Entonces vuelves, pegas el
> enlace, le pones un nombre y le das a Add. Y así de simple has conectado tu Claude a
> más de mil apps, incluyendo Canva. Eso significa que con un solo prompt Claude diseñe
> cosas para ti sin nada más. Guía completa: tenemos una comunidad con configuraciones
> como esta cada semana; ve al link de la bio para el acceso.

El audio no se pudo transcribir con Whisper en este entorno (descarga del modelo desde
huggingface.co bloqueada por la política de red), así que el guion es la unión de los
subtítulos en pantalla; las palabras entre corchetes o los conectores de frase son
inferencia.

## Pantallas y tiempos

| t (s) | Pantalla                                                                                   |
|-------|--------------------------------------------------------------------------------------------|
| 0–5   | Título "Claude diseña por ti"; presentador a cámara                                         |
| 6–8   | `claude.ai/new` → Settings → bloque *Customize*: Skills, **Connectors**, Plugins, Memory    |
| 9–11  | Panel Connectors: botón *Add ▾* → *Browse connectors* / **Add custom connector**            |
| 12–14 | `composio.dev/for-you`: "Make your agents do more", *Get started for free*                  |
| 15–17 | Lista de clientes en Composio: Claude Code, Codex, ChatGPT, Cursor, MCP; botón *Install*   |
| 18–20 | Página de Composio para Claude: 4 pasos y URL `https://connect.composio.dev/mcp`           |
| 21–23 | Diálogo *Add custom connector (BETA)*: Name `Composio For You`, URL pegada, Advanced vacío  |
| 24–25 | Panel de apps de Composio (All / Connected / Not connected), Gmail, Notion, HubSpot, Canva… |
| 26    | Buscador `can` → **Canva → Connect**                                                        |
| 27–29 | Chat de Claude con el prompt del carrusel de Instagram en Canva con Composio               |
| 30–37 | Cierre a cámara: guía completa y comunidad en el link de la bio                            |
| 38–41 | Tarjeta TikTok @revolutia.ai                                                               |

## Prompt exacto visible en pantalla (t=27 s)

> Write an Instagram carousel with the hook "why you feel stuck as a social media
> manager" (is not what you think?) using Canva with Composio. Make it downloadable.
> Include 5 slides with these exact points: 1) you're chasing trends instead of building
> strategy 2) you post consistently but without clear goals 3) you rely on inspiration
> instead of a content system 4) you measure likes not meaningful results

## Qué se verificó y qué no

- **Verificado en el video:** rutas de menú, texto del diálogo de conector personalizado,
  URL del servidor MCP, nombre de ejemplo, lista de apps de Composio, prompt.
- **No verificado desde este entorno:** `composio.dev` y `connect.composio.dev` estaban
  bloqueados por la política de egreso de la sesión, así que no se comprobó que la URL
  siga vigente ni los límites del plan gratuito. Si al instalar la URL falla, consulta
  la página de Composio para Claude y actualiza `SKILL.md §1` y `scripts/mcp_add.sh`.
- **Añadido por INNOVAQ, no del video:** la regla "conector nativo antes que Composio"
  (§0), la instalación en Claude Code (§2), la línea de marca y la sección de seguridad.
