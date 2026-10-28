// 24px stroke icons, drawn by Icon.svelte
export const icons = {
	plus: '<path d="M12 5v14M5 12h14"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
	sliders:
		'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
	sidebar: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
	chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 2v4M14 2v4M10 18v4M14 18v4M2 10h4M2 14h4M18 10h4M18 14h4"/>',
	up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
	down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
	stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
	brain:
		'<path d="M12 4a3 3 0 0 0-3 3 3 3 0 0 0-3 5 3 3 0 0 0 3 5 3 3 0 0 0 3 3V4Z"/><path d="M12 4a3 3 0 0 1 3 3 3 3 0 0 1 3 5 3 3 0 0 1-3 5 3 3 0 0 1-3 3"/>',
	tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5Z"/>',
	copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
	check: '<path d="m5 12 5 5 9-10"/>',
	chevron: '<path d="m6 9 6 6 6-6"/>',
	x: '<path d="M6 6l12 12M18 6 6 18"/>'
} as const;

export type IconName = keyof typeof icons;
