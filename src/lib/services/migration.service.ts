/**
 * Runs one-off data migrations at startup.
 *
 * Each migration is registered here, runs at most once, and records its
 * outcome in localStorage so it is never repeated. Migrations should copy
 * rather than delete, so an older build can still read the data.
 */

import { STORAGE_APP_NAME } from '$lib/constants';

interface Migration {
	/** Unique identifier for this migration */
	id: string;
	/** Human-readable description */
	description: string;
	/** Run the migration forward (non-destructive - copies, doesn't delete) */
	run(): Promise<void>;
}

interface MigrationState {
	completed: string[];
	failed: string[];
	lastRun: string;
}

// Constants

const MIGRATION_STATE_KEY = `${STORAGE_APP_NAME}.migration-state`;
const MIGRATION_STATE_VERSION = 1;

// State Management

function getMigrationState(): MigrationState {
	try {
		const raw = localStorage.getItem(MIGRATION_STATE_KEY);

		if (!raw) return { completed: [], failed: [], lastRun: '' };

		const parsed = JSON.parse(raw);

		if (parsed.version !== MIGRATION_STATE_VERSION) {
			return { completed: [], failed: [], lastRun: '' };
		}

		return {
			completed: parsed.completed ?? [],
			failed: parsed.failed ?? [],
			lastRun: parsed.lastRun ?? ''
		};
	} catch {
		return { completed: [], failed: [], lastRun: '' };
	}
}

function saveMigrationState(state: MigrationState): void {
	localStorage.setItem(
		MIGRATION_STATE_KEY,
		JSON.stringify({
			version: MIGRATION_STATE_VERSION,
			...state,
			lastRun: new Date().toISOString()
		})
	);
}

function isMigrationCompleted(id: string): boolean {
	const state = getMigrationState();

	return state.completed.includes(id);
}

function markMigrationCompleted(id: string): void {
	const state = getMigrationState();

	if (!state.completed.includes(id)) {
		state.completed.push(id);
	}

	state.failed = state.failed.filter((f) => f !== id);
	saveMigrationState(state);
}

function markMigrationFailed(id: string): void {
	const state = getMigrationState();

	if (!state.failed.includes(id)) {
		state.failed.push(id);
	}

	saveMigrationState(state);
}

const migrations: Migration[] = [];

export const MigrationService = {
	/**
	 * Get all registered migrations
	 */
	getMigrations(): Migration[] {
		return [...migrations];
	},

	/**
	 * Get current migration state
	 */
	getState(): MigrationState {
		return getMigrationState();
	},

	/**
	 * Check if a specific migration has been completed
	 */
	isCompleted(id: string): boolean {
		return isMigrationCompleted(id);
	},

	/**
	 * Reset migration state (use with caution - migrations will run again)
	 */
	resetState(): void {
		localStorage.removeItem(MIGRATION_STATE_KEY);

		if (import.meta.env.DEV && import.meta.env.VITE_DEBUG)
			console.log('[Migration] State reset - all migrations will run again');
	},

	/**
	 * Run all pending migrations (non-destructive - preserves legacy data)
	 * Should be called once at app initialization
	 */
	async runAllMigrations(): Promise<void> {
		const state = getMigrationState();

		if (import.meta.env.DEV && import.meta.env.VITE_DEBUG)
			console.log('[Migration] Starting migration run, state:', state);

		for (const migration of migrations) {
			if (isMigrationCompleted(migration.id)) {
				if (import.meta.env.DEV && import.meta.env.VITE_DEBUG)
					console.log(`[Migration] ${migration.id}: already completed, skipping`);

				continue;
			}

			try {
				if (import.meta.env.DEV && import.meta.env.VITE_DEBUG)
					console.log(`[Migration] ${migration.id}: running...`);

				await migration.run();
				markMigrationCompleted(migration.id);

				if (import.meta.env.DEV && import.meta.env.VITE_DEBUG)
					console.log(`[Migration] ${migration.id}: completed successfully`);
			} catch (error) {
				console.error(`[Migration] ${migration.id}: failed`, error);
				markMigrationFailed(migration.id);
			}
		}

		if (import.meta.env.DEV && import.meta.env.VITE_DEBUG)
			console.log('[Migration] All migrations complete');
	}
};
