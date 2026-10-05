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
	/** what the daemon installs from */
	downloadUrl: string;
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
		downloadUrl: `${PLUGIN_DOWNLOAD_BASE_URL}/exa.zip`,
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
		downloadUrl: `${PLUGIN_DOWNLOAD_BASE_URL}/caldir.zip`,
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
	},
	{
		description: 'Manage Cloudflare resources and Workers projects with the Cloudflare CLI.',
		downloadUrl: `${PLUGIN_DOWNLOAD_BASE_URL}/cloudflare.zip`,
		installCommand: `tiles plugin install ${PLUGIN_DOWNLOAD_BASE_URL}/cloudflare.zip`,
		mcpServers: [],
		metadata: [
			{
				href: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
				key: '$schema',
				value: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
			},
			{
				key: 'name',
				value: 'cloudflare'
			},
			{
				key: 'version',
				value: '1.0.0'
			},
			{
				key: 'description',
				value: 'Manage Cloudflare resources and Workers projects with the Cloudflare CLI.'
			},
			{
				key: 'author',
				value: '{"name":"Tiles Privacy","url":"https://tiles.run"}'
			},
			{
				href: 'https://developers.cloudflare.com/cf/',
				key: 'homepage',
				value: 'https://developers.cloudflare.com/cf/'
			},
			{
				href: 'https://github.com/tilesprivacy/plugins',
				key: 'repository',
				value: 'https://github.com/tilesprivacy/plugins'
			},
			{
				key: 'license',
				value: 'MIT'
			},
			{
				key: 'keywords',
				value: 'cloudflare, workers, dns, storage, cli'
			}
		],
		name: 'Cloudflare',
		skills: [
			{
				description:
					'Manage Cloudflare resources and Workers projects with the cf CLI. Use for Cloudflare account, zone, DNS, storage, security, or Worker development and deployment tasks; discover current commands and schemas before acting.',
				name: 'cloudflare',
				sourceUrl:
					'https://github.com/tilesprivacy/plugins/blob/main/cloudflare/skills/cloudflare/SKILL.md'
			}
		],
		slug: 'cloudflare',
		sourceUrl: 'https://github.com/tilesprivacy/plugins/blob/main/cloudflare'
	},
	{
		description: 'Search, read, and organize your Obsidian vault with the Obsidian CLI.',
		downloadUrl: `${PLUGIN_DOWNLOAD_BASE_URL}/obsidian.zip`,
		installCommand: `tiles plugin install ${PLUGIN_DOWNLOAD_BASE_URL}/obsidian.zip`,
		mcpServers: [],
		metadata: [
			{
				href: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
				key: '$schema',
				value: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
			},
			{
				key: 'name',
				value: 'obsidian'
			},
			{
				key: 'version',
				value: '1.0.0'
			},
			{
				key: 'description',
				value: 'Search, read, and organize your Obsidian vault with the Obsidian CLI.'
			},
			{
				key: 'author',
				value: '{"name":"Tiles Privacy","url":"https://tiles.run"}'
			},
			{
				href: 'https://obsidian.md/cli',
				key: 'homepage',
				value: 'https://obsidian.md/cli'
			},
			{
				href: 'https://github.com/tilesprivacy/plugins',
				key: 'repository',
				value: 'https://github.com/tilesprivacy/plugins'
			},
			{
				key: 'license',
				value: 'MIT'
			},
			{
				key: 'keywords',
				value: 'obsidian, notes, knowledge-management, cli'
			}
		],
		name: 'Obsidian',
		skills: [
			{
				description:
					'Work with Obsidian notes, daily notes, tasks, properties, and links through the Obsidian CLI. Use when the user asks to search, read, create, or organize content in an Obsidian vault.',
				name: 'obsidian',
				sourceUrl:
					'https://github.com/tilesprivacy/plugins/blob/main/obsidian/skills/obsidian/SKILL.md'
			}
		],
		slug: 'obsidian',
		sourceUrl: 'https://github.com/tilesprivacy/plugins/blob/main/obsidian'
	}
];

export function getTilesPlugin(slug: string): TilesPlugin | undefined {
	return TILES_PLUGINS.find((plugin) => plugin.slug === slug);
}
