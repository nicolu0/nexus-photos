import type { PageServerLoad } from './$types';
import { updateWorkorders } from '$lib/server/workorders'; 

// TODO :: v1 needs to autorefresh tokens
// 1. doesn't exist
// 2. access outdated
// 3. refresh outdated
export const load: PageServerLoad = async ({ locals }) => {
	async function checkTokens(){
		const { data, error } = await locals.supabase
			.from('gmail_tokens')
			.select('*')
			.eq('user_id', locals?.user?.id)
			.maybeSingle();
		if(error) console.error('error: ', error);

		const now = new Date();
		const expiresAt = data?.expiration ? new Date(data.expiration) : null;
		const expired = !expiresAt || expiresAt <= now;
		const ok = !!data && !error && !expired;

		return ok;
	}
	const ok = await checkTokens();

	const { data: rows, error: rows_error} = await locals.supabase
		.from('work_orders')
		.select('email_id, unit_label, property_label, summary, vendor_name, status')
		.eq('user_id', locals.user.id);
	const workorders = rows.map((r)=>({
		email_id: r.email_id,
		Unit: r.unit_label,
		Address: r.property_label,
		Problem: r.summary,
		Vendor: r.vendor_name,
		Status: r.status
	}));

	return {
		user: locals.user,
		workorders: workorders,
		tokensOK: ok
	};
};
