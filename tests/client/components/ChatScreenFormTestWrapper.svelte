<script lang="ts">
	import ChatScreenForm from '$lib/components/app/chat/ChatScreen/ChatScreenForm.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';

	let { onSend }: { onSend?: (message: string, files?: ChatUploadedFile[]) => Promise<boolean> } =
		$props();
</script>

<Tooltip.Provider>
	<ChatScreenForm {onSend} />
</Tooltip.Provider>
