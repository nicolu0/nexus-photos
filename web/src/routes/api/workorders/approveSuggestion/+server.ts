import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { workorder } = await request.json();

	const payload = {
		user_id: locals.user.id,
		email_id: workorder.email_id,
		unit_label: workorder.Unit,
		property_label: workorder.Address,
		summary: workorder.Problem,
		vendor_name: workorder.Vendor,
		status: workorder.Status
	};

	const { data, error } = await locals.supabase
		.from('work_orders')
		.upsert(payload, { onConflict: 'user_id,email_id' }) // no space is safer
		.select()
		.maybeSingle();

	if (error) {
		console.error(error);
		return json({ error: 'Failed to insert workorder' }, { status: 500 });
	}

	// Map DB row -> UI WorkorderRow shape
	const uiWorkorder = {
		email_id: data.email_id,
		Unit: data.unit_label,
		Address: data.property_label,
		Problem: data.summary,
		Vendor: data.vendor_name,
		Status: data.status
		// If you later add ai_summary to the table, you can expose it here too.
		// AiSummary: data.ai_summary ?? null
	};

	return json({ workorder: uiWorkorder });
};
