# Origen de esta skill

| Dato | Valor |
|------|-------|
| Autor | Corey Haines |
| Repositorio | https://github.com/coreyhaines31/marketingskills |
| Ruta | `skills/marketing-psychology/SKILL.md` |
| Versión | 2.0.3 |
| Commit copiado | `1f837447b20bb6f0e72d87b80ece1c221c362c7d` (11-11-2026) |
| Licencia | MIT, copia en `LICENSE` |

## Qué se cambió respecto al original

1. **Frontmatter.** La descripción original está en inglés y remite a otras skills del
   mismo repositorio ("For a page, see cro. For pricing tactics, see pricing. For copy,
   see copywriting."). Se reescribió en español con las frases que deben activarla y sin
   esas remisiones, porque aquí esas skills no están. Se añadieron `license` y los datos
   de origen dentro de `metadata`.
2. **Cuerpo.** Sin cambios: es el texto del commit indicado, byte a byte. Contiene 72
   modelos en seis bloques, una tabla de referencia rápida y cinco preguntas de
   diagnóstico.
3. **Sección "Adaptación INNOVAQ".** Añadida al final, detrás de un comentario HTML que
   marca dónde termina el original.
4. **No se copió** `evals/evals.json`, que son las pruebas del autor.

## Archivo de contexto que lee

Antes de recomendar, la skill busca `.agents/product-marketing.md` o
`.claude/product-marketing.md`. En este repositorio existe el segundo, con lo que se
sabe de FOOD360 y lo que falta por completar.

## Skills hermanas que no se instalaron

`cro`, `copywriting`, `popups`, `pricing`, `ab-testing` y `product-marketing` (la que
ayuda a escribir el archivo de contexto). Se instalan desde el mismo repositorio con
`npx skills add https://github.com/coreyhaines31/marketingskills --skill <nombre>`,
previa aprobación.

## Cómo actualizar

1. Descarga la versión vigente:
   `curl -sL https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/marketing-psychology/SKILL.md`
2. Léela entera antes de copiarla. Es texto que Claude va a obedecer.
3. Sustituye solo el cuerpo (entre el frontmatter y el comentario de adaptación) y
   actualiza `version`, `upstream-commit` y `upstream-date` aquí y en el frontmatter.
