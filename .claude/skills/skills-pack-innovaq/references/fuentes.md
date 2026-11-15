# Fuentes del pack

Estado al 15-11-2026. Las herramientas cambian de un mes a otro: antes de actualizar,
descarga la versión vigente y compárala con el commit anotado aquí.

## Resumen

| Skill | Repositorio y ruta | Commit revisado | Fecha del commit | Licencia | Instalada aquí |
|-------|--------------------|-----------------|------------------|----------|----------------|
| `chief-of-staff` | `mattpocock/skills`, `skills/in-progress/chief-of-staff/` | `5863806dd4e15c63174bee4e7515a4256792ecfa` | 12-11-2026 | MIT | Sí, copia de texto |
| `teach` | `mattpocock/skills`, `skills/productivity/teach/` | `5863806dd4e15c63174bee4e7515a4256792ecfa` | 12-11-2026 | MIT | Sí, copia de texto |
| `marketing-psychology` | `coreyhaines31/marketingskills`, `skills/marketing-psychology/` (v2.0.3) | `1f837447b20bb6f0e72d87b80ece1c221c362c7d` | 11-11-2026 | MIT | Sí, copia de texto |
| `anatomy` | `wheresryan22/anatomy`, raíz del repositorio | `1482e8469b0a9e0d8cc18ea2740a01423d29ae80` | 18-10-2026 | MIT | No, instalador |
| `last30days` | `mvanhorn/last30days-skill`, `skills/last30days/` (v3.39.0) | `f0876504bdfcada40fcf5a4a3ada014c9408b9ed` | 14-11-2026 | MIT | No, instalador |

## chief-of-staff

- **Qué es:** una página de instrucciones (unas 70 líneas). Pone a Claude como
  responsable directo de un objetivo largo: todo el trabajo va en subagentes en segundo
  plano, se proponen rutinas programadas y la memoria se guarda en una wiki de Markdown
  con afirmaciones fechadas.
- **Estado en origen:** beta. El README de `skills/in-progress/` dice que estas skills
  quedan fuera del plugin, no tienen documentación y pueden cambiar o desaparecer.
- **Instalación oficial:** `npx skills@latest add mattpocock/skills --skill=chief-of-staff`.
- **Requisitos:** un entorno que permita subagentes en segundo plano. Sus
  "procedimientos" remiten a otras skills del mismo autor que no se instalaron.
- **Otras skills con el mismo nombre** que aparecieron en la búsqueda y se descartaron
  por su descripción (no se clonaron), al no coincidir con lo que muestra el video: `alirezarezvani/claude-skills` (reparte preguntas entre asesores de
  dirección), `affaan-m/everything-claude-code` (clasifica correo y mensajes) y
  `jdpolasky/ai-chief-of-staff` (asistente personal sobre Obsidian).

## teach

- **Qué es:** instrucciones más cuatro plantillas de formato. Trata una carpeta como
  aula: `MISSION.md`, `lessons/*.html`, `reference/*.html` (las chuletas),
  `learning-records/*.md`, `RESOURCES.md`, `GLOSSARY.md`, `NOTES.md` y `assets/`.
- **Estado en origen:** estable; figura en el README y en `plugin.json`.
- **Instalación oficial:** `claude plugin install mattpocock-skills@claude-plugins-official`
  (trae todas las skills del autor) o `npx skills@latest add mattpocock/skills`.
- **Requisitos:** ninguno. La memoria son los archivos del aula.
- **Otras candidatas que aparecieron en la búsqueda y se descartaron por su descripción
  (no se clonaron):** `mustafa-hidiroglu/claude-teacher-skill`,
  `briannajzhang/personal-tutor` y `alexknowshtml/claude-skills` (esta última repasa una
  sesión de programación, no enseña un tema).

## marketing-psychology

- **Qué es:** un catálogo de 72 modelos en seis bloques (pensamiento, comprador,
  persuasión, precios, diseño y entrega, crecimiento), con una tabla de "problema →
  modelos" y cinco preguntas de diagnóstico.
- **Instalación oficial:**
  `npx skills add https://github.com/coreyhaines31/marketingskills --skill marketing-psychology`.
