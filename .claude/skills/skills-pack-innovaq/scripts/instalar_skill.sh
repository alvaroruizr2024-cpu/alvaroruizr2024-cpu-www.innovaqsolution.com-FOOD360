#!/usr/bin/env bash
# Estado del pack de skills INNOVAQ e instalación de las dos skills que llevan código
# (anatomy y last30days) desde un commit revisado.
#
#   instalar_skill.sh estado
#   instalar_skill.sh anatomy    [--dest DIR] [--ultimo]
#   instalar_skill.sh last30days [--dest DIR] [--ultimo]
#
# Solo descarga y copia archivos. No ejecuta nada de lo descargado.
# Instalar código de terceros requiere el sí explícito del usuario.
set -euo pipefail

# Commits revisados el 15-11-2026 (ver references/fuentes.md).
ANATOMY_REPO="https://github.com/wheresryan22/anatomy.git"
ANATOMY_COMMIT="1482e8469b0a9e0d8cc18ea2740a01423d29ae80"
ANATOMY_SUBDIR="."
L30_REPO="https://github.com/mvanhorn/last30days-skill.git"
L30_COMMIT="f0876504bdfcada40fcf5a4a3ada014c9408b9ed"
L30_SUBDIR="skills/last30days"

PACK="chief-of-staff teach marketing-psychology anatomy last30days"

uso() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; }

# version_ok ACTUAL MINIMA  -> 0 si ACTUAL >= MINIMA
version_ok() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]; }

buscar_chrome() {
  if [ -n "${CHROME_PATH:-}" ] && [ -x "${CHROME_PATH}" ]; then echo "$CHROME_PATH"; return; fi
  local c
  for c in google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1; then command -v "$c"; return; fi
  done
  for c in /opt/pw-browsers/chromium "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    if [ -e "$c" ]; then echo "$c"; return; fi
  done
  c=$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome 2>/dev/null | head -n1 || true)
  if [ -n "$c" ]; then echo "$c"; fi
}

