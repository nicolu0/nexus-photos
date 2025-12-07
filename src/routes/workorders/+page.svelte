<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient.ts';
	
	type WorkorderRow = {
	  Unit: string | null;
	  Address: string | null;
	  Problem: string;
	  Vendor: string | null;
	  Status: 'not started' | 'in progress' | 'done';
	};

	const user = $derived($page.data.user);
	$inspect(user);

	let message_ids = $state(["19af0166ea24351a"]);
	let messages = $state<any[]>([]);
	let workorders = $state<TodoRow[]>([]);
	let hasTokens = $state(false);

	async function checkTokens(){
		const { data, error } = await supabase
			.from('gmail_tokens')
			.select('expiration')
			.eq('user_id', user.id)
			.maybeSingle();
		if(error) console.log('error: ', error);
		const exists = !!data && !error;
		return exists;
	}

    // function decodeBase64Url(data) {
    //   if (!data) return '';
    //   const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    //   const decoded = atob(base64);
    //   try {
    //     return decodeURIComponent(escape(decoded));
    //   } catch {
    //     return decoded;
    //   }
    // }

    // function extractTextFromPayload(payload) {
    //   const textParts = [];
    //   const htmlParts = [];
    //
    //   function walk(part) {
    //     if (!part) return;
    //
    //     if (part.mimeType === 'text/plain' && part.body?.data) {
    //       textParts.push(decodeBase64Url(part.body.data));
    //     } else if (part.mimeType === 'text/html' && part.body?.data) {
    //       htmlParts.push(decodeBase64Url(part.body.data));
    //     }
    //
    //     if (part.parts) {
    //       part.parts.forEach(walk);
    //     }
    //   }
    //
    //   walk(payload);
    //
    //   return {
    //     text: textParts.join('\n\n'),
    //     html: htmlParts.length ? htmlParts.join('\n\n') : null
    //   };
    // }

    // function simplifyMessage(msg) {
    //   const headers = msg.payload?.headers ?? [];
    //   const getHeader = (name) =>
    //     headers.find((h) => h.name === name)?.value ?? '';
    //
    //   const { text, html } = extractTextFromPayload(msg.payload);
    //
    //   return {
    //     id: msg.id,
    //     subject: getHeader('Subject'),
    //     from: getHeader('From'),
    //     to: getHeader('To'),
    //     date: getHeader('Date'),
    //     text
    //   };
    // }


	// async function loadMessageIDs() {
	// 	try {
	// 	  const res = await fetch(
	// 		'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=6',
	// 		{
	// 		  headers: {
	// 			Authorization: `Bearer ${accessToken}`
	// 		  }
	// 		}
	// 	  );
	// 	  const data = await res.json();
	// 	  message_ids = data.messages ?? [];
	// 	  return message_ids.map((m) => m.id);
	// 	} catch (e) {
	// 	  console.error(e);
	// 	} 	
	// }

	// async function loadMessagesByIds(ids: string[]) {
	// 	try {
	// 	  const results = await Promise.all(
	// 		ids.map((id) =>
	// 		  fetch(
	// 			`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
	// 			{
	// 			  headers: {
	// 				Authorization: `Bearer ${accessToken}`
	// 			  }
	// 			}
	// 		  ).then((r) => r.json())
	// 		)
	// 	  );
	// 	  messages = results.map(simplifyMessage);
	// 	} catch (e) {
	// 	  console.error(e);
	// 	}
	// }

	// async function generateTodoFromMessage(message: any){
	// 	try {
	// 		console.log('loading');
	// 		const res = await fetch('/api/email2row', {
	// 			method: 'POST',
	// 			headers: { 'Content-Type': 'application/json' },
	// 			body: JSON.stringify({ email: message.text })
	// 		});
	// 		if (!res.ok) {
	// 		  console.error('email2row failed', await res.text());
	// 		  return;
	// 		}
	// 		const row = await res.json();
	// 		console.log(row);
	// 		workorders = [...workorders, row];
	// 	} catch(e) {
	// 		console.error('error: ', e);
	// 	}
	// }

	onMount(()=>{
		checkTokens().then((r) => {hasTokens = r;});
		//update workorders if tokens are good
	});
</script>

{#if !hasTokens}
	<a href="/api/oauth/google" class="text-blue-400 underline">connect gmail</a>
{/if}

{#if user}
	<div>{user.id}</div>
{/if}

<div class="flex w-full items-center h-dvh justify-center">
{#if workorders.length}
  {#each workorders as w}
    <div class="text-4xl text-black">
      {w.Unit ?? 'Unknown unit'} ·
      {w.Address ?? 'Unknown address'} ·
      {w.Problem} ·
      {w.Vendor ?? 'Unknown vendor'} ·
      {w.Status}
    </div>
  {/each}
{:else}
  <div class="text-4xl text-stone-500">No workorders yet</div>
{/if}
</div>
