<script lang="ts">
	import { errorStore } from "$lib/stores/error.store";
	import { Toast, ToastContainer } from "flowbite-svelte";
	import { fly } from "svelte/transition";
	import { ExclamationCircleOutline } from "flowbite-svelte-icons";

	const errors = errorStore;
</script>

<ToastContainer position="top-right">
	{#each $errors as error (error.id)}
		<Toast
			color="red"
			dismissable={true}
			transition={fly}
			params={{ x: 200, duration: 300 }}
			onclose={() => errors.remove(error.id)}
			class="max-w-md">
			{#snippet icon()}
				<ExclamationCircleOutline class="h-5 w-5" />
			{/snippet}
			<span class="font-medium text-sm">{error.message}</span>
		</Toast>
	{/each}
</ToastContainer>
