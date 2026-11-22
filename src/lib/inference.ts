import type { LlamaSetting } from './types.ts';

// the context sizes the slider stops at. every model Tiles ships takes up to 128k
export const CONTEXT_STOPS = [4096, 8192, 16384, 32768, 65536, 131072];

// what's in use, the default while nothing is set
export const inUse = (setting: LlamaSetting) => String(setting.value ?? setting.default);

export const changed = (setting: LlamaSetting) =>
	setting.value !== null && String(setting.value) !== setting.default;

// a number with "auto" for a default can be left to llama.cpp
export const canBeAutomatic = (setting: LlamaSetting) =>
	setting.kind === 'number' && !isWholeNumber(setting.default);

const isWholeNumber = (text: string) => /^-?\d+$/.test(text.trim());

// 65536 tokens is 64k
export function kilo(tokens: number) {
	const k = tokens / 1024;
	return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

// the stop nearest a context size. sizes double from one stop to the next
export function nearestStop(tokens: number) {
	const stop = Math.round(Math.log2(tokens / CONTEXT_STOPS[0]));
	return Math.min(Math.max(stop, 0), CONTEXT_STOPS.length - 1);
}

// why a typed number can't be saved, empty when it can
export function refusal(text: string, min: number | undefined) {
	if (!isWholeNumber(text)) return 'Needs a whole number';
	if (min !== undefined && Number(text) < min) return `Can't be less than ${min}`;
	return '';
}

// a default the way its row shows it: on or off, a choice's name, the number
export function defaultLabel(setting: LlamaSetting) {
	if (setting.kind === 'flag') return setting.default === 'true' ? 'on' : 'off';
	return setting.choices?.find((c) => c.value === setting.default)?.label ?? setting.default;
}
