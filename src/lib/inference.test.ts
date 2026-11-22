import { expect, test } from 'vitest';
import {
	CONTEXT_STOPS,
	canBeAutomatic,
	changed,
	defaultLabel,
	inUse,
	kilo,
	nearestStop,
	refusal
} from './inference.ts';
import type { LlamaSetting } from './types.ts';

const setting = (over: Partial<LlamaSetting>): LlamaSetting => ({
	name: 'batch_size',
	label: 'Batch size',
	value: null,
	default: '2048',
	kind: 'number',
	min: 1,
	help: '',
	...over
});

test('an unset setting uses its default and is not changed', () => {
	const unset = setting({});
	expect(inUse(unset)).toBe('2048');
	expect(changed(unset)).toBe(false);
});

test('a setting saved at its default value is not changed', () => {
	expect(changed(setting({ value: 2048 }))).toBe(false);
	expect(changed(setting({ value: 512 }))).toBe(true);
	expect(changed(setting({ kind: 'flag', default: 'true', value: true }))).toBe(false);
	expect(changed(setting({ kind: 'flag', default: 'true', value: false }))).toBe(true);
});

test('only a number with a default like auto can be automatic', () => {
	expect(canBeAutomatic(setting({ default: 'auto', min: -1 }))).toBe(true);
	expect(canBeAutomatic(setting({}))).toBe(false);
	expect(canBeAutomatic(setting({ kind: 'choice', default: 'auto' }))).toBe(false);
});

test('context sizes read in k', () => {
	expect(CONTEXT_STOPS.map(kilo)).toEqual(['4k', '8k', '16k', '32k', '64k', '128k']);
	expect(kilo(64000)).toBe('62.5k');
});

test('a context size lands on its nearest stop, inside the slider', () => {
	expect(nearestStop(65536)).toBe(4);
	expect(nearestStop(64000)).toBe(4);
	expect(nearestStop(4096)).toBe(0);
	// set outside the app, past either end
	expect(nearestStop(262144)).toBe(5);
	expect(nearestStop(1024)).toBe(0);
});

test('a typed number is refused when it is not whole or below the minimum', () => {
	expect(refusal('512', 1)).toBe('');
	expect(refusal(' 512 ', 1)).toBe('');
	expect(refusal('-1', -1)).toBe('');
	expect(refusal('0', 1)).toBe("Can't be less than 1");
	expect(refusal('1.5', 1)).toBe('Needs a whole number');
	expect(refusal('', 1)).toBe('Needs a whole number');
	expect(refusal('lots', undefined)).toBe('Needs a whole number');
});

test('a default is shown the way its row shows values', () => {
	expect(defaultLabel(setting({ kind: 'flag', default: 'false' }))).toBe('off');
	expect(defaultLabel(setting({ kind: 'flag', default: 'true' }))).toBe('on');
	expect(defaultLabel(setting({}))).toBe('2048');
	const loadMode = setting({
		kind: 'choice',
		default: 'auto',
		choices: [
			{ value: 'auto', label: 'Auto' },
			{ value: 'mmap', label: 'Memory map' }
		]
	});
	expect(defaultLabel(loadMode)).toBe('Auto');
});
