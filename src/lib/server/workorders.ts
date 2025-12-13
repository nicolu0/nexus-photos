// src/lib/server/workorders.ts
import { simplifyThread } from '$lib/messageHelpers';
import { getAISuggestion } from '$lib/server/suggestion';

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

export async function updateWorkorders(supabase, userId: string) {
	// 1a) load gmail_tokens for userId
	const { data, error } = await supabase
		.from('gmail_tokens')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();
	const accessToken = data?.access_token;
	// TODO 1b) use refresh token if access is expired

	// 2) call Gmail, get new messages
	let ids;
	try {
		const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=2', {
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

	// 3) call OpenAI on each new email
	// let rows; 
	// try {
	//   const allrows = await Promise.all(
	// 	messages.map(getAISuggestion)
	//   );
	//   rows = allrows.filter((r) => r.Status !== null);
	// } catch (e) {
	//   console.error(e);
	// }
	// const payload = rows?.map((r) => ({
	// 	user_id: userId,
	// 	email_id: r.email_id,
	// 	unit_label: r.Unit,
	// 	property_label: r.Address,
	// 	summary: r.Problem,
	// 	vendor_name: r.Vendor,
	// 	status: r.Status
	// }));

	// 4) insert workorders into DB
	// const { data: inserted, error: insert_error } = await supabase
	// 	.from('work_orders')
	// 	.upsert(payload, {onConflict: 'user_id, email_id'})
	// 	.select();
	// if(insert_error) console.error(insert_error);

	// 5) return whatever you want (e.g. inserted rows)
	// return rows;
	return;
}
