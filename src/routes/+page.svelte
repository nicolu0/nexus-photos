<script lang="ts">
	import AlertPin from '$lib/components/landing/AlertPin.svelte';
	import AuthModal from '$lib/components/modals/AuthModal.svelte';
	import TopoMap from '$lib/components/landing/TopoMap.svelte';
	import nexusLogo from '$lib/assets/nexus.svg';
	import { goto } from '$app/navigation';
	import supabase from '$lib/supabaseClient';

	let showAuthModal = $state(false);
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	function openModal() {
		showAuthModal = true;
	}

	function closeModal() {
		showAuthModal = false;
		email = '';
		password = '';
		loading = false;
		errorMessage = '';
		successMessage = '';
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closeModal();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeModal();
	}

	async function submitEmail(e: SubmitEvent) {
		e.preventDefault();
		if (loading) return;
		errorMessage = '';
		successMessage = '';

		if (!email || !password) {
			errorMessage = 'Email and password are required.';
			return;
		}

		loading = true;

		try {
			const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (!signInError) {
				const userEmail = signInData.user?.email ?? email;
				successMessage = `Signed in as ${userEmail}. Redirecting...`;
				closeModal();
				await goto('/todo', {
					state: { user: signInData }
				});
				return;
			}

			const { error: signUpError } = await supabase.auth.signUp({ email, password });

			if (signUpError) {
				if (/already registered/i.test(signUpError.message)) {
					throw new Error('Incorrect password for this email.');
				}
				throw signUpError;
			}

			successMessage = 'Account created! Check your inbox to verify your email.';
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Unable to sign up right now. Please try again later.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex min-h-screen w-full flex-col bg-stone-50 pt-10 font-sans text-stone-900">
	<!-- Header -->
	<nav
		class="fixed top-6 right-0 left-0 z-50 mx-auto w-full max-w-7xl rounded-xl border border-stone-200/50 bg-stone-50/60 px-4 py-2 shadow-sm backdrop-blur-md transition-all duration-200"
	>
		<div class="container mx-auto flex items-center justify-between">
			<div class="flex items-center gap-0.5">
				<img src={nexusLogo} alt="Nexus logo" class="h-8 w-8" />
				<span class="text-lg font-medium tracking-tight text-stone-700">Nexus</span>
			</div>
			<div class="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex">
				<a href="#features" class="transition-colors hover:text-stone-900">Features</a>
				<a href="#how-it-works" class="transition-colors hover:text-stone-900">How it works</a>
				<a href="#pricing" class="transition-colors hover:text-stone-900">Pricing</a>
				<button
					type="button"
					onclick={openModal}
					class="rounded-lg bg-stone-800 px-4 py-2 text-stone-50 transition hover:bg-stone-900"
				>
					Sign up
				</button>
			</div>
		</div>
	</nav>

	<!-- Hero -->
	<section class="relative flex min-h-screen w-full items-center overflow-hidden pb-20">
		<TopoMap />

		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-5 h-64
         bg-linear-to-b from-transparent via-stone-50/80 to-stone-50"
			aria-hidden="true"
		></div>

		<!-- pins overlay -->
		<div class="pointer-events-none absolute inset-0 z-10 mx-auto max-w-7xl">
			<div class="pointer-events-auto relative h-full w-full">
				<AlertPin top="22%" left="14%" delay={600} severity="high" message="Basement Flooded" />
				<AlertPin top="32%" left="95%" delay={1000} severity="medium" message="Toilet Clogged" />
				<AlertPin top="58%" left="85%" delay={1400} severity="low" message="Photos Uploaded" />
			</div>
		</div>

		<div class="relative z-10 container mx-auto flex flex-col items-center px-4">
			<div class="max-w-6xl">
				<h1
					class="mb-6 text-6xl font-medium tracking-tight text-balance text-stone-800 md:text-7xl"
				>
					Effortless <span class="font-bold text-stone-800">AB2801</span> Compliance for Property Managers
				</h1>
				<p class="mb-10 max-w-2xl text-lg text-balance text-stone-600 md:text-xl">
					AI-powered photo organization, damage detection, and security deduction reports. Protect
					your properties and your business.
				</p>
				<div class="flex flex-col gap-3 sm:flex-row">
					<button
						type="button"
						onclick={openModal}
						class="rounded-lg bg-stone-800 px-8 py-3 font-medium text-stone-50 transition-colors hover:bg-stone-900"
					>
						Add your first unit
					</button>
					<button
						type="button"
						onclick={() => goto('#how-it-works')}
						class="rounded-lg border border-stone-200 bg-white px-8 py-3 font-medium text-stone-800 transition hover:bg-stone-100"
					>
						See how it works
					</button>
				</div>
			</div>
		</div>
		<!-- Trusted by -->
		<div class="absolute inset-x-0 bottom-35 z-20">
			<div class="mx-auto flex w-full flex-col items-center px-4">
				<div class="text-sm font-medium text-stone-500">
					Trusted by forward-thinking property managers
				</div>

				<div class="mt-4 flex flex-wrap items-center justify-center gap-10 opacity-80">
					<div class="flex h-8 items-center justify-center rounded-md text-4xl font-semibold">
						0,000+ Properties
					</div>
					<div class="flex h-8 items-center justify-center rounded-md text-4xl font-semibold">
						0,000+ Units
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section id="features" class="w-full px-10 py-6">
		<div class="mx-auto flex max-w-7xl flex-row items-center gap-10 rounded-md bg-stone-100 p-4">
			<!-- Text column -->
			<div class="px-6 lg:w-5/12">
				<h2 class="text-2xl font-medium tracking-tight text-stone-900">
					Built for AB2801, not generic storage
				</h2>
				<p class="mt-2 max-w-xl text-sm text-stone-600 md:text-base">
					Photos are automatically organized by room, unit, and property. AI ensures that all photos
					are properly matched.
				</p>
			</div>

			<!-- Gray “screenshot” box -->
			<div class="w-7/12">
				<div class="aspect-square w-full rounded-lg border border-stone-200 bg-stone-200/80">
					<!-- Replace this box with a real screenshot later -->
				</div>
			</div>
		</div>
	</section>

	<section id="features" class="w-full px-10 py-6">
		<div class="mx-auto flex max-w-7xl flex-row items-center gap-10 rounded-md bg-stone-100 p-8">
			<div class="w-7/12">
				<div class="aspect-square w-full rounded-lg border border-stone-200 bg-stone-200/80">
					<!-- Replace this box with a real screenshot later -->
				</div>
			</div>
			<div class="lg:w-5/12">
				<h2 class="text-2xl font-medium tracking-tight text-stone-900">
					AI-powered damage detection
				</h2>
				<p class="mt-2 max-w-xl text-sm text-stone-600 md:text-base">
					Every photo gets analyzed. AI will automatically notify you of damages and contact a
					vendor on your approval.
				</p>
			</div>
		</div>
	</section>

	<section id="features" class="w-full px-10 py-6">
		<div class="mx-auto flex max-w-7xl flex-row items-center gap-10 rounded-md bg-stone-100 p-8">
			<!-- Text column -->
			<div class="lg:w-5/12">
				<h2 class="text-2xl font-medium tracking-tight text-stone-900">
					Full compliance in one click
				</h2>
				<p class="mt-2 max-w-xl text-stone-600">
					AB 2801 requires an itemized statement of every security-deposit deduction with proof.
					Nexus generates one and sends it to the tenant automatically.
				</p>
			</div>

			<!-- Gray “screenshot” box -->
			<div class="w-7/12">
				<div class="aspect-square w-full rounded-lg border border-stone-200 bg-stone-200/80">
					<!-- Replace this box with a real screenshot later -->
				</div>
			</div>
		</div>
	</section>

	<section id="features" class="w-full px-10 py-30">
		<div class="mx-auto flex max-w-7xl flex-col items-center gap-6 rounded-md p-8">
			<h2 class="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
				Start your first move-in for free
			</h2>
			<button
				type="button"
				onclick={openModal}
				class="inline-flex items-center gap-2 rounded-xl bg-stone-800 px-6 py-3 text-xl text-stone-50 transition hover:bg-stone-900"
			>
				<span>Add your first unit</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="currentColor"
					class="bi bi-arrow-right-short h-7 w-7"
					viewBox="0 0 16 16"
				>
					<path
						fill-rule="evenodd"
						d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8"
					/>
				</svg>
			</button>
		</div>
	</section>

	<!-- Footer -->
	<footer class="w-full border-t border-stone-200 bg-white py-10">
		<div
			class="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 md:flex-row"
		>
			<div class="flex items-center gap-2 text-sm text-stone-600">
				<img src={nexusLogo} alt="Nexus logo" class="h-5 w-5" />
				<span>Nexus</span>
			</div>
			<div class="text-xs text-stone-400">
				© {new Date().getFullYear()} Nexus. All rights reserved.
			</div>
		</div>
	</footer>
</div>

{#if showAuthModal}
	<AuthModal
		{email}
		{password}
		onEmailChange={(value) => {
			email = value;
		}}
		onPasswordChange={(value) => {
			password = value;
		}}
		{loading}
		{errorMessage}
		{successMessage}
		{submitEmail}
		onClose={closeModal}
		onBackdropClick={handleBackdropClick}
		onKeydown={handleKeydown}
	/>
{/if}
