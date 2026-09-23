/**
 * onboardingStore - getting a new install to a working chat.
 *
 * A new account goes through three steps: the account itself, an optional
 * Atmosphere login, and a model. Once a download is under way the app opens
 * and the download carries on behind it; someone whose model later goes
 * missing only sees the model step. The models themselves live in
 * modelLibraryStore.
 */

import { modelLibraryStore } from '$lib/stores/model-library.svelte';

class OnboardingStore {
	atmosphereDone = $state(false);
	/** chose to look around while the model downloads */
	exploring = $state(false);
	/** set when this session created the account, which starts the full flow */
	newAccount = $state(false);
	/** started the download from the step and is watching it there */
	watching = $state(false);

	get showAtmosphere(): boolean {
		return this.newAccount && !this.atmosphereDone;
	}

	/** the model step, while no model is ready and nothing is on its way */
	get showModel(): boolean {
		if (this.showAtmosphere) return false;

		const library = modelLibraryStore;

		if (library.hasModel || this.exploring) return false;

		// a download found on arrival opens the app; one just started stays in view
		if (library.downloading) return this.watching;

		if (this.newAccount) return true;

		return library.status !== null;
	}

	accountCreated(): void {
		this.newAccount = true;
		void modelLibraryStore.refresh();
	}

	explore(): void {
		this.exploring = true;
		this.watching = false;
	}

	finishAtmosphere(): void {
		this.atmosphereDone = true;
	}

	watch(): void {
		this.watching = true;
	}
}

export const onboardingStore = new OnboardingStore();
