<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	
	type WorkorderRow = {
	  email_id: string | null;
	  Unit: string | null;
	  Address: string | null;
	  Problem: string;
	  Vendor: string | null;
	  Status: 'pending' | 'in_progress' | 'completed';
	};

	const user = $derived($page.data.user);
	let workorders = $derived<WorkorderRow[]>($page.data.workorders ?? []);
	let tokensOK = $state($page.data.tokensOK);
	let loading = $state(false);

	async function updateWorkorders(){
		loading = true;
		const res = await fetch('/api/workorders/update/', {
			method: 'POST'
		});
		if(!res.ok){
			console.log('update failed');
			return;
		}
		loading = false;
		await invalidateAll();
	}

	onMount(()=>{
		//update workorders if tokens are good
	});
</script>


<div class="flex w-full h-dvh flex-col py-10">
	<div class="flex w-full bg-stone-300">
		{#if !tokensOK}
			<a href="/api/oauth/google" class="text-3xl text-blue-400 underline">connect gmail</a>
		{/if}
		{#if !loading}
			<button
				class="text-blue-400 underline text-3xl"
				onclick={updateWorkorders}
			>
				update workorders
			</button>
		{:else}
			<button
				class="text-stone-400 underline text-3xl"
			>
				loading workorders...
			</button>
		{/if}
	</div>
	<div class="flex flex-row">
		<div class="flex w-full bg-red-300">
			<div class="text-4xl text-stone-500">Emails</div>
		</div>
		<div class="flex w-full bg-blue-300">
			{#if workorders.length}
			  {#each workorders as w}
				<div class="text-xs text-black flex flex-row w-full">
				  <div class="flex w-full">{w.Unit ?? 'Unknown unit'}</div>
				  <div class="flex w-full">{w.Address ?? 'Unknown address'}</div>
				  <div class="flex w-full">{w.Problem}</div>
				  <div class="flex w-full">{w.Vendor ?? 'Unknown vendor'}</div>
				  <div class="flex w-full">{w.Status}</div>
				</div>
			  {/each}
			{:else}
			  <div class="text-4xl text-stone-500">No workorders yet</div>
			{/if}
		</div>
	</div>
</div>
