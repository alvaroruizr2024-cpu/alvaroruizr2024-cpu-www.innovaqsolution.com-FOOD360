# Origen de esta skill

| Dato | Valor |
|------|-------|
| Autor | Matt Pocock |
| Repositorio | https://github.com/mattpocock/skills |
| Ruta | `skills/productivity/teach/` |
| Commit copiado | `5863806dd4e15c63174bee4e7515a4256792ecfa` (12-11-2026) |
| Licencia | MIT, copia en `LICENSE` |
| Estado en origen | Estable: figura en el README y en el plugin oficial |

## Qué se cambió respecto al original

1. **Frontmatter.** El original lleva `disable-model-invocation: true` y
   `argument-hint: "What would you like to learn about?"`. El empaquetador de skills de
   claude.ai no acepta esas claves, así que se quitaron y la descripción se reescribió
   en español con las frases que deben activarla. Se añadieron `license` y `metadata`.
   Para recuperar el comportamiento original en Claude Code (solo con `/teach`), vuelve
   a añadir `disable-model-invocation: true`.
2. **Cuerpo de `SKILL.md`.** Sin cambios: es el texto del commit indicado, byte a byte.
3. **Archivos de formato** (`MISSION-FORMAT.md`, `LEARNING-RECORD-FORMAT.md`,
   `GLOSSARY-FORMAT.md`, `RESOURCES-FORMAT.md`). Copias exactas.
4. **Sección "Adaptación INNOVAQ".** Añadida al final de `SKILL.md`, detrás de un
   comentario HTML que marca dónde termina el original.
5. **No se copió** `agents/openai.yaml`, que solo sirve a Codex.

## Cómo actualizar

1. Descarga la carpeta vigente desde
   `https://github.com/mattpocock/skills/tree/main/skills/productivity/teach`.
2. Léela entera antes de copiarla. Es texto que Claude va a obedecer.
3. Sustituye los cuatro archivos de formato y el cuerpo de `SKILL.md` (entre el
   frontmatter y el comentario de adaptación), y actualiza `upstream-commit` y
   `upstream-date` aquí y en el frontmatter.
