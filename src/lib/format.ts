// decimal units, the way the CLI and file managers count
export function size(bytes: number | null | undefined) {
	if (!bytes) return '0 GB';
	return bytes >= 1e9
		? `${(bytes / 1e9).toFixed(1)} GB`
		: `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

export function timeLeft(done: number, total: number, perSecond: number) {
	if (!perSecond) return '';
	const seconds = Math.round((total - done) / perSecond);
	if (seconds < 60) return `${seconds} s left`;
	const minutes = Math.floor(seconds / 60);
	return minutes < 60
		? `${minutes} min ${seconds % 60} s left`
		: `${Math.floor(minutes / 60)} h ${minutes % 60} min left`;
}

export const percent = (done: number, total: number) =>
	total ? Math.floor((done / total) * 100) : 0;
