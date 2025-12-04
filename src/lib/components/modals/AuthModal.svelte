<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	const {
		email = '',
		password = '',
		loading = false,
		errorMessage = '',
		successMessage = '',
		onEmailChange = () => {},
		onPasswordChange = () => {},
		submitEmail = () => {},
		onClose = () => {},
		onBackdropClick = () => {},
		onKeydown = () => {}
	} = $props<{
		email: string;
		password: string;
		loading?: boolean;
		errorMessage?: string;
		successMessage?: string;
		onEmailChange?: (value: string) => void;
		onPasswordChange?: (value: string) => void;
		submitEmail?: (event: SubmitEvent) => void;
		onClose?: () => void;
		onBackdropClick?: (event: MouseEvent) => void;
		onKeydown?: (event: KeyboardEvent) => void;
	}>();
</script>

<div
	in:fade={{ duration: 200 }}
	out:fade={{ duration: 100 }}
	class="fixed inset-0 z-[120] flex items-center justify-center bg-stone-50/80"
	role="dialog"
	aria-modal="true"
	aria-label="Sign up"
	tabindex="-1"
	onclick={onBackdropClick}
	onkeydown={onKeydown}
>
	<div
		in:scale={{ start: 0.9, duration: 200 }}
		class="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 text-stone-800 shadow-[0_12px_32px_rgba(15,15,15,0.12)]"
	>
		<div class="flex items-center justify-between">
			<div class="text-sm font-semibold tracking-tight text-stone-900">
				Create your Nexus account
			</div>
			<button
				type="button"
				class="rounded-full p-1 text-stone-500 hover:text-stone-800"
				onclick={onClose}
				aria-label="Close sign up"
			>
				<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M6 6l12 12M6 18L18 6" stroke-linecap="round" />
				</svg>
			</button>
		</div>

		<p class="mt-2 text-xs text-stone-500">
			Enter email and password to sign in or create your account in seconds.
		</p>

		<form class="mt-5 space-y-4" onsubmit={submitEmail}>
			<label class="block text-xs font-semibold tracking-wide text-stone-500 uppercase">
				Email
				<input
					type="email"
					required
					class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:border-stone-400"
					placeholder="you@example.com"
					value={email}
					oninput={(event) => {
						const target = event.target as HTMLInputElement;
						onEmailChange(target.value);
					}}
					autocomplete="email"
				/>
			</label>
			<label class="block text-xs font-semibold tracking-wide text-stone-500 uppercase">
				Password
				<input
					type="password"
					required
					minlength="8"
					class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:border-stone-400"
					placeholder="••••••••"
					value={password}
					oninput={(event) => {
						const target = event.target as HTMLInputElement;
						onPasswordChange(target.value);
					}}
					autocomplete="new-password"
				/>
			</label>
			{#if errorMessage}
				<p class="text-sm text-rose-600" aria-live="assertive">{errorMessage}</p>
			{/if}
			{#if successMessage}
				<p class="text-sm text-emerald-600" aria-live="polite">{successMessage}</p>
			{/if}
			<button
				type="submit"
				class="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={loading}
			>
				{#if loading}
					Creating account...
				{:else}
					Create account
				{/if}
			</button>
		</form>
	</div>
</div>
