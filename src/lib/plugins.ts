export interface TilesPluginMetadataField {
	href?: string;
	key: string;
	value: string;
}

export interface TilesPluginMcpServer {
	endpoint?: string;
	name: string;
	type: string;
}

export interface TilesPluginSkill {
	description: string;
	name: string;
	sourceUrl: string;
}

export interface TilesPlugin {
	description: string;
	installCommand: string;
	metadata: TilesPluginMetadataField[];
	mcpServers: TilesPluginMcpServer[];
	name: string;
	skills: TilesPluginSkill[];
	slug: string;
	sourceUrl: string;
}

const PLUGIN_DOWNLOAD_BASE_URL = 'https://download.tiles.run/plugins';
const PLUGIN_SOURCE_BASE_URL = 'https://github.com/tilesprivacy/plugins/blob/main';

export const TILES_PLUGINS: TilesPlugin[] = [
	{
		description: 'Web search and content extraction powered by Exa AI',
		installCommand: `tiles plugin install ${PLUGIN_DOWNLOAD_BASE_URL}/exa.zip`,
		mcpServers: [
			{
				endpoint: 'https://mcp.exa.ai/mcp',
				name: 'search',
				type: 'Streamable HTTP'
			}
		],
		metadata: [
			{
				href: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
				key: '$schema',
				value: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
			},
			{ key: 'name', value: 'exa' },
			{ key: 'version', value: '1.0.0' },
			{ key: 'description', value: 'Web search and page fetch' },
			{ href: 'https://exa.ai', key: 'homepage', value: 'https://exa.ai' },
			{ key: 'license', value: 'MIT' }
		],
		name: 'Exa',
		skills: [
			{
				description:
					'Research a topic on the web across several sources, verify a claim, or dig past search snippets into full pages.',
				name: 'web-research',
				sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/exa/skills/web-research/SKILL.md`
			}
		],
		slug: 'exa',
		sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/exa`
	},
	{
		description: 'Caldir is a tool for storing your calendar as a directory of ICS files.',
		installCommand: `tiles plugin install ${PLUGIN_DOWNLOAD_BASE_URL}/caldir.zip`,
		mcpServers: [],
		metadata: [
			{
				href: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
				key: '$schema',
				value: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
			},
			{ key: 'name', value: 'caldir' },
			{ key: 'version', value: '1.0.0' },
			{
				key: 'description',
				value: 'Read, create, edit, and sync calendar events as plaintext .ics files'
			},
			{ href: 'https://caldir.org', key: 'homepage', value: 'https://caldir.org' },
			{ key: 'keywords', value: 'calendar, ics, caldav' }
		],
		name: 'Caldir',
		skills: [
			{
				description: 'Read, create, edit, and sync calendar events as plaintext .ics files.',
				name: 'caldir',
				sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/caldir/skills/caldir/SKILL.md`
			}
		],
		slug: 'caldir',
		sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/caldir`
	}
];

export function getTilesPlugin(slug: string): TilesPlugin | undefined {
	return TILES_PLUGINS.find((plugin) => plugin.slug === slug);
}
