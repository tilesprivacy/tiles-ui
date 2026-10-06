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
	documentationUrl?: string;
	/** what the daemon installs from */
	downloadUrl: string;
	installCommand: string;
	metadata: TilesPluginMetadataField[];
	mcpServers: TilesPluginMcpServer[];
	name: string;
	requirements?: string;
	skills: TilesPluginSkill[];
	slug: string;
	sourceUrl: string;
}

const PLUGIN_DOWNLOAD_BASE_URL = 'https://download.tiles.run/plugins';
const PLUGIN_SOURCE_BASE_URL = 'https://github.com/tilesprivacy/plugins/blob/main';

export const TILES_PLUGINS: TilesPlugin[] = [
	{
		description: 'Web search and content extraction powered by Exa AI',
		documentationUrl: 'https://exa.ai/docs/reference/exa-mcp',
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
					'Research a topic on the web across several sources, verify a claim, or dig past search snippets into full pages. Use for questions needing current information, comparisons, or more than one source. Not needed for a single quick lookup.',
				name: 'web-research',
				sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/exa/skills/web-research/SKILL.md`
			}
		],
		slug: 'exa',
		sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/exa`
	},
	{
		description: 'Caldir is a tool for storing your calendar as a directory of ICS files',
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
				description:
					'Read, create, edit, and sync calendar events as plaintext .ics files using the caldir CLI. Use whenever the user wants to query, add, modify, or sync calendar events — e.g. "what\'s on my calendar this week", "add a meeting tomorrow at 3", "cancel my Friday standup", "sync my Google calendar". Requires the `caldir` CLI.',
				name: 'caldir',
				sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/caldir/skills/caldir/SKILL.md`
			}
		],
		slug: 'caldir',
		sourceUrl: `${PLUGIN_SOURCE_BASE_URL}/caldir`
	},
	{
		description: 'Manage Cloudflare resources and Workers projects with the Cloudflare CLI',
		documentationUrl: 'https://developers.cloudflare.com/cf/',
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
		requirements:
			'Requires the Cloudflare CLI (cf) installed and authenticated with access to the Cloudflare account you want to manage. The CLI is currently in beta.',
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
		description: 'Search, read, and organize your Obsidian vault with the Obsidian CLI',
		documentationUrl: 'https://obsidian.md/cli',
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
		requirements:
			'Requires the Obsidian desktop app to be running, with the command line interface enabled and registered in your PATH.',
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
	},
	{
		description: 'Search and read your journal',
		documentationUrl: 'https://github.com/solpbc/solstone-tiles#connect-tiles-to-your-journal',
		downloadUrl: `${PLUGIN_DOWNLOAD_BASE_URL}/solstone.zip`,
		installCommand: `tiles plugin install ${PLUGIN_DOWNLOAD_BASE_URL}/solstone.zip`,
		mcpServers: [
			{
				endpoint: 'http://127.0.0.1:7659/mcp',
				name: 'journal',
				type: 'Streamable HTTP'
			}
		],
		metadata: [
			{
				href: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
				key: '$schema',
				value: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'
			},
			{ key: 'name', value: 'solstone' },
			{ key: 'version', value: '0.1.1' },
			{
				key: 'description',
				value: 'Search and read your journal from Tiles, on the computer where your journal lives.'
			},
			{ href: 'https://solstone.app', key: 'homepage', value: 'https://solstone.app' },
			{
				href: 'https://github.com/solpbc/solstone-tiles',
				key: 'repository',
				value: 'https://github.com/solpbc/solstone-tiles'
			},
			{ key: 'license', value: 'AGPL-3.0-only' },
			{ href: 'https://solpbc.org', key: 'author', value: 'sol pbc' },
			{ key: 'keywords', value: 'solstone, journal, memory, mcp' }
		],
		name: 'Solstone',
		requirements:
			'Requires Solstone journal 2.0.24 or later and a Tiles build with plugin support, such as the canary channel, on the same computer. In your journal, open agents > connect an agent and create a pairing code, choosing on this computer if asked. Within 10 minutes, enter /mcp-auth solstone__journal in Tiles chat, then choose what to share and enter the code on the journal page that opens.',
		skills: [
			{
				description:
					"Answer questions about the owner's own past (what they said, heard or planned, and who someone is) from their journal. Use whenever a question is about the owner's life, conversations, people or plans.",
				name: 'solstone-memory',
				sourceUrl:
					'https://github.com/solpbc/solstone-tiles/blob/main/skills/solstone-memory/SKILL.md'
			}
		],
		slug: 'solstone',
		sourceUrl: 'https://github.com/solpbc/solstone-tiles/blob/main'
	}
];

export function getTilesPlugin(slug: string): TilesPlugin | undefined {
	return TILES_PLUGINS.find((plugin) => plugin.slug === slug);
}
