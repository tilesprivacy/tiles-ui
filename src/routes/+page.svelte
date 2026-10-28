<script lang="ts">
	import logo from '#lib/assets/logo.svg?raw';
</script>

<main>
	<div class="logo">{@html logo}</div>
</main>

<style>
	main {
		display: grid;
		place-items: center;
		height: 100%;
	}

	.logo {
		width: 48px;
		color: var(--signal);
	}
</style>
