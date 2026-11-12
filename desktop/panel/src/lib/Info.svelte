<script lang="ts">
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import type { Snippet } from "svelte";

  interface Props {
    text: string;
    /** richer tip, `text` still labels the button */
    children?: Snippet;
  }

  let { text, children }: Props = $props();

  let hovered = $state(false);
  let dismissed = $state(false);
  const open = $derived(hovered && !dismissed);

  // state, not :hover. the panel hides with no pointerleave and webkit keeps a stale :hover
  $effect(() => {
    const off = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused) hovered = false;
    });
    return () => void off.then((unlisten) => unlisten());
  });

  // capture, so escape closes a showing tip rather than reaching the panel's back
  function onkeydowncapture(event: KeyboardEvent) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    event.stopPropagation();
    dismissed = true;
  }
</script>

<svelte:window {onkeydowncapture} />

<button
  type="button"
  class="info"
  aria-label={text}
  data-open={open}
  tabindex="-1"
  onpointerenter={() => {
    hovered = true;
    dismissed = false;
  }}
  onpointerleave={() => (hovered = false)}
>
  <svg
    viewBox="0 0 24 24"
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.5h.01" />
  </svg>
  <span class="info__tip" aria-hidden="true">
    {#if children}{@render children()}{:else}{text}{/if}
  </span>
</button>

<style>
  /* static, so the tip spans the navbar rather than starting at the icon */
  .info {
    flex: none;
    display: inline-flex;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--slate);
    outline: none;
    transition: color var(--dur-state) ease-out;
  }

  .info:hover {
    color: var(--bone);
  }

  .info__tip {
    position: absolute;
    left: var(--pad-x);
    right: var(--pad-x);
    /* the app's 6px under the row, from the centred icon */
    top: calc(50% + 14px);
    z-index: 3;
    padding: 7px 10px;
    border: var(--hairline) solid var(--rule);
    border-radius: 6px;
    background: var(--steel);
    box-shadow: 0 10px 30px -8px rgb(0 0 0 / 0.6);
    color: var(--ash);
    font-size: var(--fs-label);
    line-height: 1.4;
    text-align: left;
    white-space: normal;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-state) ease-out;
  }

  .info[data-open="true"] .info__tip {
    opacity: 1;
  }
</style>
