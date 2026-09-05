# Menubar Panel — Design System

Normative reference for the Tiles menubar panel UI (`apps/menubar`). Written for
agents and contributors adding or changing UI in this app.

**Rule of precedence:** this document describes what the code already does. If the
two disagree, the code in `src/styles/tokens.css` and the component files wins —
fix this document. Do not introduce a value that is not in the tables below
without adding it here in the same change.

---

## 1. File map

| Path | Role |
| --- | --- |
| `src/styles/tokens.css` | All shared tokens. Colour, geometry, type, motion. |
| `src/styles/base.css` | Global reset, imports fonts + tokens. |
| `src/styles/fonts.css` | Vendored `@font-face` for Geist / Geist Mono. |
| `src/Panel.svelte` | Root. Owns the rounded rect, keyboard handling, height reporting. |
| `src/lib/Stack.svelte` | View stack. Push/pop animation and height measurement. |
| `src/lib/Row.svelte` | The only interactive surface. |
| `src/lib/Zone.svelte` | Labelled band of rows. |
| `src/lib/Masthead.svelte` | Brand lockup + status + inference switch. |
| `src/lib/Navbar.svelte` | Back button + title, on pushed views. |
| `src/lib/Footer.svelte` | Daemon version note + Quit. |
| `src/lib/Switch.svelte` | The `0`/`1` toggle. |
| `src/lib/Chip.svelte` | Small mono badge. |
| `src/lib/Avatar.svelte`, `ProviderMark.svelte`, `Mark.svelte` | Square plates. |
| `src/lib/Chevron.svelte`, `CopyMark.svelte`, `OpenMark.svelte` | 12px glyphs. |
| `src/focus.svelte.ts` | Single focus store shared by pointer and arrow keys. |
| `src/nav.svelte.ts` | View stack state. |
| `src/views/*.svelte` | Screens. Compose the above; define no new primitives. |
| `src-tauri/src/panel.rs` | Host window. Owns `CORNER_RADIUS`. |

**Component metrics live with their component, not in `tokens.css`.** Only the
shared skeleton is tokenised. The switch's cell width is local to
`Switch.svelte` and must not be promoted to a global.

---

## 2. Colour

Eight tokens. Defined in `src/styles/tokens.css`. Dark only — the panel sets
`color-scheme: dark` and has no light mode.

| Token | Value | Means | Do not use for |
| --- | --- | --- | --- |
| `--signal` | `#f7ff61` | Live, focused, or the one actionable row | Decoration, hover on non-interactive things, "info" |
| `--void` | `#111111` | The ground, and the ink on top of `--signal` | — |
| `--bone` | `#ffffff` | Primary text: row titles, wordmark, navbar title | Secondary text |
| `--ash` | `#d4d4d8` | Mono values, chip text, Quit label | Row titles |
| `--slate` | `#8f8f9a` | Zone labels, subtitles, timestamps, resting glyphs | Anything primary |
| `--steel` | `#1d1d1d` | The only fill: chips, plates, buttons, unlit switch cells | Row/zone backgrounds |
| `--rule` | `rgba(255,255,255,0.1)` | Every hairline division | Borders on plates |
| `--alert` | `#ff5f52` | Daemon is down. Nothing else. | Generic errors, warnings, destructive actions |

### 2.1 Where `--signal` is allowed

Exactly four grammars. Adding a fifth needs a decision recorded here.

1. **Flood** — `Masthead` background while `mode === "running"`.
2. **Rail** — 2px left edge of the focused `Row`. Never a background wash.
3. **Lit cell** — one half of a `Switch`, plus its halo. Inverted on a yellow ground.
4. **Navigation tone** — `Row` with `tone="signal"`: the one row in a zone that leads somewhere.

### 2.2 Colour invariants

- `--void` is both the ground and the ink on the accent. That is why yellow-on-black
  inverts to black-on-yellow with no extra token. Do not add an "on-accent" colour.
