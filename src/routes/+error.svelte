<script lang="ts">
	import { page } from '$app/state';
</script>

<section>
	<p class="plate">{page.status === 404 ? 'Not found' : 'Something went wrong'}</p>
	{#if page.status !== 404 && page.error}<p class="muted">{page.error.message}</p>{/if}
	<a class="plate signal" href="/">Go home</a>
</section>

<style>
	section {
		flex: 1;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 14px;
	}

	p.plate {
		cursor: default;
	}

	a {
		text-decoration: none;
	}
</style>
