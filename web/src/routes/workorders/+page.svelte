<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	
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
	let emails = $state([]);

	async function getThreads(){
		loading = true;
		try {
			const res = await fetch('/api/gmail/getThreads/', {
				method: 'POST'
			});
			if(!res.ok){
				console.log('update failed');
				return;
			}
			const data = await res.json();
			emails = data.threads.map((t) => ({
				...t,
				loading: false,
				suggestion: '',
			}));
		} finally {
			loading = false;
		}
	}

	async function approveSuggestion(emailId: string) {
		const email = emails.find((e) => e.id === emailId);
		if (!email || !email.suggestion) return;

		const suggestion = email.suggestion;
		console.log('SUGGESTION: ', suggestion);

		try {
			const res = await fetch('/api/workorders/approveSuggestion/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ workorder: suggestion })
			});

			if (!res.ok) {
				console.error('approve failed');
				return;
			}

			const data = await res.json();
			// assume server returns { workorder: {...} }
			const approved = data.workorder;

			// replace existing by email_id, or append if not found
			let found = false;
			const updated = workorders.map((w) => {
				if (w.email_id === approved.email_id) {
					found = true;
					return approved;
				}
				return w;
			});

			if (!found) {
				updated.push(approved);
			}

			workorders = updated;

			// mark this email as approved (so you can disable Yes)
			// emails = emails.map((e) =>
			// 	e.id === emailId ? { ...e, approved: true } : e
			// );
		} catch (err) {
			console.error('approve error', err);
		}
	}

	async function getSuggestion(email: {id: string; text: string }){
		emails = emails.map((e) => 
			e.id === email.id ? { ...e, loading: true } : e
		);
		try {
			const res = await fetch('/api/workorders/getSuggestion/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});
			if(!res.ok){
				console.log('update failed');
				return;
			}
			const data = await res.json();
			emails = emails.map((e) =>
				e.id === email.id ? { ...e, suggestion: data.suggestion } : e
			);
		} finally {
			emails = emails.map((e) =>
				e.id === email.id ? { ...e, loading: false} : e
			);
		}
	}

	onMount(()=>{
		//update workorders if tokens are good
	});
</script>


<div class="flex w-full h-dvh flex-col py-10">
	<div class="flex w-full bg-stone-300 gap-4">
		{#if !tokensOK}
			<a href="/api/oauth/google" class="text-3xl text-blue-400 underline">connect gmail</a>
		{:else}
			<button
				class="text-blue-400 underline text-3xl"
				onclick={getThreads}
			>
				{loading ? "loading..." : "get emails"}
			</button>
		{/if}
	</div>
	<div class="flex flex-row p-2 gap-2">
		<div class="flex w-full flex-col border p-4 rounded-xl">
			<div class="text-4xl text-stone-500">Emails</div>
			{#if emails.length}
			  {#each emails as e}
				<div class="text-xs text-black flex flex-row w-full gap-4 p-4">
					<div class="flex">{e.id}</div>
					<div class="flex w-full">{e.text}</div>
					<button 
					  class="bg-stone-100 whitespace-nowrap h-8 p-4 items-center flex border" 
					  onclick={()=>getSuggestion(e)}
					  disabled={e.loading}
					>
						{#if e.loading}
							loading...
						{:else}
							GENERATE
						{/if}
					</button>
					<div class="flex w-full flex-col">
						{e.suggestion ? e.suggestion.AiSummary : 'Click GENERATE for an AI suggestion'}
						{#if e.suggestion}
							<button class="bg-green-400 p-4" onclick={()=>approveSuggestion(e.id)}>Yes</button>
							<button class="bg-red-400 p-4">No</button>
						{/if}
					</div>
				</div>
			  {/each}
			{:else}
			  <div class="text-4xl text-stone-500">No emails yet</div>
			{/if}
		</div>
		<div class="flex w-full flex-col border p-4 rounded-xl">
			<div class="text-4xl text-stone-500">Work-orders</div>
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
		<div class="flex w-full flex-col border p-4 rounded-xl">
			<div class="text-4xl text-stone-500">Vendors</div>
			<div class="text-2xl text-stone-500">Mario and Luigi: 21andrewch@alumni.harker.org</div>
		</div>
	</div>
</div>
