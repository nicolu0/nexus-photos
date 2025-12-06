<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	const accessToken = $derived($page.url.searchParams.get('token') ?? '');
	
	type TodoRow = {
	  Unit: string | null;
	  Address: string | null;
	  Problem: string;
	  Vendor: string | null;
	  Status: 'not started' | 'in progress' | 'done';
	};

	let message_ids = $state(["19af0166ea24351a"]);
	let messages = $state<any[]>([]);
	let todos = $state<TodoRow[]>([]);

    function decodeBase64Url(data) {
      if (!data) return '';
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(base64);
      try {
        return decodeURIComponent(escape(decoded));
      } catch {
        return decoded;
      }
    }
  
    function extractTextFromPayload(payload) {
      const textParts = [];
      const htmlParts = [];
  
      function walk(part) {
        if (!part) return;
  
        if (part.mimeType === 'text/plain' && part.body?.data) {
          textParts.push(decodeBase64Url(part.body.data));
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          htmlParts.push(decodeBase64Url(part.body.data));
        }
  
        if (part.parts) {
          part.parts.forEach(walk);
        }
      }
  
      walk(payload);
  
      return {
        text: textParts.join('\n\n'),
        html: htmlParts.length ? htmlParts.join('\n\n') : null
      };
    }
  
    function simplifyMessage(msg) {
      const headers = msg.payload?.headers ?? [];
      const getHeader = (name) =>
        headers.find((h) => h.name === name)?.value ?? '';
  
      const { text, html } = extractTextFromPayload(msg.payload);
  
      return {
        id: msg.id,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        text
      };
    }


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

	async function loadMessagesByIds(ids: string[]) {
		try {
		  const results = await Promise.all(
			ids.map((id) =>
			  fetch(
				`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
				{
				  headers: {
					Authorization: `Bearer ${accessToken}`
				  }
				}
			  ).then((r) => r.json())
			)
		  );
		  messages = results.map(simplifyMessage);
		} catch (e) {
		  console.error(e);
		}
	}

	async function generateTodoFromMessage(message: any){
		try {
			console.log('loading');
			const res = await fetch('/api/email2row', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: message.text })
			});
			if (!res.ok) {
			  console.error('email2row failed', await res.text());
			  return;
			}
			const row = await res.json();
			console.log(row);
			todos = [...todos, row];
		} catch(e) {
			console.error('gentodo error: ', e);
		}
	}

	onMount(()=>{
		if(!accessToken) return;
		loadMessagesByIds(message_ids);
	});
</script>

{#if !accessToken}
	<a href="/api/oauth/google">Connect Gmail</a>
{/if}

{#if messages}
  {#each messages as message}
    <div class="mb-2 border border-stone-700 p-1">
      <div class="text-[8px]">{message.text}</div>
      <button
        class="mt-1 bg-stone-800 p-2 text-white"
        onclick={() => generateTodoFromMessage(message)}
      >
        Generate todo
      </button>
    </div>
  {/each}
{/if}

<div class="mt-3 font-semibold text-xs">TODOs</div>

{#if todos.length}
  {#each todos as todo}
    <div class="text-[8px] text-black">
      {todo.Unit ?? 'Unknown unit'} ·
      {todo.Address ?? 'Unknown address'} ·
      {todo.Problem} ·
      {todo.Vendor ?? 'Unknown vendor'} ·
      {todo.Status}
    </div>
  {/each}
{:else}
  <div class="text-[8px] text-stone-500">No todos yet</div>
{/if}
