<svelte:options runes={true} />

<script lang="ts">
	import { errorStore } from '$lib/stores/error.store.svelte';
	import { Toast, ToastContainer } from 'flowbite-svelte';
	import { fly } from 'svelte/transition';
	import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

	function handleClose(id: string) {
		return () => {
			errorStore.dismiss(id);
		};
	}
</script>

<ToastContainer position="top-right">
	{#each errorStore.value as error (error.id)}
		<Toast
			color="red"
			dismissable={true}
			transition={fly}
			params={{ x: 200, duration: 600 }}
			onclose={handleClose(error.id)}
			bind:toastStatus={error.visible}
			class="max-w-md"
		>
			{#snippet icon()}
				<ExclamationCircleOutline size="md" />
			{/snippet}
			<span class="font-medium text-sm">{error.message}</span>
		</Toast>
	{/each}
</ToastContainer>
