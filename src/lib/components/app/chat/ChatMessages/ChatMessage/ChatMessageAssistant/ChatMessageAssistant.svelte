<script lang="ts">
	import {
		ChatMessageActionIcons,
		ChatMessageAgenticContent,
		ChatMessageAssistantModel,
		ChatMessageAssistantProcessingInfo,
		ChatMessageAssistantRawOutput,
		ChatMessageAssistantStatistics,
		ChatMessageEditForm
	} from '$lib/components/app';
	import { getChatMessageEditContext } from '$lib/contexts';
	import { MessageRole } from '$lib/enums';
	import { useProcessingState } from '$lib/hooks/use-processing-state.svelte';
	import { chatStore, modelsStore, serverStore, settingsStore } from '$lib/stores';
	import { modelLoadProgressText } from '$lib/utils';
	import { hasAgenticContent } from '$lib/utils';

	interface Props {
		class?: string;
		isLastAssistantMessage?: boolean;
		message: DatabaseMessage;
		toolMessages?: DatabaseMessage[];
		onContinue?: () => void;
		onRegenerate: (modelOverride?: string) => void;
		textareaElement?: HTMLTextAreaElement;
	}

	let {
		class: className = '',
		isLastAssistantMessage = false,
		message,
		onContinue,
		onRegenerate,
		textareaElement = $bindable(),
		toolMessages = []
	}: Props = $props();

	// Get edit context
	const editCtx = getChatMessageEditContext();

	const isAgentic = $derived(hasAgenticContent(message, toolMessages));
	const processingState = useProcessingState();

	let currentConfig = $derived(settingsStore.config);
	let isRouter = $derived(serverStore.isRouterMode);

	let showRawOutput = $state(false);

	let displayedModel = $derived(message.model ?? null);

	let isCurrentlyLoading = $derived(chatStore.isLoading);
	let isStreaming = $derived(chatStore.isStreaming());
	let hasNoContent = $derived(!message?.content?.trim());
	let isActivelyProcessing = $derived(isCurrentlyLoading || isStreaming);

	// during a router auto-load the message has no model yet: target the model frozen in the
	// persisted stream state (survives a reload), then fall back to the dropdown selection
	let loadTargetModel = $derived(
		message.model ?? chatStore.getResumeModel(message.convId) ?? modelsStore.selectedModelName
	);
	let modelLoadProgress = $derived(
		isRouter && loadTargetModel ? modelsStore.status.getLoadProgress(loadTargetModel) : null
	);
	let modelLoadingText = $derived(modelLoadProgressText(modelLoadProgress));

	let showProcessingInfoTop = $derived(
		message?.role === MessageRole.ASSISTANT &&
			isActivelyProcessing &&
			hasNoContent &&
			!isAgentic &&
			isLastAssistantMessage
	);

	let showProcessingInfoBottom = $derived(
		message?.role === MessageRole.ASSISTANT &&
			isActivelyProcessing &&
			(!hasNoContent || isAgentic) &&
			isLastAssistantMessage
	);

	let assistantEl: HTMLDivElement | undefined = $state();
	let assistantMarginTop = $state(0);

	$effect(() => {
		if (!assistantEl) return;

		assistantMarginTop = Math.round(parseFloat(getComputedStyle(assistantEl).marginTop));
	});

	$effect(() => {
		if (showProcessingInfoTop || showProcessingInfoBottom) {
			processingState.startMonitoring();
		}
	});
</script>

<div
	bind:this={assistantEl}
	style:--assistant-margin-top={assistantMarginTop > 0 ? `${assistantMarginTop}px` : undefined}
	aria-label="Assistant message with actions"
	class="chat-message-assistant text-md group w-full leading-7.5 {className}"
	role="group"
>
	{#if showProcessingInfoTop}
		<ChatMessageAssistantProcessingInfo {modelLoadingText} position="top" {processingState} />
	{/if}

	{#if editCtx.isEditing}
		<ChatMessageEditForm />
	{:else}
		{#if showRawOutput}
			<ChatMessageAssistantRawOutput {message} {toolMessages} />
		{:else}
			<ChatMessageAgenticContent
				{isLastAssistantMessage}
				isStreaming={chatStore.isStreaming()}
				{message}
				{toolMessages}
			/>
		{/if}
	{/if}

	{#if message.errorMessage}
		<p class="text-destructive my-2 text-sm">{message.errorMessage}</p>
	{/if}

	{#if showProcessingInfoBottom}
		<ChatMessageAssistantProcessingInfo {modelLoadingText} position="bottom" {processingState} />
	{/if}

	{#if displayedModel}
		<div class="info my-6 grid gap-4 tabular-nums">
			<div class="inline-flex flex-wrap items-start gap-2 text-xs text-muted-foreground">
				<ChatMessageAssistantModel
					{displayedModel}
					isLoading={chatStore.isLoading}
					{isRouter}
					{onRegenerate}
				/>

				<ChatMessageAssistantStatistics
					isLoading={chatStore.isLoading}
					{message}
					{processingState}
					showMessageStats={currentConfig.showMessageStats}
				/>
			</div>
		</div>
	{/if}

	{#if message.timestamp && !editCtx.isEditing}
		<ChatMessageActionIcons
			actionsPosition="left"
			justify="start"
			onContinue={currentConfig.enableContinueGeneration ? onContinue : undefined}
			onRawOutputToggle={(enabled) => (showRawOutput = enabled)}
			{onRegenerate}
			rawOutputEnabled={showRawOutput}
			role={MessageRole.ASSISTANT}
			showRawOutputSwitch={currentConfig.showRawOutputSwitch}
		/>
	{/if}
</div>
