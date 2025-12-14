import { getThreads } from '$lib/server/gmail';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '../update/$types';

const VENDOR_EMAILS = [
	'nicoluo@gmail.com',
	'21andrewch@alumni.harker.org'
];

export const POST: RequestHandler = async ({ locals }) => {
	if(!locals.user) return json({error: 'Unauthorized'}, {status: 401});

	try{
		const threads = await getThreads(locals.supabase, locals.user.id, VENDOR_EMAILS);
		return json({ threads });
	} catch (e){
		return json({ error: 'Failed to update workorders' }, { status: 500 });
	}
};