- `--alert` is not a severity scale. There is one failure it names.
- There is no elevation, no surface ramp, and no second fill. If an object must read
  as separate, it gets `--steel` plus the chamfer (§5).

---

## 3. Type

One family, two cuts. Vendored as woff2 — never fetched from a font host.

| Token | Value | Used by |
| --- | --- | --- |
| `--font-ui` | `"Geist", -apple-system, BlinkMacSystemFont, sans-serif` | Everything a person would say aloud |
| `--font-mono` | `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace` | Everything a person would paste into a terminal |
| `--fs-title` | `13px` | Row titles, navbar title, wordmark |
| `--fs-body` | `12px` | Row subtitles, `row__key`, notes |
| `--fs-label` | `11px` | Zone labels (weight 500), Quit |
| `--fs-mono` | `11px` | DIDs, tickets, versions, timestamps, runtime values |
| `--fs-chip` | `10px` | Chip text (weight 600) |
| `--tracking-chip` | `0.03em` | Chips only |
| `--tracking-display` | `-0.02em` | Wordmark only |

Weights shipped: UI 400/500/600, mono 400/500. `font-synthesis: none` is global —
a weight that is not vendored fails visibly rather than faking a bold.

### 3.1 Type rules

- **Mono means machine.** Identifier, hash, version, reading, or timestamp → mono.
  Name, label, or sentence → UI.
- `font-variant-numeric: tabular-nums` wherever digits sit in a column or tick over
  in place: chips, timestamps, footer note, switch cells, runtime values.
- 8px is reachable only via `Chip` at `size="small"`. Nothing else goes below 10px.
- Text that can outgrow its track gets `overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap` — see `.row__title`. Clipped text with no ellipsis is a bug.

---

## 4. Geometry

| Token | Value | Holds |
| --- | --- | --- |
| `--panel-width` | `380px` | Fixed. Width never moves; only height is measured. |
| `--radius-panel` | `10px` | The only radius in the app. |
| `--pad-x` | `14px` | Horizontal inset for rows, labels, navbar, footer. |
| `--rail-w` | `2px` | Focus rail; also the alert rail on a dead masthead. |
| `--hairline` | `1px` | Zone rules, footer joint, panel inset ring. |
| `--h-row` | `26px` | Single-line row. |
| `--h-row-lg` | `38px` | Row with a leading mark and a subtitle. |
| `--h-masthead` | `36px` | Same bar as the nav; the flood makes it a masthead. |
| `--h-nav` | `36px` | Navbar and footer. |
| `--cut` | `4px` | The chamfer. Overridden to `3px` at small sizes. |

### 4.1 Cross-file constraint

`--radius-panel` **must equal `CORNER_RADIUS` in `src-tauri/src/panel.rs`.** A
mismatch renders as a doubled corner. Change both or neither.

### 4.2 Sizing

- Integer pixels at 1×. Nothing scales with the viewport.
- The panel reports its own height: `Panel.svelte` observes its root with a
  `ResizeObserver`, coalesces to one `invoke("resize_panel")` per frame, and skips
  a height it already sent. `html/body/#app` are `height: auto`, not `100%`.
- A list that can grow unbounded clamps and scrolls in its own container
  (`SessionsView` uses `max-height: 280px; overflow-y: auto`), because the panel
  clips at the screen edge.

---

## 5. The chamfer

One diagonal, bottom-right, applied via `clip-path`. It is the app's only
softening device.

```css
clip-path: polygon(
  0 0,
  100% 0,
  100% calc(100% - var(--cut)),
  calc(100% - var(--cut)) 100%,
  0 100%
);
```

**Takes the cut:** `Chip`, `Avatar`, `ProviderMark`, the Quit button, the `Switch`
plate. These are *plates* — discrete objects sitting on the panel.

**Never takes the cut:** `Row`, `Zone`, `Navbar`, `Footer`, the panel itself.
These are *surface*.

