/**
 * PropsService - Fetches server properties from /props
 *
 * Returns global server settings and capabilities, including per-model
 * modalities in MODEL mode. No reactive state; consumed by serverStore and
 * the model props manager.
 */

import { ServerRole } from '$lib/enums';
import { FEATURES } from '$lib/features';
import { apiFetchWithParams } from '$lib/utils';

/**
 * Stand-in for what `/props` would return. Tiles has no such endpoint, and the
 * store only ever reads a handful of these fields, so a partial object is
 * enough to keep the app out of its "server is broken" state.
 */
const TILES_PROPS = {
	modalities: { audio: false, video: false, vision: false },
	role: ServerRole.MODEL
} as unknown as ApiServerProps;

export class PropsService {
	/**
	 * Fetches global server properties from the `/props` endpoint.
	 * In MODEL mode, returns modalities for the single loaded model.
	 * In ROUTER mode, returns server-wide settings without model-specific modalities.
	 *
	 * @param autoload - If false, prevents automatic model loading (default: false)
	 * @returns Server properties including default generation settings and capabilities
	 * @throws {Error} If the request fails or returns invalid data
	 */
	static async fetch(autoload = false): Promise<ApiServerProps> {
		if (!FEATURES.SERVER_PROPS) return TILES_PROPS;

		const params: Record<string, string> = {};

		if (!autoload) {
			params.autoload = 'false';
		}

		return apiFetchWithParams<ApiServerProps>('./props', params, { authOnly: true });
	}

	/**
	 * Fetches server properties for a specific model (ROUTER mode only).
	 * Required in ROUTER mode because global `/props` does not include per-model modalities.
	 *
	 * @param modelId - The model ID to fetch properties for
	 * @param autoload - If false, prevents automatic model loading (default: false)
	 * @returns Server properties specific to the requested model
	 * @throws {Error} If the request fails, model not found, or model not loaded
	 */
	static async fetchForModel(modelId: string, autoload = false): Promise<ApiServerProps> {
		if (!FEATURES.SERVER_PROPS) return TILES_PROPS;

		const params: Record<string, string> = { model: modelId };

		if (!autoload) {
			params.autoload = 'false';
		}

		return apiFetchWithParams<ApiServerProps>('./props', params, { authOnly: true });
	}
}
