const KEY = 'tiles.settings';

const defaults = {
	sendOnEnter: true,
	followReply: true,
	openReasoning: false,
	toolDetails: false,
	userMarkdown: true,
	fullCode: false,
	sidebarOpen: true
};

export type Settings = typeof defaults;

function load(): Settings {
	try {
		return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
	} catch {
		return { ...defaults };
	}
}

// display preferences for this browser, so they live in localStorage, not in Tiles
export const settings = $state(load());

export const defaultSettings: Readonly<Settings> = defaults;

$effect.root(() => {
	$effect(() => {
		try {
			localStorage.setItem(KEY, JSON.stringify(settings));
		} catch {
			// storage blocked, settings last until a reload
		}
	});
});
