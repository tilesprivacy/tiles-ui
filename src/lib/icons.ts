// 24px stroke icons, drawn by Icon.svelte
export const icons = {
	plus: '<path d="M12 5v14M5 12h14"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
	sliders:
		'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
	sidebar: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
	back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
	forward: '<path d="M5 12h14M13 6l6 6-6 6"/>',
	chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 2v4M14 2v4M10 18v4M14 18v4M2 10h4M2 14h4M18 10h4M18 14h4"/>',
	box: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
	up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
	down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
	stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
	brain:
		'<path d="M12 4a3 3 0 0 0-3 3 3 3 0 0 0-3 5 3 3 0 0 0 3 5 3 3 0 0 0 3 3V4Z"/><path d="M12 4a3 3 0 0 1 3 3 3 3 0 0 1 3 5 3 3 0 0 1-3 5 3 3 0 0 1-3 3"/>',
	tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5Z"/>',
	share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
	copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
	check: '<path d="m5 12 5 5 9-10"/>',
	chevron: '<path d="m6 9 6 6 6-6"/>',
	x: '<path d="M6 6l12 12M18 6 6 18"/>',
	minimize: '<path d="M6 12h12"/>',
	maximize: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
	restore:
		'<rect x="5" y="9" width="10" height="10" rx="1.5"/><path d="M9 9V6.5A1.5 1.5 0 0 1 10.5 5h7A1.5 1.5 0 0 1 19 6.5v7a1.5 1.5 0 0 1-1.5 1.5H15"/>',
	trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
	device: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>',
	sync: '<path d="M20 11A8 8 0 0 0 5.7 6.1L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>',
	info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
	open: '<path d="M7 17 17 7M9 7h8v8"/>'
} as const;

export type IconName = keyof typeof icons;
