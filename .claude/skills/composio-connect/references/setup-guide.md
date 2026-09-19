# Guía de instalación por entorno

Los textos entre comillas son los que aparecen literalmente en pantalla en el video
(septiembre de 2026). Si la interfaz cambia, busca el equivalente por función, no por
nombre exacto.

## Índice

1. claude.ai (web)
2. Claude Desktop
3. Claude Code (terminal)
4. Cowork
5. Alta y autorización en Composio
6. Conectar apps dentro de Composio
7. Comprobación final

---

## 1. claude.ai (web)

1. Abre `claude.ai/new`, pulsa tu avatar (abajo a la izquierda) → **Settings**.
2. En la barra lateral, el bloque **Customize** contiene: *Skills*, *Connectors*,
   *Plugins*, *Memory*. Entra en **Connectors**. (Arriba verás *Usage*, *Capabilities*,
   *Claude Code*, *Claude in Chrome*: no es ahí.)
3. Arriba a la derecha del panel hay un buscador y el botón **Add ▾** con dos opciones:
   - *Browse connectors*: catálogo oficial (Google Drive, Slack, etc.).
   - **Add custom connector**: la que necesitas.
4. Se abre el diálogo **"Add custom connector" (BETA)** con este texto:
   *"Connect Claude to your data and tools. Learn more about connectors or get started
   with pre-built ones."* Campos:
   - **Name**: en el video, `Composio For You`. Usa un nombre que el equipo reconozca,
     p. ej. `Composio INNOVAQ`.
   - **URL**: `https://connect.composio.dev/mcp`
   - **Advanced settings** → *OAuth Client ID (optional)* y *OAuth Client Secret
     (optional)*: déjalos vacíos. Composio usa el flujo OAuth estándar sin credenciales
     propias del cliente.
   - Aviso al pie: *"Only use connectors from developers you trust. Anthropic does not
     control which tools developers make available and cannot verify that they will work
     as intended or that they won't change."*
5. Pulsa **Add**. El conector aparece en la lista con *Type: Web · Custom* y un botón
   **Connect**. Púlsalo: se abre una ventana de Composio para autorizar. Al volver, el
   estado pasa a *Connected*.
6. En un chat nuevo, abre el selector de herramientas (icono de conectores junto al
   cuadro de texto) y comprueba que el conector está activado para esa conversación.

## 2. Claude Desktop

Idéntico a la web: **Settings → Connectors → Add custom connector**. La propia página de
Composio para Claude lo resume en 4 pasos, transcritos de pantalla:

1. *Open Connectors settings* — "In Claude Desktop, go to Settings, then click Connectors."
2. *Add the Composio MCP server* — "Click 'Add custom connector' and paste the Composio
   MCP server URL." → `https://connect.composio.dev/mcp`
3. *Authorize in your browser* — "A browser window will open automatically. Sign in to
   authorize Claude Desktop to access your Composio account."
4. *Start using Composio.*

## 3. Claude Code (terminal)

No hay menú de conectores; se registra un servidor MCP HTTP:

```bash
claude mcp add --transport http --scope user composio https://connect.composio.dev/mcp
claude mcp list          # debe aparecer "composio"
```

`scripts/mcp_add.sh` hace exactamente esto, valida el alcance y comprueba el listado.
Alcances:

| Alcance   | Dónde se guarda                  | Quién lo hereda            |
|-----------|----------------------------------|----------------------------|
| `user`    | `~/.claude.json`                 | Tú, en todos los proyectos |
| `project` | `.mcp.json` en la raíz del repo  | Todo el equipo (versionado)|
| `local`   | `~/.claude.json`, por directorio | Tú, solo en este repo      |

Después, dentro de Claude Code, ejecuta `/mcp`, elige `composio` y completa el OAuth en
el navegador. Si trabajas en un contenedor sin navegador (Claude Code en la web), el
enlace de autorización se imprime en la terminal; ábrelo desde tu máquina.

## 4. Cowork

Los conectores se administran desde la misma pantalla de *Settings → Connectors* de la
app de escritorio; sigue §2. Antes de instalar, revisa qué herramientas `mcp__*` ya
existen en la sesión: si la app está (Canva, HubSpot, Notion, Gmail, Slack, Supabase,
Vercel, Figma…), úsala directamente y omite Composio para esa app.

## 5. Alta y autorización en Composio

1. Ve a `composio.dev/for-you` (página "For You | Composio", titular *"Make your agents
   do more — Skip the heavy lifting of connecting your agent to 1,000+ apps. Stop
   configuring and start acting."*).
2. **Get started for free** → crea cuenta (correo o Google). Usa la cuenta de trabajo.
3. En la lista de clientes soportados (*Claude Code*, *Codex*, *ChatGPT*, *Cursor*,
   *Claude*…) busca **Claude** y pulsa *Install* o copia la URL del bloque MCP:
   `https://connect.composio.dev/mcp`.
4. Vuelve a Claude (§1–§3) y completa la autorización cuando se abra la ventana.

## 6. Conectar apps dentro de Composio

Panel de apps con pestañas **All / Connected / Not connected**, buscador y botones
**Connect** por app. Apps visibles en el video: Gmail, Google Calendar, Slack,
Perplexity AI, Google Docs, Airtable, Jira, Composio (activo), Notion, Supabase,
Twitter, HubSpot, Code Interpreter (activo), Firecrawl, GitHub, Google Sheets, Outlook,
Google Drive, Linear, SerpApi, Canva, Asana, Mixpanel.

Para Canva: escribe `can` en el buscador → **Canva → Connect** → autoriza con la cuenta
de Canva que tenga el Brand Kit. Repite por cada app que el trabajo necesite, y ninguna
más.

## 7. Comprobación final

En un chat nuevo pide algo trivial que obligue a usar la app, por ejemplo:
*"Lista mis 3 diseños más recientes en Canva usando Composio."* Si responde con datos
reales, está listo. Si describe lo que "haría", la app no está conectada o el conector
está desactivado en esa conversación.
