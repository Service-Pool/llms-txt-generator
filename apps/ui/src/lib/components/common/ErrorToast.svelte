<script lang="ts">
	import { errorStore } from '$lib/stores/error.store';

	const errors = errorStore;
</script>

<div class="fixed top-4 right-4 z-50 space-y-2">
	{#each $errors as error (error.id)}
		<div
			class="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 max-w-md animate-slide-in"
		>
			<svg
				class="w-5 h-5 shrink-0 mt-0.5"
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path
					fill-rule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
					clip-rule="evenodd"
				/>
			</svg>
			<div class="flex-1">
				<p class="font-medium text-sm">{error.message}</p>
			</div>
			<button
				type="button"
				onclick={() => errors.remove(error.id)}
				class="text-white hover:text-gray-200 transition-colors"
				aria-label="Close error notification"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}
</style>
