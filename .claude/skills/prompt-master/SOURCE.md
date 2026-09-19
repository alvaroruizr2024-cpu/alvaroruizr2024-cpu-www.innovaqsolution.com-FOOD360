# prompt-master — origen

Skill vendorizado desde https://github.com/nidhinjs/prompt-master (licencia MIT).

- Versión del skill: 1.8.0
- Commit upstream: 2bd92518e26bf659e21e3d9ab90573fcf3ddeccb (2026-08-24)
- Archivos copiados: `SKILL.md`, `references/templates.md`, `references/patterns.md`, `LICENSE`

## Uso

Claude Code carga automáticamente los skills de `.claude/skills/` del proyecto.
Se activa cuando se pide explícitamente escribir, mejorar o adaptar un prompt
para una herramienta de IA (Claude, ChatGPT, Cursor, Midjourney, etc.), o
invocándolo con `/prompt-master`.

## Actualizar

```bash
git clone --depth 1 https://github.com/nidhinjs/prompt-master.git /tmp/prompt-master
cp /tmp/prompt-master/SKILL.md /tmp/prompt-master/LICENSE .claude/skills/prompt-master/
cp /tmp/prompt-master/references/*.md .claude/skills/prompt-master/references/
```
