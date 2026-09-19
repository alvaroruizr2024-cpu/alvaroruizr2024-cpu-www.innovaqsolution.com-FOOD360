#!/usr/bin/env bash
# Registra el servidor MCP de Composio en Claude Code y verifica que quedó listado.
#
# Uso:
#   bash mcp_add.sh            # alcance user   (todas tus sesiones de Claude Code)
#   bash mcp_add.sh project    # alcance project (.mcp.json en la raíz del repo, compartido con el equipo)
#   bash mcp_add.sh local      # alcance local   (solo este directorio, solo tú)
#
# Variables opcionales:
#   COMPOSIO_MCP_URL   URL del servidor (por defecto la que muestra Composio para Claude)
#   MCP_NAME           nombre con el que se registra (por defecto: composio)
#
# Tras ejecutarlo, dentro de Claude Code corre /mcp para completar la autorización OAuth
# en el navegador. El registro no guarda secretos: solo la URL.
set -euo pipefail

SCOPE="${1:-user}"
URL="${COMPOSIO_MCP_URL:-https://connect.composio.dev/mcp}"
NAME="${MCP_NAME:-composio}"

case "$SCOPE" in
  user|project|local) ;;
  *) echo "Alcance inválido: '$SCOPE' (usa user | project | local)" >&2; exit 2 ;;
esac

if ! command -v claude >/dev/null 2>&1; then
  echo "No encuentro el CLI 'claude'. Instala Claude Code primero: https://code.claude.com/docs" >&2
  exit 1
fi

if claude mcp get "$NAME" >/dev/null 2>&1; then
  echo "Ya existe un servidor MCP llamado '$NAME'. Lo reemplazo con la URL actual."
  claude mcp remove "$NAME" >/dev/null 2>&1 || true
fi

claude mcp add --transport http --scope "$SCOPE" "$NAME" "$URL"

echo
echo "Registrado '$NAME' -> $URL (alcance: $SCOPE)"
echo
claude mcp list 2>/dev/null | grep -i "$NAME" || {
  echo "Advertencia: 'claude mcp list' no muestra '$NAME'. Revisa el alcance o vuelve a ejecutar." >&2
  exit 1
}
echo
echo "Siguiente paso: abre Claude Code y ejecuta /mcp para autorizar Composio en el navegador."
if [ "$SCOPE" = "project" ]; then
  echo "Se creó o actualizó .mcp.json en la raíz del repo; versiónalo para que el equipo herede el conector."
fi
