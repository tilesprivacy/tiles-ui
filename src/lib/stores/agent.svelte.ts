/**
 * agentStore - what the daemon's agent is running right now.
 *
 * Model switching is off, so the model comes from the modelfile the agent was
 * started with, not from a selector. It only changes when the agent reloads,
 * which is why callers that reload it refresh this afterwards.
 */

import { browser } from '$app/environment';
import { TilekitService } from '$lib/services/tilekit.service';

class AgentStore {
	/** the full `org/repo:quant` spec, null until the daemon answers */
	model = $state<string | null>(null);

	async refresh(): Promise<void> {
		if (!browser) return;

		try {
			const state = await TilekitService.agentState();

			this.model = state.model?.id || state.model?.name || null;
		} catch {
			// no daemon or no agent yet; keep what was shown last
		}
	}
}

export const agentStore = new AgentStore();
