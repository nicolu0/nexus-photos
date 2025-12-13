// src/lib/server/gmail.ts
import { simplifyThread } from '$lib/messageHelpers';

export async function getThreads(supabase, userId: string) {
	// 1a) load gmail_tokens for userId
	const { data, error } = await supabase
		.from('gmail_tokens')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();
	const accessToken = data?.access_token;

	// 2) call Gmail, get new messages
	let ids;
	try {
		const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=3', {
		  headers: {
			Authorization: `Bearer ${accessToken}`
		  }
		});
		const data = await res.json();
		const message_objs = data.threads ?? [];
		ids = message_objs.map((m) => m.id);
	} catch (e) {
	  console.error(e);
	} 	

	let threads;
	try {
	  const results = await Promise.all(
		ids.map((id: string) =>
		  fetch(
			`https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}`,
			{
			  headers: {
				Authorization: `Bearer ${accessToken}`
			  }
			}
		  ).then((r) => r.json())
		)
	  );
	  threads = results.map(simplifyThread);
	} catch (e) {
	  console.error(e);
	}
	return threads;
}