estado() {
  local raiz proyecto n donde
  raiz=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
  proyecto="$raiz/.claude/skills"
  echo "Skills del pack"
  for n in $PACK; do
    donde=""
    if [ -f "$proyecto/$n/SKILL.md" ]; then donde="proyecto ($proyecto/$n)"; fi
    if [ -f "$HOME/.claude/skills/$n/SKILL.md" ]; then donde="${donde:+$donde y }usuario (~/.claude/skills/$n)"; fi
    if ls "$HOME"/.claude/skills/synced/*/"$n"/SKILL.md >/dev/null 2>&1; then donde="${donde:+$donde y }perfil de claude.ai"; fi
    printf '  %-22s %s\n' "$n" "${donde:-no instalada}"
  done
  echo
  echo "Requisitos"
  if command -v node >/dev/null 2>&1; then
    local nv; nv=$(node --version | sed 's/^v//')
    if version_ok "$nv" "20.10.0"; then echo "  Node $nv: suficiente para anatomy (pide 20.10 o superior)"
    else echo "  Node $nv: insuficiente para anatomy (pide 20.10 o superior)"; fi
  else echo "  Node: no encontrado (anatomy pide 20.10 o superior)"; fi
  local ch; ch=$(buscar_chrome)
  if [ -n "$ch" ]; then echo "  Chrome o Chromium: $ch"
  else echo "  Chrome o Chromium: no encontrado (anatomy lo usa para comprobar las figuras; define CHROME_PATH)"; fi
  if command -v python3 >/dev/null 2>&1; then
    local pv; pv=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:3])))')
    if version_ok "$pv" "3.12.0"; then echo "  Python $pv: suficiente para last30days (pide 3.12 o superior)"
    else echo "  Python $pv: insuficiente para last30days (pide 3.12 o superior)"; fi
  else echo "  Python 3: no encontrado (last30days pide 3.12 o superior)"; fi
  if command -v yt-dlp >/dev/null 2>&1; then echo "  yt-dlp: instalado (YouTube en last30days)"
  else echo "  yt-dlp: no instalado (last30days lo necesita para YouTube)"; fi
  if [ -f "$HOME/.config/last30days/.env" ]; then echo "  Configuración de last30days: ~/.config/last30days/.env existe"
  else echo "  Configuración de last30days: sin crear (solo fuentes sin clave)"; fi
}

instalar() {
  local nombre="$1" repo="$2" commit="$3" subdir="$4"; shift 4
  local dest="$HOME/.claude/skills" ultimo=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --dest) [ $# -ge 2 ] || { echo "Falta la carpeta tras --dest" >&2; exit 2; }; dest="$2"; shift 2 ;;
      --ultimo) ultimo=1; shift ;;
      *) echo "Opción desconocida: $1" >&2; uso; exit 2 ;;
    esac
  done
  local destino="$dest/$nombre"
  if [ -e "$destino" ]; then
    echo "Ya existe $destino. Bórrala o muévela antes de reinstalar; no se sobrescribe." >&2
    exit 1
  fi
  command -v git >/dev/null 2>&1 || { echo "Hace falta git." >&2; exit 1; }

  # Global a propósito: la limpieza corre al salir del script, fuera de esta función.
  TMP_DESCARGA=$(mktemp -d)
  trap 'rm -rf "${TMP_DESCARGA:-}"' EXIT
  local tmp="$TMP_DESCARGA"
  git -C "$tmp" init -q
  git -C "$tmp" remote add origin "$repo"
  local obtenido
  if [ "$ultimo" -eq 1 ]; then
    echo "Descargando la rama principal de $repo (sin fijar versión)..."
    git -C "$tmp" fetch -q --depth 1 origin HEAD
  else
    echo "Descargando $repo en el commit revisado $commit..."
    git -C "$tmp" fetch -q --depth 1 origin "$commit"
  fi
  git -C "$tmp" checkout -q FETCH_HEAD
  obtenido=$(git -C "$tmp" rev-parse HEAD)
  if [ "$ultimo" -eq 0 ] && [ "$obtenido" != "$commit" ]; then
    echo "El commit descargado ($obtenido) no es el revisado ($commit). No se instala." >&2
    exit 1
  fi
  if [ ! -f "$tmp/$subdir/SKILL.md" ]; then
    echo "No hay SKILL.md en '$subdir' de ese commit. No se instala." >&2
    exit 1
  fi

  mkdir -p "$dest"
  if [ "$subdir" = "." ]; then
    rm -rf "$tmp/.git"
    cp -R "$tmp" "$destino"
  else
    cp -R "$tmp/$subdir" "$destino"
    if [ -f "$tmp/LICENSE" ] && [ ! -f "$destino/LICENSE" ]; then cp "$tmp/LICENSE" "$destino/LICENSE"; fi
  fi
  printf 'repo: %s\ncommit: %s\ninstalado: %s\n' "$repo" "$obtenido" "$(date -u +%Y-%m-%dT%H:%MZ)" > "$destino/.origen-innovaq"

  echo "Instalada $nombre en $destino (commit $obtenido)."
  echo "No se ejecutó nada de lo descargado."
  case "$nombre" in
    anatomy) echo "Siguiente paso: reinicia la sesión y pide una figura. No necesita claves." ;;
    last30days) echo "Siguiente paso: reinicia la sesión. La primera vez abre un asistente de configuración;"
                echo "revisa cada permiso que pida. Las claves van en ~/.config/last30days/.env, nunca en el chat." ;;
  esac
}

case "${1:-}" in
  estado) estado ;;
  anatomy) shift; instalar anatomy "$ANATOMY_REPO" "$ANATOMY_COMMIT" "$ANATOMY_SUBDIR" "$@" ;;
  last30days) shift; instalar last30days "$L30_REPO" "$L30_COMMIT" "$L30_SUBDIR" "$@" ;;
  -h|--help|ayuda|"") uso ;;
  *) echo "Orden desconocida: $1" >&2; uso; exit 2 ;;
esac
