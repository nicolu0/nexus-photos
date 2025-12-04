import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { sendMessage } from '$lib/server/sinch';

export const POST: RequestHandler = async ({ request }) => {
    const { to, body } = (await request.json()) as { to: string; body: string };

    if (!to || !body) {
        return new Response('Missing "to" or "body"', { status: 400 });
    }

    try {
        const result = await sendMessage(to, body);
        return json({ ok: true, result });
    } catch (err: any) {
        return json({ ok: false, error: err?.message ?? 'send failed' }, { status: 500 });
    }
};
