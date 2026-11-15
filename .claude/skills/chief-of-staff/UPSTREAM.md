# Origen de esta skill

| Dato | Valor |
|------|-------|
| Autor | Matt Pocock |
| Repositorio | https://github.com/mattpocock/skills |
| Ruta | `skills/in-progress/chief-of-staff/SKILL.md` |
| Commit copiado | `5863806dd4e15c63174bee4e7515a4256792ecfa` (12-11-2026) |
| Licencia | MIT, copia en `LICENSE` |
| Estado en origen | Beta ("in-progress"): fuera del plugin oficial, puede cambiar o desaparecer |

## Qué se cambió respecto al original

1. **Frontmatter.** El original lleva `disable-model-invocation: true` (solo se activa
   cuando el usuario escribe `/chief-of-staff`). El empaquetador de skills de claude.ai
   no acepta esa clave, así que se quitó y la descripción se reescribió en español
   pidiendo activación solo bajo pedido explícito. Se añadieron `license` y `metadata`.
   Si la skill se usa únicamente en Claude Code y se quiere el comportamiento original,
   basta con volver a añadir `disable-model-invocation: true`.
2. **Cuerpo.** Sin cambios: es el texto del commit indicado, byte a byte.
3. **Sección "Adaptación INNOVAQ".** Añadida al final, detrás de un comentario HTML que
   marca dónde termina el original.
4. **No se copió** `agents/openai.yaml`, que solo sirve a Codex.

## Dependencias del original que no se instalaron

La sección "Procedures" remite a `retro`, `to-spec`, `to-tickets` e `implement-spec`
(en `skills/engineering/` del mismo repositorio), que a su vez piden
`/setup-matt-pocock-skills`, `writing-for-agents`, `tdd` y `code-review`. No se
instalaron: el video solo muestra `chief-of-staff`. La adaptación indica qué hacer
cuando esas rutas no existen.

## Cómo actualizar

1. Descarga la versión vigente:
   `curl -sL https://raw.githubusercontent.com/mattpocock/skills/main/skills/in-progress/chief-of-staff/SKILL.md`
2. Léela entera antes de copiarla. Es texto que Claude va a obedecer.
3. Sustituye solo el cuerpo (entre el frontmatter y el comentario de adaptación) y
   actualiza `upstream-commit` y `upstream-date` aquí y en el frontmatter.
