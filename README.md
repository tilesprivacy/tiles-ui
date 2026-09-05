<!-- LOGO -->

<p align="center">
  <a href="https://github.com/tilesprivacy/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://tiles.run/realdark.png" />
      <source media="(prefers-color-scheme: light)" srcset="https://tiles.run/reallight.png" />
      <img src="https://tiles.run/realdark.png" alt="Tiles Logo" width="128" />
    </picture>
  </a>
</p>

<h1 align="center">Tiles UI</h1>

<p align="center">
  A web interface for <a href="https://github.com/tilesprivacy/tiles">Tiles</a>, talking to the local daemon over Tilekit<br/>
  <a href="#getting-started">Getting Started</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#what-is-and-is-not-wired-up">Status</a> ·
  <a href="#contributing">Contributing</a> ·
  <a href="#license">License</a>
</p>

---

> **Status: Early**
> The chat loop works end to end against a local model. A lot of the interface is switched
> off because the APIs behind it do not exist yet — see
> [what is and is not wired up](#what-is-and-is-not-wired-up) and [ISSUES.md](ISSUES.md).

Tiles is a private, local-first AI assistant. Until now the only way to use it was the
terminal. Tiles UI is the graphical client: it runs in a browser, talks to the Tiles daemon
on your own machine, and never sends anything anywhere else.

## Getting Started

You need a working [Tiles](https://github.com/tilesprivacy/tiles) install — the daemon, the
inference server, the Pi agent binary and a model. Follow that repository's
[HACKING.md](https://github.com/tilesprivacy/tiles/blob/main/HACKING.md) first.

**Prerequisites**

- Node.js 20.19+ (Vite 7 requires it)
- A Tiles daemon listening on `127.0.0.1:1729`

**Run it**

```sh
npm ci
npm run dev
```

That starts Vite on <http://localhost:5173> and Storybook on <http://localhost:6006>. Vite
proxies `/v1` to the daemon, which is why there is no CORS setup to do.

Point it somewhere else with an environment variable:

```sh
VITE_PUBLIC_SERVER_ORIGIN=http://127.0.0.1:1730 npm run dev
```

**Build it**

```sh
npm run build     # generates PWA assets, then bundles to ./dist
npm run preview   # serve the build locally
```

The output is a static SPA. How it ships alongside Tiles — served by the daemon, or wrapped
in a desktop shell — is not settled yet.

## How It Works

Tiles runs several processes on your machine. This UI talks to exactly one of them.

```
Tiles UI  (this repo, browser)
    │  HTTP + SSE, /v1/tilekit/*
    ▼
Tiles daemon  (Rust, axum, :1729)
    ├── SQLite (SQLCipher) — accounts, sessions, chats
    ├── Pi     — the agent harness, driven over stdin/stdout JSON
    └── Python inference server (:6969) → llama-server → your model
```

Everything goes through **Tilekit**, the daemon's public HTTP surface. The UI has no model
access of its own, no cloud calls, and no storage of record — conversations live in the
daemon's database, which is the same one the Tiles terminal client uses. A chat started in
the REPL shows up here, and the other way round.

The endpoints in use:

| Group   | Used for                                                                                  |
| ------- | ----------------------------------------------------------------------------------------- |
| Account | `GET /account/status`, `POST /account/create` — onboarding and identity                   |
| Session | `POST /session/new`, `GET /session/list`, `GET /session/{id}/chats`, `POST /session/chat` |
| Agent   | `POST /agent/prompt` (SSE), `GET /agent/state`, `GET /agent/end_session`                  |
| Server  | `GET /server/{start,stop,ping}` — the inference server                                    |

Replies stream as Server-Sent Events. Each event is named after the Pi event it carries, so
`src/lib/utils/tilekit-sse.ts` reads the event name as well as the payload — reasoning and
answer text arrive as separate delta kinds and render into different parts of the message.

Tilekit is documented in the Tiles repository at `docs/adr/tilekit.md`, and there is a Bruno
collection under `docs/apis/` for poking at it by hand.

## What Is and Is Not Wired Up

**Working:** onboarding and local account creation, the account badge with your `did:key`,
the conversation list, opening a past conversation, streaming replies with reasoning,
stopping a reply, markdown with syntax highlighting, KaTeX and mermaid.

**Switched off.** The interface came from llama.cpp's web UI, which was written against a
much larger API than Tiles exposes. Rather than delete those features, each one sits behind
a flag in `src/lib/features.ts` with a note on what it needs. When the API lands, flip the
flag.

| Off                                    | Waiting on                           |
| -------------------------------------- | ------------------------------------ |
| Delete, rename, pin a conversation     | endpoints for them                   |
| Search across conversations            | `GET /session/search`                |
| Model picker                           | model list and load endpoints        |
| Attachments — image, audio, video, PDF | `/agent/prompt` takes text only      |
| Token and timing stats, context gauge  | per-request accounting               |
| Message branching                      | no branch model server-side          |
| Tools, MCP, agentic loop, JS sandbox   | Pi owns tools; not exposed over HTTP |
| Sampling parameters                    | config is read-only over HTTP        |

**One limitation worth stating plainly:** `POST /agent/prompt` takes no session id and there
is a single agent process, so replying inside an older conversation talks to whichever
session Pi is currently in. Reading history back is fine. This is the main thing blocking
multi-conversation use, and it needs a daemon change.

## Design

The interface follows the same system as the Tiles macOS menubar panel, kept in
[`docs/menubar-design-system.md`](docs/menubar-design-system.md): eight colour tokens, dark
only, Geist and Geist Mono vendored so nothing is fetched from a font host, one radius, and
a chamfer on anything that reads as a plate. Yellow means live, and nothing else.

Panel-specific rules in that document — a global `user-select: none`, no focus ring anywhere,
26px rows — are deliberately not carried over. This is a window with selectable text and real
inputs in it.

## Development

```sh
npm run check       # svelte-check, strict
npm run lint        # prettier + eslint
npm run format      # fix both
npm run test:unit   # vitest, node
npm run test:client # vitest, browser (needs `npx playwright install chromium`)
npm run test:e2e    # playwright, needs a running backend
npm run storybook   # component workshop on :6006
```

Built with SvelteKit 2 and Svelte 5 runes, Tailwind 4, and shadcn-svelte over bits-ui. State
lives in rune-based store classes under `src/lib/stores`; anything that talks HTTP is a
stateless service in `src/lib/services`.

Notable files:

| Path                                  | What                                        |
| ------------------------------------- | ------------------------------------------- |
| `src/lib/features.ts`                 | Every feature flag and what it waits on     |
| `src/lib/services/tilekit.service.ts` | The Tilekit client                          |
| `src/lib/services/tilekit-adapter.ts` | Translates daemon rows into the UI's shapes |
| `src/lib/utils/tilekit-sse.ts`        | Reader for the `/agent/prompt` stream       |
| `src/lib/stores/account.svelte.ts`    | Local identity and onboarding state         |
| `src/app.css`                         | The palette and design tokens               |

## Contributing

Issues and pull requests are welcome. [ISSUES.md](ISSUES.md) is the current list of what is
missing or broken — most of it is daemon-side rather than in this repository, with file and
line references into `tilesprivacy/tiles`.

Contribution standards follow the main project:
[CONTRIBUTING.md](https://github.com/tilesprivacy/tiles/blob/main/CONTRIBUTING.md) and
[AGENTS.md](https://github.com/tilesprivacy/tiles/blob/main/AGENTS.md).

## About

Tiles is part of the [User & Agents](https://www.userandagents.org) network, and Tiles
Privacy is a signatory to the [European Social Stack](https://european.social/#signatories)
initiative. Full documentation lives in the [Tiles Book](https://tiles.run/book).

## License

Dual-licensed under [MIT](LICENSE-MIT) and [Apache 2.0](LICENSE-APACHE), at your option.

This project began as a copy of the llama-server web interface (`tools/ui`) from
[ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp), MIT licensed, and was then
decoupled from it and rebuilt against Tilekit. See [LICENSE](LICENSE) for the full picture,
including the fonts and vendored libraries, and [ATTRIBUTIONS.txt](ATTRIBUTIONS.txt) for
provenance.
