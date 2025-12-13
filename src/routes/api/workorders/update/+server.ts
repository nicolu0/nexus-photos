import { updateWorkorders } from '$lib/server/workorders';
import { getThreads } from '$lib/server/workorders';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	if(!locals.user) return json({error: 'Unauthorized'}, {status: 401});

	try{
		const threads = await getThreads(locals.supabase, locals.user.id);
		return json({ threads });
	} catch (e){
		return json({ error: 'Failed to update workorders' }, { status: 500 });
	}
};
