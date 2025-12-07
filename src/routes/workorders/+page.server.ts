import type { LayoutServerLoad } from './$types';

// TODO :: v1 needs to autorefresh tokens
// 1. doesn't exist
// 2. access outdated
// 3. refresh outdated
export const load: LayoutServerLoad = async ({ locals }) => {
	async function checkTokens(){
		const { data, error } = await locals.supabase
			.from('gmail_tokens')
			.select('*')
			.eq('user_id', locals.user.id)
			.maybeSingle();
		console.log('token data: ', data);
		if(error) console.error('error: ', error);

		const access = data?.access_token;
		console.log('access: ', access);

		const now = new Date();
		const expiresAt = data?.expiration ? new Date(data.expiration) : null;
		const expired = !expiresAt || expiresAt <= now;
		const ok = !!data && !error && !expired;

		return ok;
	}
	const ok = await checkTokens();

	let workorders = null;
	if(ok){
		workorders = await updateWorkorders(locals.supabase, user.id);
	}

	return {
		user: locals.user,
		tokensOK: ok
	};
};
