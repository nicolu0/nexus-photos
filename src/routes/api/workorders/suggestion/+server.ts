import { getAISuggestion } from '$lib/server/suggestion';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if(!locals.user) return json({error: 'Unauthorized'}, {status: 401});
	console.log('POST called');
	try{
		const { email } = await request.json();
		console.log('email from POST: ', email);
		const suggestion = await getAISuggestion(email);
		return json({ suggestion });
	} catch (e){
		return json({ error: 'Failed to update workorders' }, { status: 500 });
	}
};
