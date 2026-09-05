/** A hairline, brightening to signal when the box has focus inside it. */
export const BOX_BORDER = 'border border-border focus-within:border-signal/60';

export const INPUT_CLASSES = `
    bg-steel
    ${BOX_BORDER}
    outline-none
    text-foreground
`;

export const PANEL_CLASSES = `
    bg-steel
    border border-border
    backdrop-blur-lg!
    rounded-t-lg!
`;

export const CHAT_FORM_POPOVER_MAX_HEIGHT = 'max-h-80';
export const DIALOG_SUBMENU_CONTENT = 'w-60';

/** Selects the focused chat-form input (either renderer) to restore focus after model actions. */
export const CHAT_INPUT_FOCUS_SELECTOR =
	'[data-slot="input-area"] textarea, [data-slot="input-area"] [contenteditable="true"]';

/** Default Tailwind size class for inline icon components (lucide, etc.). */
export const ICON_CLASS_DEFAULT = 'h-4 w-4';

/** Small Tailwind size class for inline icons. */
export const ICON_CLASS_SM = 'h-3.5 w-3.5';

/** Extra-small Tailwind size class for inline icons. */
export const ICON_CLASS_XS = 'h-3 w-3';

/** Icon size + spinning animation; used for live-streaming tool indicators. */
export const ICON_CLASS_SPIN = 'h-4 w-4 animate-spin';
