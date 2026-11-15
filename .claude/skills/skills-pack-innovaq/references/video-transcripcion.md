# Transcripción del video de origen

- **Fuente:** TikTok de @antonspain.ia (en Instagram, @antonspain_ia), video vertical de
  61 segundos en español (archivo `VID-20261114-WA0036.mp4`). Los planos del presentador
  llevan la etiqueta "AI-generated" de TikTok.
- **Tema:** cinco skills de Claude poco conocidas: Chief of Staff, Anatomy, Teach,
  Marketing Psychology y Last 30 Days.
- **Método:** subtítulos grabados en la imagen, leídos fotograma a fotograma (dos por
  segundo). La transcripción por voz no fue posible: el modelo de voz no se pudo
  descargar desde el entorno. Los subtítulos aparecen palabra a palabra y algunos quedan
  tapados por la animación; lo que va entre corchetes es reconstrucción a partir del
  contexto y de lo que se ve en pantalla.

## Texto completo

> Todo el [mundo] te dice que [uses] las [skills] de Claude, pero casi todos usan las
> [mismas] que los demás. Aquí [van] 5 skills muy potentes que casi nadie conoce.
>
> La primera es Chief of Staff. [Le das] un gran [objetivo] y [pone] a trabajar a todo un
> equipo de agentes de IA en segundo [plano].
>
> La segunda [es] Anatomy. [Pídele] a Claude [que te explique alguna cosa] técnica [y, en
> vez de texto,] te monta una máquina interactiva [con la que] puedes jugar.
>
> La tercera es Teach. Dile ["quiero aprender inglés"] y se convierte [en tu profesor
> particular]. Te escribe las lecciones, [las] chuletas y recuerda [dónde lo] dejaste.
>
> La cuarta es Marketing Psychology. [Reúne] más de 50 [principios de psicología, como la
> aversión] a la pérdida o los trucos de precios, [...].
>
> Y la quinta es Last 30 Days. [Busca] en [Reddit, X, YouTube] y TikTok [cualquier tema]
> para contarte exactamente qué se [ha] dicho de él en el último mes.
>
> [Comenta "OCULTAS" y te mando] las 5 skills [con sus enlaces y cómo instalarlas].

## Lo que se ve en pantalla (cronología)

| Tiempo | Pantalla |
|--------|----------|
| 0–5 s | Rótulo "Skills" con el sello de Claude y una esfera con cubos orbitando. |
| 6–9 s | "5 skills de Claude QUE CASI NADIE CONOCE" y cinco fichas numeradas. |
| 10–11 s | "SKILL 1 DE 5 · Chief of Staff" con una línea de comandos. |
| 12–13 s | Etiqueta `chief-of-staff`. Tarjeta "UN GRAN OBJETIVO: Lanzar el curso". |
| 14–15 s | Organigrama: "Chief of Staff" arriba y cinco cajas debajo. |
| 16–17 s | "EL OBJETIVO: Lanzar el curso" y "TRABAJANDO EN SEGUNDO PLANO" con cinco agentes y su barra de avance: Buscar, Textos, Diseño, Código, Revisión. |
| 18–19 s | "SKILL 2 DE 5 · Anatomy". |
| 20–23 s | Etiqueta `anatomy`. "TÚ: Explícame cómo funciona un motor de cohete" y debajo "UNA RESPUESTA EN TEXTO". |
| 24–27 s | Ventana "Motor de cohete · INTERACTIVO" con controles Potencia, Separar piezas y Etiquetas. Piezas rotuladas: Inyector, Turbobomba, Cámara de combustión, Garganta, Tobera. |
| 28–31 s | Etiqueta `teach`. "TÚ: Quiero aprender inglés" → "CLAUDE ES AHORA Tu profesor particular" y "TU PLAN DE LECCIONES: Lección 1, Saludos". |
| 32–33 s | Dos tarjetas: "UNA LECCIÓN" y "UNA CHULETA". |
| 34–37 s | "Inglés · 3 de 6 lecciones hechas": Saludos, Números y Pedir comida completadas; "Lección 4, Pedir indicaciones · Lo dejaste a la mitad · Continuar"; pendientes El pasado y Charlar. |
| 38–39 s | "SKILL 4 DE 5 · Marketing Psychology" y el comando `marketing-psych`. |
| 40–41 s | "50+ principios de psicología": Aversión a la pérdida, Anclaje, Prueba social, Escasez, Reciprocidad, Efecto señuelo, Efecto dotación, Encuadre, Autoridad, Compromiso, Efecto Zeigarnik. |
| 42–46 s | "Aversión a la pérdida": ANTES "Consigue un 20 % dto." → DESPUÉS "No pierdas tu 20 % dto.". "Trucos de precios": 100 € frente a 99 €. Una ficha con cinco estrellas, una cuenta atrás y la etiqueta "Prueba social". |
| 46–49 s | "SKILL 5 DE 5 · Last 30 Days" y el comando `last30days`. |
| 50–53 s | "CUALQUIER TEMA: Edición de vídeo con IA" y cuatro paneles: Reddit, X, YouTube, TikTok. Barra "ÚLTIMOS 30 DÍAS". |
| 54–57 s | "Lo que se ha dicho · Últimos 30 días" con citas de Reddit, X y YouTube. |
| 58–60 s | Tarjeta "COMENTA OCULTAS · Gratis · Te lo mando por DM · LAS 5 SKILLS con sus enlaces y cómo instalarlas en Claude · Comenta OCULTAS en los comentarios de este vídeo". |
| 60–61 s | Título final: "5 skills de Claude que casi nadie conoce". |