Inside `Switch`, the inner clip subtracts one from the chamfer
(`calc(100% - var(--chamfer) + 1px)`) so the inner and outer cuts run parallel
instead of converging.

**No new `border-radius`.** The panel is the only rounded object.

---

## 6. Motion

| Token | Value | Applies to |
| --- | --- | --- |
| `--dur-push` | `180ms` | View slide, panel height |
| `--dur-state` | `140ms` | Colour, glow, opacity |
| `--ease-push` | `cubic-bezier(0.32, 0.72, 0, 1)` | Travel only |

State flips use `ease-out`; only travel uses the custom curve.

### 6.1 Reduced motion

`tokens.css` zeroes both durations under `prefers-reduced-motion: reduce`, which
turns every transition in the app into a swap with no second code path.

**Any new animation that a `0ms` duration cannot neutralise must carry its own
`@media (prefers-reduced-motion: reduce)` block in its own file.** Current
exceptions, both already handled: the switch's running light (replaced by a lit
frame) and the ticket skeleton (replaced by flat opacity).

### 6.2 The push

Views do not cross-fade. Incoming enters from `translateX(100%)`; outgoing trails
to `translateX(-38%)` — AppKit parallax. Whichever view heads for the right edge
gets `z-index: 1`, so a push covers and a pop uncovers. Both views are opaque
(`background: var(--void)`), because they overlap during the transition.

`Stack` waits **two** `requestAnimationFrame`s before setting `data-running`; a
transition added in the same paint as the element can skip its start value and
render both views untransformed for a frame.

---

## 7. Components

### 7.1 `Row` — the only interactive surface

Every list item, setting, and copyable value is a `Row`. Do not build a bespoke
clickable div.

| Prop | Type | Notes |
| --- | --- | --- |
| `key` | `string` | Names the value when the value alone would not. Renders left of the title, `--fs-body`, slate. |
| `title` | `string` | Primary text, `--bone`. |
| `sub` | `string` | Secondary line, `--slate`, `--fs-body`. |
| `size` | `"regular" \| "large"` | `26px` / `38px`. Use `large` when there is a leading mark or a subtitle. |
| `dimmed` | `boolean` | 50% opacity **and** unregistered from focus. |
| `tone` | `"default" \| "signal"` | `signal` paints the title yellow at rest. |
| `mono` | `boolean` | Title in Geist Mono at `--fs-mono`, colour `--ash`. |
| `submono` | `boolean` | Subtitle in Geist Mono. |
| `leading` | `Snippet` | A mark, before the text block. |
| `inline` | `Snippet` | Rides the title, not the right edge. Use for copy/open glyphs. |
| `trailing` | `Snippet` | Right edge: chips, chevrons, values, switches. |
| `onselect` | `() => void` | Presence makes the row live. |

**CSS contract:** a row exports `--row-mark` to its children — `--slate` at rest,
`--signal` when active. `Chevron`, `CopyMark`, `OpenMark` and `Avatar` read it, so a
whole row's marks light together without knowing about focus. A new mark that sits
in a row should read `var(--row-mark, var(--slate))`.

`ProviderMark` deliberately does **not** read it: the provider is a fact about the
model, not a reading of focus, so it stays `--signal` always.

**Focus:** the rail (`::before`, `--rail-w`, `--signal`) is the only focus
indicator. No background wash, no `:focus` ring anywhere in the app. Live rows
register with `focus.svelte.ts` in document order, so arrow keys and the pointer
share one highlight and no view numbers its own rows.

**`dimmed` means unavailable, not quiet.** Low-priority content gets `--slate`.
A dimmed row must not also carry an `onselect`.

### 7.2 `Zone` — a labelled band

Hairline rule, optional `--fs-label` slate label at weight 500, then rows.

- The rule is drawn *inside* the zone at its top, inset by `--hairline` at both
  ends so it does not double up on the panel's ring.
