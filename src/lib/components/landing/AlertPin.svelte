<!-- src/lib/components/AlertPin.svelte -->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import nexusLogo from '$lib/assets/nexus.svg';

	type Severity = 'low' | 'medium' | 'high' | 'yc';

	const {
		top = '50%',
		left = '50%',
		delay = 0,
		severity = 'low' as Severity,
		title = '',
		message = ''
	} = $props<{
		top?: string;
		left?: string;
		delay?: number;
		severity?: Severity;
		title?: string;
		message?: string;
	}>();

	let show = $state(false);

	const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

	const parsePercent = (v: string) => {
		const n = parseFloat(v.replace('%', ''));
		return Number.isFinite(n) ? n : 50;
	};

	const topPct = $derived(parsePercent(top));
	const leftPct = $derived(parsePercent(left));

	const depthT = $derived(clamp((topPct - 35) / 65, 0, 1));

	const baseScale = $derived.by(() => {
		const nearScale = 1.05;
		const farScale = 0.85;
		let s = lerp(farScale, nearScale, depthT);

		const sideT = clamp(Math.abs(leftPct - 50) / 50, 0, 1);
		s *= lerp(1.0, 0.97, sideT);

		return s;
	});

	const dotColor = $derived(
		severity === 'high'
			? 'bg-rose-500'
			: severity === 'medium'
				? 'bg-amber-400'
				: severity === 'yc'
					? 'bg-orange-500'
					: 'bg-emerald-500'
	);

	$effect(() => {
		show = false;
		const t = setTimeout(() => (show = true), delay);
		return () => clearTimeout(t);
	});
</script>

<div
	class="pointer-events-auto absolute"
	style={`top:${top}; left:${left}; transform: translate(-50%, -100%);`}
>
	<div class="relative">
		{#if show}
			<div
				class="absolute top-full left-1/2 mt-1 rounded-full bg-black/80 blur-xs"
				style={`
					width: ${10 * baseScale}px;
					height: ${3 * baseScale}px;
					transform: translateX(-50%) scaleX(1.8) scaleY(0.9);
					opacity: ${lerp(0.35, 0.65, depthT)};
				`}
				in:fade={{ duration: 260, easing: (t) => t * t * (3 - 2 * t) }}
			></div>
		{/if}

		<img
			src={nexusLogo}
			alt=""
			aria-hidden="true"
			style={`
				transform: translateY(${show ? 0 : 18}px) scale(${show ? baseScale : baseScale * 0.7});
				opacity: ${show ? 0.9 : 0};
				transition:
					transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
					opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
				will-change: transform, opacity;
				width: ${32 * baseScale}px;
				height: ${32 * baseScale}px;
			`}
		/>
	</div>

	{#if show && (title || message)}
		<div
			class="pointer-events-none absolute -top-8 left-1/2
		       inline-flex origin-bottom -translate-x-1/2
		       items-center gap-2 rounded-full border
		       border-stone-200 bg-stone-50 px-2 py-1
		       whitespace-nowrap shadow-sm"
			in:scale={{ start: 0.95, duration: 320, delay: 220, easing: (t) => 1 - Math.pow(1 - t, 3) }}
		>
			<div class="relative grid h-3 w-3 place-items-center">
				<div
					class={`absolute inset-0 rounded-full ${dotColor} origin-center scale-75 animate-ping opacity-40`}
					style="animation-duration: 1.6s;"
				></div>
				<div class={`h-2 w-2 rounded-full ${dotColor}`}></div>
			</div>
			<div class="text-[10px] font-medium tracking-tight text-stone-900">
				{message}
			</div>
		</div>
	{/if}
</div>
