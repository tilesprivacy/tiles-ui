# Known issues

Found while porting the chat UI onto Tilekit. Line references are against
[`tilesprivacy/tiles`](https://github.com/tilesprivacy/tiles) on `feat/tilekit-apis`
unless stated otherwise.

Most of these live on the daemon side rather than in this repo. Where the UI has had to
work around one, the workaround is named so it can be removed later.

---

## Daemon bugs

### 1. An account created through Tilekit can never save a chat

`POST /v1/tilekit/account/create` writes the identity to `config.toml` and the OS keychain,
but never inserts the row into the `users` table in the common database. That insert is
`save_root_account_db`, reached only through `core::init_account`
(`tiles/src/core/mod.rs:36`), which is called from just two places — `tiles/src/main.rs:452`
and `:478`, both REPL entry paths. `tiles/src/daemon/account.rs` touches no database at all.

The result is that `POST /v1/tilekit/session/chat` fails permanently for such an account:

```
HTTP 404  {"reason":"User did:key:z6Mkgb… not found","status":"failed"}
```

Since the session row is created before the user lookup in `do_save_chat`, a session
appears in `/session/list` with no chats under it — so the failure looks like data loss
rather than a rejected write.

**Workaround:** run `tiles -x` once. The `-x` / `--no-repl` flag runs `init_account` and
skips the REPL.

**Suggested fix:** call `core::init_account` from `do_create_account`, or once at daemon
startup.

### 2. `GET /v1/tilekit/session/{id}/chats` returns shifted columns

The query in `fetch_chats_by_session_id` (`tiles/src/core/chats.rs:444`) selects ten
columns and omits `model_name`, but the `Chats` struct has eleven fields. The mapping
slides by one, so `model_name` comes back holding the session id:

```json
{ "session_id": "01a073bb-…", "model_name": "01a073bb-…" }
```

Harmless while nothing renders the model, but it will surface as soon as a model badge is
added to a message.

### 3. `tiles daemon start --port N` cannot work

`start_cmd(port)` spawns the detached child with only `.arg("daemon")`
(`tiles/src/daemon/mod.rs:197`), and the bare `daemon` arm calls `start_server(None)`, which
falls back to the default 1729. So the child always binds 1729 while the parent polls `N`
and times out.

This is the collision behind the `//TODO: Add a different PORT for development` at
`tiles/src/daemon/mod.rs:137`: a development daemon cannot run alongside an installed one,
and the Python server hardcodes `DAEMON_PORT = 1729` (`server/config.py:13`) in the other
direction.

### 4. Handlers panic instead of erroring

- `GET /shutdown` does `sender.take().unwrap()` (`tiles/src/daemon/mod.rs:297`), so a second
  call panics the handler task.
- `GET /remote-unshare` does the same at `:452`, so calling it without a prior
  `/remote-share` panics.
- The `std::sync::Mutex` fields on `AppState` are accessed with `.expect(...)` throughout, so
  one poisoned lock takes subsequent requests down with it.

### 5. Error responses are not uniform

Two conventions coexist. The `/v1/tilekit/*` routes return `{status, data}` on success and
`{status:"failed", reason}` on failure, but the root routes (`/`, `/config`, `/remote-*`)
return bare strings and status codes with no envelope. Body-deserialisation failures fall
through to axum's default `Json` rejection, which follows neither.

Status codes are also chosen ad hoc — in `tiles/src/daemon/session.rs` a database connection
failure is a 500 in `fetch_sessions` (`:111`) but a 422 in `save_chat` (`:131`), and any
query failure in `fetch_sessions` becomes a 404 (`:121`).

---

## Missing endpoints

Listed in `docs/adr/tilekit.md` but never routed, or needed by the UI and absent.

### Session

- [ ] `GET /v1/tilekit/session/{id}` — in the ADR, not routed. The UI works around it by
      scanning `/session/list`.
- [ ] `DELETE /v1/tilekit/session/{id}` — **no `delete_session` exists in
      `core/chats.rs`**, so this is a core change, not just a route. Needs a cascade over
      `chats` and a decision about `row_counter`, which the iroh delta-sync assumes is
      append-only.
- [ ] `PATCH /v1/tilekit/session/{id}` — no `rename_session` either; `sessions.name` is only
      ever written at creation.
- [ ] `GET /v1/tilekit/session/resume?id=…` — ADR phase 2. **This is the blocker below.**
- [ ] `GET /v1/tilekit/session/search` — ADR phase 2.

### Agent

- [ ] `GET /v1/tilekit/agent/stop` — in the ADR, not routed.
- [ ] A session-scoped prompt. See the blocker below.
- [ ] Note the implemented route is `/agent/end_session` (underscore); the ADR writes
      `/agent/end-session`.

### Server

- [ ] `GET /v1/tilekit/server/load-model` — ADR phase 2. Today `/server/start` only starts the
      process; loading a model is a REPL-only path that posts to the Python server's `/start`
      directly. A pure-HTTP client cannot get from cold start to a usable agent.

### Account

- [ ] `POST /v1/tilekit/account/set-nickname` — in the ADR, not routed, though `set_nickname`
      exists in `core/account/local.rs`.
- [ ] `GET /account/status` does not report ATproto state even though `fetch_logged_in_data`
      exists, so a client cannot tell whether the user is signed in.
- [ ] No ATproto endpoints at all — see below.

---

## Blocker: a conversation cannot be continued

`POST /v1/tilekit/agent/prompt` takes no session id. There is one global agent —
`AppState.agent` is a single `AsyncMutex<Option<PiAgent>>` — so a prompt goes to whatever
session Pi happens to be in. Opening an older conversation and replying talks to the wrong
session; Pi has been observed answering _"I already did this in the previous turn"_.

Reading history back works. Continuing a specific thread does not, until `/session/resume`
exists or `/agent/prompt` accepts a session id.

The same single-agent design means `/agent/prompt` holds the agent lock for the whole
streamed turn, so any concurrent `/agent/state`, `/agent/end_session` or `/session/new`
blocks until it finishes.

**Interim, no daemon change:** open an old conversation read-only and, on the first reply,
start a fresh Pi session seeded with prior history — which is what the REPL's `/resume` does
(`tiles/src/repl.rs:1072`).

---

## ATproto is not exposed

Making both a local and an ATproto account is the distinguishing feature, but only local is
reachable over HTTP. The capability exists in `core/account/atproto.rs` and is wired only to
the CLI (`tiles at login <handle>` / `tiles at logout`):

`login`, `logout`, `fetch_logged_in_data`, `share_session`.

`login` cannot be wrapped as-is, because it is written for a terminal:

- it blocks for the entire browser flow — `start_internal_server(Some(8988), callback_tx)`
  then `callback_rx.await`, with no timeout or cancel;
- it `println!`s the authorize URL, which in the daemon goes to `daemon.out.log` where no
  client can see it;
- it spawns `open` / `xdg-open` from the daemon process;
- the callback server is single-shot, so two concurrent logins collide on port 8988.

Exposing it means splitting the flow: one call that resolves the handle, arms the listener
and returns the authorize URL, and another (poll or SSE) for whether the callback landed.

Worth deciding early: the local `did:key` and the ATproto `did:plc` are **separate
identities that coexist**. Signing into ATproto does not replace the local account.

---

## Infrastructure

- [ ] **No CORS layer.** `tower-http` is not a dependency. Development works because Vite
      proxies `/v1` to 1729, but any other hosting needs CORS.
- [ ] **No static file serving.** llama.cpp embeds its UI in the server binary; Tiles has no
      equivalent, so how the built UI ships is unresolved — a daemon route, or a desktop shell.
- [ ] **Request timeout is written but disabled.** The `tower` timeout stack is commented out
      at `tiles/src/daemon/mod.rs:233` and `:248`, presumably because a 30s timeout would kill
      the long-lived SSE stream. `AppError::RequestTimeout` is now unreachable.
- [ ] **The REPL and the daemon run separate Pi processes.** The REPL spawns its own agent, so
      running `tiles` alongside this UI gives two Pi children against one llama server. The
      REPL can also use remote inference (`REMOTE_BOUND_PORT`); the daemon cannot.

---

## Switched off in this UI

Tracked in `src/lib/features.ts`, each with the endpoint it is waiting on. Flip the flag once
the API exists.

| Flag                                                                     | Waiting on                            |
| ------------------------------------------------------------------------ | ------------------------------------- |
| `SESSION_DELETE`                                                         | `DELETE /session/{id}`                |
| `SESSION_RENAME`                                                         | `PATCH /session/{id}`                 |
| `SESSION_PIN`                                                            | somewhere to store it                 |
| `CONVERSATION_SEARCH`                                                    | `GET /session/search`                 |
| `MODEL_SWITCHING`                                                        | model list / load endpoints           |
| `SERVER_PROPS`                                                           | a capability probe                    |
| `CONTEXT_GAUGE`, `MESSAGE_STATS`                                         | per-request token accounting          |
| `ATTACHMENTS_*`                                                          | `/agent/prompt` takes plain text only |
| `BRANCHING`                                                              | no branch model server-side           |
| `LLM_TITLES`                                                             | a plain completion endpoint           |
| `MCP`, `SERVER_TOOLS`, `AGENTIC`, `JS_SANDBOX`                           | Pi owns tools; not exposed over HTTP  |
| `STREAM_RESUME`, `IMPORT_EXPORT`, `WORKING_DIRECTORY`, `SAMPLING_PARAMS` | no equivalent                         |

Delete, rename and pin deliberately do nothing rather than changing only the local copy,
since the daemon overwrites it on the next load — a deletion that silently reappears is worse
than one that visibly did not happen.
