type Toast = { id: number; text: string; action?: { label: string; run: () => void } };

class Toasts {
	list = $state<Toast[]>([]);
	#next = 0;

	show(text: string, action?: Toast['action']) {
		const id = ++this.#next;
		this.list.push({ id, text, action });
		setTimeout(() => this.dismiss(id), action ? 8000 : 4000);
	}

	dismiss(id: number) {
		this.list = this.list.filter((toast) => toast.id !== id);
	}
}

export const toasts = new Toasts();