- `dimmed` fades the label and rule to 45%; rows keep their own dimming. The two
  are separate readings — the zone's subject is unavailable, the row's value is missing.
- A zone with no label is legitimate when the content names itself
  (`AccountView`'s avatar + name band).

### 7.3 `Masthead`

`mode: "down" | "connecting" | "starting" | "idle" | "running"`.

| Mode | Ground | Text | Rail | Meaning |
| --- | --- | --- | --- | --- |
| `down` | `--void` | `--slate` | `--alert` | Daemon not reachable |
| `connecting` | `--void` | `--bone` | — | Daemon coming up |
| `starting` | `--void` | `--bone` | — | Model loading; switch shows the running light |
| `idle` | `--void` | `--bone` | — | Daemon up, inference off |
| `running` | `--signal` | `--void` | — | Inference live |

Only `running` floods. **There is no status dot anywhere** — the block is the
status light. When the ground is `--signal`, the badge chip drops to
`rgba(0,0,0,0.12)` on `rgba(0,0,0,0.6)` and the switch takes `invert`.

`connecting` vs `starting`: connecting is about the daemon, starting is about the
model loading into it.

### 7.4 `Switch`

Two cells reading `0` and `1`, inset 1px into a single frame; the seam between them
is cut from that same surface, so a lit cell can never paint over its own edge.

| Prop | Type | Notes |
| --- | --- | --- |
| `on` | `boolean` | Which cell is lit. |
| `disabled` | `boolean` | 35% opacity. |
| `pending` | `boolean` | Request out, daemon has not answered. Neither cell claims the new state. |
| `invert` | `boolean` | For a `--signal` ground: plate goes black, lit half stays yellow. |
| `size` | `"regular" \| "small"` | `53×22` / `37×16`. `small` sits inline with a 13px row title. |
| `glow` | `boolean` | Halo. Off for switches inside a row — a halo reads as a button. |
| `label` | `string` | `aria-label`. Required. |

Implementation constraints, all load-bearing:

- **No CSS `filter`.** A non-`none` filter builds a render surface in every state;
  WebKit clips it at the chamfer and snaps it when it grows. The glow is a
  `box-shadow` on `.switch__halo`, a plain rect inset 2px, so the shadow reaches
  into the cut.
- **Pending wins on its own terms.** Every resting rule carries
  `:not([data-pending="true"])`; every inverted rule carries one attribute more
  than the rule it must beat. Do not reorder these to rely on source order.
- **The running light** is one dash per lap of the frame path, with the seam held
  off until the lap reaches its top so both leading edges land on the bottom of the
  seam in the same frame. The `stroke-dasharray` values are derived from the exact
  path length per size — recompute them if the box changes.

### 7.5 Marks and plates

| Component | Size | Plate | Colour |
| --- | --- | --- | --- |
| `Avatar` | 22 / 26px | `--steel` + cut | `--row-mark` (follows focus) |
| `ProviderMark` | 22 / 26px | `--steel` + cut, glyph at 62% | `--signal` (always) |
| `Mark` (brand) | 20 / 22px | none | `currentColor` |
| `Chevron` | 12px | none | `--row-mark`; `back` rotates 180° and uses `--ash` |
| `CopyMark` | 12px | none | `--row-mark`; `--signal` while `copied` |
| `OpenMark` | 12px | none | `--row-mark` |

Glyphs are hand-drawn at 12×12 on whole pixels, stroke 1.2–1.5, `stroke-linecap:
square`. No icon library — a 24px library path resamples to mush at this size.

Semantics are distinct and must be respected:
- **Chevron** — pushes a view within the panel.
- **OpenMark** — leaves the app (Finder, browser).
- **CopyMark** — writes to the clipboard; becomes a check for one beat after the write lands.

### 7.6 `Chip`

`--steel` plate, mono 600, `--fs-chip`, `--tracking-chip`, tabular figures, the cut.
`size="small"` drops to 8px and `--cut: 3px`. Holds acronyms, quant codes, counts —
never a sentence, because the tracking is set for capitals.

### 7.7 `Footer`

Mono note on the left (`--slate`, or `--alert` when the daemon is down), Quit on the
right. The hairline above it stops either side of the panel's ring rather than
crossing it, so the joint is one hairline and not two stacked.

The masthead is the state; **the footer only carries what the masthead cannot say** —
the daemon version, or the reason there isn't one.

---

## 8. Composition

A view is:

```
Masthead | Navbar     ← root view gets the masthead, pushed views get a navbar
Zone*                 ← one or more labelled bands
Footer?               ← root view only
```

Views compose existing primitives and define no new ones. A view may add a local
style block for a one-off (`.note`, `.value`, `.when`, `.ticket-skeleton`), but if a
second view needs the same thing it becomes a component in `src/lib`.

---

## 9. Global behaviours (`base.css`)

- `cursor: default` and `user-select: none` are global. This is a menubar surface:
  nothing is text you drag across, and nothing turns into a hand.
- `outline: none` globally — the rail is the focus indicator (§7.1).
- `-webkit-font-smoothing: antialiased`, `font-synthesis: none`.
- Keyboard, handled in `Panel.svelte` on `keydown` (not `keyup` — the panel should be
  gone before the key comes back up):

  | Key | Action |
  | --- | --- |
  | `Escape` | Pop a view, or hide the panel at depth 0 |
  | `ArrowDown` / `ArrowUp` | Move the rail, wrapping |
  | `Enter` | Activate the focused row |

---

## 10. Invariants

Numbered so they can be cited in review.

1. **One radius, one cut.** Nothing new gets a `border-radius`. Separation is the
   chamfer plus `--steel`.
2. **No elevation.** No shadows except the switch halo. Division is `--rule` hairlines.
3. **State is surface.** Before adding a badge, dot, or icon for a state, ask which
   surface can carry it: a ground, a rail, a cell, a title colour.
4. **One focus model.** Anything focusable is a `Row`, or registers with
   `focus.svelte.ts` the same way. No second highlight.
5. **`dimmed` ≠ quiet.** Opacity means unavailable. Low priority is `--slate`.
6. **Mono means machine.** Say-aloud → Geist. Paste-into-terminal → Geist Mono.
7. **Optimistic, then true.** A toggle flips on click and wears the requested state
   until the daemon reports the same. A second click *reverses* the request rather
   than being swallowed, so a control is never stuck waiting. See `RootView`'s
   `request` / `wanted` pattern.
8. **Metrics travel with components.** Only the shared skeleton is tokenised.
9. **Reduced motion is free.** Because durations are tokens. Any animation that
   cannot be zeroed by one needs its own media block (§6.1).
10. **Nothing is fetched.** Fonts and provider logos are vendored. A privacy panel
    does not tell a font host when it opened.

---

## 11. Checklist for a new component

- [ ] Does an existing primitive already do this? `Row` covers most interactive cases.
- [ ] Every colour is one of the eight tokens; no new hex outside `tokens.css`.
- [ ] Sizes come from the tokens in §4, or are local constants documented in the file.
- [ ] If it is a plate, it takes the chamfer; if it is surface, it does not.
- [ ] If it sits in a row, its glyph colour reads `var(--row-mark, var(--slate))`.
- [ ] Transitions use `--dur-state` (colour/opacity) or `--dur-push` (travel).
- [ ] Any animation survives `--dur-*: 0ms`, or has its own reduced-motion block.
- [ ] Interactive elements have an `aria-label` or accessible text, and a `role`
      where the element is not natively one.
- [ ] Text that can overflow ellipsises.
- [ ] Digits that align or tick use `tabular-nums`.
- [ ] Added a token? It is in `tokens.css` **and** in the tables above.