- **Requisitos:** ninguno. Lee `.agents/product-marketing.md` o
  `.claude/product-marketing.md` si existen.
- **En pantalla el video la llama `marketing-psych`;** el nombre real es
  `marketing-psychology`.

## anatomy

- **Qué es:** instrucciones, diez documentos de referencia, un kit de dibujo en
  JavaScript (`kit/`), programas de comprobación en Node (`scripts/`) y ejemplos
  completos (`examples/`, entre ellos un motor de cohete como el del video). Construye
  figuras isométricas interactivas en SVG, con WebGL y 3D opcionales, y las imprime en
  PDF.
- **Instalación oficial:** `npx skills add wheresryan22/anatomy -g -a claude-code`, o
  `git clone https://github.com/wheresryan22/anatomy.git ~/.claude/skills/anatomy`.
- **Requisitos:** Node.js 20.10 o superior y Chrome o Chromium para las comprobaciones.
  Sin claves y sin `npm install`. React 18 solo si la salida es React.
- **Límites que declara el autor:** no es una librería de gráficas; dibuja máquinas,
  instrumentos, herramientas y muebles, no personas ni mapas; es lenta a propósito (una
  figura ocupa una sesión larga).
- **Cuidado:** `scripts/publish.mjs` envía una figura a la galería pública
  `wheresryan22/anatomy-community` mediante una pull request. El propio autor indica
  que solo se usa si el usuario lo pide. Los programas que abren Chrome lo hacen con
  acceso a archivos locales: solo sobre páginas propias.
- **Por qué no se copió al repositorio:** 40 MB con ejemplos, y es código ejecutable de
  terceros que no se auditó línea a línea.

## last30days

- **Qué es:** instrucciones y un motor de investigación en Python (unas 82 000 líneas)
  que consulta varias fuentes en paralelo, puntúa por interacción real y sintetiza un
  informe con citas.
- **Instalación oficial en Claude Code:** `/plugin marketplace add mvanhorn/last30days-skill`
  y `/plugin install last30days`. Alternativa: `npx skills add mvanhorn/last30days-skill -g -a claude-code`.
  Para claude.ai el autor genera el paquete con `bash skills/last30days/scripts/build-skill.sh`.
- **Requisitos:** Python 3.12 o superior.
- **Fuentes sin configurar:** Reddit con comentarios, Hacker News, Polymarket, GitHub.
- **Fuentes que piden algo al usuario:** X (token de la API, sesión de navegador o clave
  de xAI o Xquik), YouTube (`yt-dlp`), TikTok, Instagram, Threads, Pinterest y LinkedIn
  (clave de ScrapeCreators, 10 000 llamadas gratis y después pago por uso), búsqueda web
  (clave de Brave opcional; sin ella usa DuckDuckGo y Startpage).
- **Qué toca, según su `SECURITY.md`:** no tiene telemetría; el tema de la búsqueda se
  envía a cada fuente activa y al buscador; si el tema parece una empresa o una persona,
  también a Wikidata. La configuración vive en `~/.config/last30days/.env`.
- **Solapamiento:** INNOVAQ ya tiene `agent-reach` para leer estas plataformas. La
  diferencia es que `last30days` busca, puntúa y resume un tema en una sola orden.
- **Por qué no se copió al repositorio:** 18 MB de carpeta de skill y un motor que
  maneja credenciales; no se auditó línea a línea ni se ejecutó.

## Qué se validó y qué no

| Comprobación | Resultado |
|--------------|-----------|
| Los cinco repositorios existen y son públicos | Sí, clonados el 15-11-2026 |
| Licencia MIT en los cuatro repositorios | Sí, archivo `LICENSE` leído |
| Texto de las tres skills copiadas, leído entero | Sí; sin órdenes de red, credenciales ni instrucciones ocultas |
| `instalar_skill.sh` descarga el commit fijado y copia la skill | Sí, probado en una carpeta temporal |
| Ejecución de `anatomy` o de `last30days` | **No.** No se ejecutó código de terceros |
| Auditoría línea a línea del código de `anatomy` y `last30days` | **No.** Solo se leyeron instrucciones, README y `SECURITY.md` |
| Confirmación del autor del video sobre los enlaces | **No.** El video no los muestra |
