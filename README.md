<img src="assets/icon.svg" width="64" height="64" alt="">

# Glose

A desktop app for learning from what you read and for writing your own prose: a graph of small,
sourced Markdown notes, spaced-repetition recall, and writing projects where the AI references
and suggests but never writes. [docs/ideas.md](docs/ideas.md) has the full idea.

Today Glose has its frame and first working slice, in English and Danish: a first-start setup,
Today, Add Source, the Reading Stage up to Extraction, a zoomable Graph view, and Card
Extraction from a Note into Recall. Sources are saved as Markdown files in
the Graph folder. Extraction is an agentic Session with the AI, on the user's own ChatGPT plan
("Sign in with ChatGPT"); so is Card Extraction, which proposes Cards from a Note that the user
keeps, edits or drops. Cards are Markdown files in the Graph folder's `Cards` folder. The Probe
and the Review come later. The visual design is
recorded in [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md).

Glose uses the architecture and stack of [T3 Code](https://github.com/pingdotgg/t3code), scaled
down: shared Effect Schema contracts, an Effect server with typed RPC, a React client that reads
server data through Effect atoms, and an Electron shell around them.

## Run it

Tool versions (Node, pnpm) are pinned in `mise.toml`. With [mise](https://mise.jdx.dev) installed:

```bash
mise install
pnpm install
pnpm dev            # browser: server on :4310, web on http://localhost:5183
pnpm dev:desktop    # the same, in an Electron window
pnpm dev:demo       # the browser app on the demo Graph: 10 Sources, 104 linked Notes
```

`pnpm dev:demo` (and `pnpm dev:demo:desktop`) copy `demo/Graph` to the temp folder and give the
app its own computer settings there, so your own Graph and settings are not touched. Each start
is a fresh copy; add `-- --keep` to continue with the last one. `demo/Graph` is plain Markdown,
so it also opens as an Obsidian vault.

The app as it ships, where Electron starts the built server itself:

```bash
pnpm build:desktop
pnpm --filter @glose/desktop start
pnpm dist:desktop   # installer for this platform, in apps/desktop/release
```

`pnpm check` runs everything CI runs (format, lint, typecheck, tests).

| Variable               | Default     | Purpose                                             |
| ---------------------- | ----------- | --------------------------------------------------- |
| `GLOSE_HOST`           | `127.0.0.1` | Interface the server listens on                     |
| `GLOSE_PORT`           | `4310`      | Server port (the dev proxy reads it)                |
| `GLOSE_WEB_DIST`       | unset       | Built web app to serve; the desktop app sets it     |
| `GLOSE_VERSION`        | server's    | Version the server reports; the desktop app sets it |
| `GLOSE_DEV_SERVER_URL` | unset       | Makes the desktop app load this URL (dev)           |
| `GLOSE_DATA_DIR`       | OS app data | Folder for computer settings and `chatgpt.json`     |

### ChatGPT on a headless node

The ChatGPT sign-in returns to `http://127.0.0.1:1455/auth/callback` on the computer that runs
the server. When the browser runs on another computer, forward the port first:
`ssh -L 1455:127.0.0.1:1455 <node>`.

## How it fits together

```
packages/contracts   Effect Schema types and the RpcGroup
        │  (imported as TypeScript source, no build step)
        ├───────────────────────────────┐
apps/server                         apps/web (:5183)
  bin.ts     NodeRuntime + launch     rpc/    AtomRpc client (/rpc)
  server.ts  Layer graph: RPC,        state/  query atoms
             /health and the SPA      routes/ file-based routes
             on one HttpRouter
  rpc.ts     thin RPC handlers
  chatgpt/   Sign in with ChatGPT, tokens, the streaming Responses client
  sessions/  the agent loop and its Sessions, kept in .glose/sessions/
  cards/     Card files in Cards/, read through an index of changed files
        │
apps/desktop                        Electron main process
  backend/   starts the server as a child process and waits for /health
  window/    one window on the server's origin
  updates/   electron-updater against this repository's GitHub releases
```

- **One origin.** The server serves the RPC and the built web app, so the window loads a plain
  `http://127.0.0.1:<port>` page. In dev, Vite serves the page and proxies `/rpc`.
- **The server is its own process.** Electron starts `apps/server/dist/bin.mjs` with itself as
  Node (`ELECTRON_RUN_AS_NODE`) on a free port, and stops it on quit. The window has no Node
  access and no preload script.
- **Self-contained bundles.** `vp pack` puts every dependency into `main.cjs` and `bin.mjs`, so
  the installer carries no `node_modules`.
- **Updates.** An installed app checks the GitHub releases at start and every four hours,
  downloads a new version in the background, and installs it on quit. Releases are nightlies
  (below); signing for macOS is not set up yet.

## Releases

`.github/workflows/release.yml` publishes a nightly every night at 02:17 UTC when `main` has new
commits, and on request (`gh workflow run release.yml`, or Actions > Release > Run workflow).
A nightly is a GitHub prerelease tagged `v<version>-nightly.<yyyymmdd>.<run>`, for example
`v0.1.0-nightly.20261113.42`, where `<version>` is `apps/desktop/package.json`'s. It holds the
Linux AppImage, the Windows installer and their `nightly*.yml` update files. An installed nightly
updates to the newest release whose tag says `nightly`: it checks every hour and from the
Updates button in the status bar, which then downloads the release and restarts Glose to install
it. macOS waits for signing.

On Linux, keep the AppImage under a name without a version, such as
`~/Applications/Glose.AppImage`: an update then replaces that file, and a launcher that points
to it keeps working. The AppImage needs FUSE 2 (`libfuse.so.2`, the `fuse2` package on Arch).

The lint setup and the rules in `oxlint-plugin-glose/` are adapted from T3 Code under its MIT
license (`oxlint-plugin-glose/LICENSE`).
