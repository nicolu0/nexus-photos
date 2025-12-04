import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { addEvent } from '$lib/server/events';
import { sendMessage } from '$lib/server/sinch';

const landlordNumber = env.LANDLORD_PHONE_NUMBER;
const vendorNumber = env.VENDOR_PHONE_NUMBER;

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

    const fromNorm = normalize(payload.from);
    const landlordNorm = normalize(landlordNumber);
    const vendorNorm = normalize(vendorNumber);

    console.log('🔔 Inbound SMS from Sinch:', payload);

    console.log('📞 Normalized numbers:', {
        fromNorm,
        landlordNorm,
        vendorNorm
    });

    if (!landlordNorm || !vendorNorm) {
        console.warn('🚫 LANDLORD_NUMBER or VENDOR_NUMBER missing in env, skipping forward');
    } else if (fromNorm !== landlordNorm) {
        console.log(
            `➡️  Inbound SMS is NOT from landlord; ignoring for forward. fromNorm=${fromNorm}, landlordNorm=${landlordNorm}`
        );
    } else {
        const forwardBody = `Work request from ${payload.from}:\n${payload.body ?? ''}`;
        console.log('📤 Forwarding to vendor with body:', forwardBody);

        try {
            await sendMessage(vendorNumber!, forwardBody);
            console.log('✅ Forwarded to vendor successfully');
        } catch (err) {
            console.error('❌ Failed to forward to vendor:', err);
        }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
    });

    // if (landlordNumber && vendorNumber && normalize(payload.from) === normalize(landlordNumber)) {
    //     const forwardBody = `Work request from ${payload.from}:\n${payload.body ?? ''}`;

    //     try {
    //         await sendMessage(vendorNumber, forwardBody);
    //     } catch (error) {
    //         console.error('Failed to forward message to vendor', error);
    //     }
    // }

    // return json({ status: 'ok' });
};

function normalize(num: string | undefined): string {
    return (num ?? '').replace(/\D/g, '');
}