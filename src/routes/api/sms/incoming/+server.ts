import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { addEvent } from '$lib/server/events';
import { sendMessage } from '$lib/server/sinch';

const landlordNumber = process.env.LANDLORD_NUMBER;
const vendorNumber = process.env.VENDOR_NUMBER;

interface SinchIncomingSms {
    body: string;
    from: string;
    id: string;
    received_at: string;
    to: string;
    type: string;
    [key: string]: unknown;
}

export const POST: RequestHandler = async ({ request }) => {
    const payload = (await request.json()) as SinchIncomingSms;

    addEvent({
        id: payload.id ?? crypto.randomUUID(),
        direction: 'inbound',
        at: payload.received_at ?? new Date().toISOString(),
        from: payload.from,
        to: payload.to,
        body: payload.body ?? '',
    });

    if (landlordNumber && vendorNumber && normalize(payload.from) === normalize(landlordNumber)) {
        const forwardBody = `Work request from ${payload.from}:\n${payload.body ?? ''}`;

        try {
            await sendMessage(vendorNumber, forwardBody);
        } catch (error) {
            console.error('Failed to forward message to vendor', error);
        }
    }

    return json({ status: 'ok' });
};

function normalize(num: string | undefined): string {
    return (num ?? '').replace(/\D/g, '');
}