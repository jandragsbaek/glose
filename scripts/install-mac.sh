#!/usr/bin/env bash
# Builds Glose from the newest commit of a branch (main by default) on this Mac, installs it as
# /Applications/Glose.app and opens it. Run it again to get the next version.
#
#   scripts/install-mac.sh            # main
#   scripts/install-mac.sh <branch>   # another branch
#
# No Apple Developer account is needed. The app is built here, not downloaded, so macOS does not
# quarantine it and opens it without asking. It is ad-hoc signed, which an Apple Silicon Mac
# needs to run it at all. Glose does not update itself in this build (see
# apps/desktop/src/updates/Updates.ts); this script is the update.
set -euo pipefail

# The pull below can change this file while bash reads it, so all of it is one function that bash
# reads whole before it runs.
main() {
  if [[ "$(uname -s)" != Darwin ]]; then
    echo "This script is for macOS." >&2
    exit 1
  fi

  cd "$(dirname "$0")/.."

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "This checkout has changes that are not committed. Commit or drop them first." >&2
    exit 1
  fi

  git switch "${1:-main}"
  git pull --ff-only

  # mise gives the Node and pnpm that mise.toml pins. Without it, they come from PATH.
  if command -v mise >/dev/null; then
    mise install
    eval "$(mise env --shell bash)"
  fi

  pnpm install --frozen-lockfile
  pnpm build:desktop

  case "$(uname -m)" in
    arm64)
      arch=arm64
      app=apps/desktop/release/mac-arm64/Glose.app
      ;;
    *)
      arch=x64
      app=apps/desktop/release/mac/Glose.app
      ;;
  esac

  # --dir makes only the .app, without the dmg and zip. identity "-" is the ad-hoc signature; it
  # also stops electron-builder from using a certificate it finds in the keychain.
  rm -rf "$app"
  (
    cd apps/desktop
    pnpm exec electron-builder --config electron-builder.yml --mac --dir "--$arch" \
      --publish never \
      -c.mac.identity=- \
      -c.mac.hardenedRuntime=false \
      -c.mac.notarize=false
  )

  if pgrep -xq Glose; then
    osascript -e 'tell application id "tech.dragsbaek.glose" to quit'
    while pgrep -xq Glose; do sleep 0.2; done
  fi

  rm -rf /Applications/Glose.app
  ditto "$app" /Applications/Glose.app
  open /Applications/Glose.app
  echo "Installed $(git rev-parse --short HEAD) as /Applications/Glose.app."
}

main "$@"