El video no muestra ninguna URL, repositorio ni comando de instalación. Los únicos datos
exactos son los nombres en pantalla: `chief-of-staff`, `anatomy`, `teach`,
`marketing-psych` y `last30days`.

## Lo que el video afirma y cómo lo verifica esta skill

Contraste hecho el 15-11-2026 contra los repositorios clonados ese día. Commits en
`fuentes.md`.

| Afirmación del video | Verificación contra la fuente |
|----------------------|-------------------------------|
| "Chief of Staff: le das un gran objetivo y pone a trabajar a todo un equipo de agentes de IA en segundo plano." | **Cierto con condiciones.** `mattpocock/skills` → `skills/in-progress/chief-of-staff`: "All work should be done in subagents" y "Use background agents". Es beta y su autor avisa de que puede cambiar o desaparecer. No trae un equipo fijo: Buscar, Textos, Diseño, Código y Revisión son una ilustración del video. Sus procedimientos remiten a otras cuatro skills del autor que hay que instalar aparte. Varios agentes en paralelo consumen muchos tokens. |
| "Anatomy: pídele que te explique algo técnico y, en vez de texto, te monta una máquina interactiva con la que puedes jugar." | **Cierto con condiciones.** `wheresryan22/anatomy` construye figuras isométricas interactivas en SVG; entre sus ejemplos hay un motor de cohete. Necesita Node.js 20.10 o superior y Chrome para las comprobaciones. El autor la describe como lenta a propósito: una figura ocupa una sesión larga. Dibuja máquinas e instrumentos, no gráficas ni personas. |
| "Teach: dile 'quiero aprender inglés' y se convierte en tu profesor particular." | **Cierto.** `mattpocock/skills` → `skills/productivity/teach`. Antes de enseñar pregunta para qué quieres aprenderlo y lo anota en `MISSION.md`; el video se salta ese paso. En origen solo se activa con `/teach`. |
| "Te escribe las lecciones, las chuletas y recuerda dónde lo dejaste." | **Cierto con una condición importante.** Las lecciones son archivos HTML en `lessons/`, las chuletas en `reference/` y lo aprendido en `learning-records/`. La memoria son esos archivos: si la carpeta se pierde (por ejemplo, una sesión en la nube sin guardar), no recuerda nada. El panel "3 de 6 lecciones" es una ilustración del video; la skill no fija un número de lecciones. |
| "Marketing Psychology: más de 50 principios de psicología, como la aversión a la pérdida o los trucos de precios." | **Cierto, y se queda corto.** `coreyhaines31/marketingskills` → `skills/marketing-psychology` v2.0.3 tiene 72 modelos, con un bloque de psicología de precios. Es un catálogo con aplicaciones; no reescribe una página por sí sola. El nombre real es `marketing-psychology`, no `marketing-psych`. |
| "Last 30 Days: busca en Reddit, X, YouTube y TikTok cualquier tema." | **Cierto con condiciones.** `mvanhorn/last30days-skill` v3.39.0. Reddit funciona sin configurar. X pide un token de la API, una sesión de navegador o una clave de terceros. YouTube pide `yt-dlp`. TikTok pide una clave de ScrapeCreators (10 000 llamadas gratis y después de pago). Necesita Python 3.12 o superior. |
| "Para contarte exactamente qué se ha dicho de él en el último mes." | **Exagerado.** Entrega una síntesis ordenada por interacción (votos, me gusta, transcripciones) con citas, limitada a las fuentes que estén activas. No es un registro completo. |
| "Comenta OCULTAS y te mando las 5 skills con sus enlaces." | **No verificable.** No se vio la lista del autor. Las cinco se localizaron por el nombre que aparece en pantalla y por el comportamiento descrito. `anatomy`, `marketing-psychology` y `last30days` tienen nombre inequívoco. `chief-of-staff` y `teach` son nombres que usan varios repositorios; se eligieron las de Matt Pocock porque son las que hacen lo que el video describe (subagentes en segundo plano; lecciones, chuletas y registro de avance). |

## Lo que el video omite

- Las cinco son de terceros, no de Anthropic, y de cuatro autores distintos.
- Dos de ellas (`anatomy` y `last30days`) instalan programas, no solo instrucciones.
- `last30days` depende de claves y de una de pago para TikTok.
- `chief-of-staff` es beta.
- Ninguna licencia ni requisito aparece en pantalla. Las cinco son MIT.
