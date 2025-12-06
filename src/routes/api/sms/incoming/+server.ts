import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { addEvent } from '$lib/server/events';
import { sendMessage } from '$lib/server/sinch';

const landlordNumber = env.LANDLORD_PHONE_NUMBER;
const vendorNumber = env.VENDOR_PHONE_NUMBER;
const sinchFromNumber = env.SINCH_FROM_NUMBER;

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
    const sinchFromNorm = normalize(sinchFromNumber);

    console.log('🔔 Inbound SMS from Sinch:', payload);

    console.log('📞 Normalized numbers:', {
        fromNorm,
        landlordNorm,
        vendorNorm,
        sinchFromNorm
    });

    if (!landlordNorm || !vendorNorm) {
        console.warn('🚫 LANDLORD_PHONE_NUMBER or VENDOR_PHONE_NUMBER missing in env, skipping forward');
    } else if (fromNorm === landlordNorm) {
        // 📩 Message from landlord → forward to vendor
        const forwardBody = `Work request from landlord ${payload.from}:\n${payload.body ?? ''}`;
        console.log('📤 Forwarding landlord message to vendor with body:', forwardBody);

        try {
            await sendMessage(vendorNumber!, forwardBody);
            console.log('✅ Forwarded landlord message to vendor successfully');
        } catch (err) {
            console.error('❌ Failed to forward landlord message to vendor:', err);
        }
    } else if (fromNorm === vendorNorm) {
        // 📩 Message from vendor → forward to landlord
        const forwardBody = `Update from vendor ${payload.from}:\n${payload.body ?? ''}`;
        console.log('📤 Forwarding vendor message to landlord with body:', forwardBody);

        try {
            await sendMessage(landlordNumber!, forwardBody);
            console.log('✅ Forwarded vendor message to landlord successfully');
        } catch (err) {
            console.error('❌ Failed to forward vendor message to landlord:', err);
        }
    } else if (sinchFromNorm && fromNorm === sinchFromNorm) {
        // Just in case Sinch ever posts something that looks like it's from your own number
        console.log('ℹ️ Ignoring message from our own Sinch number');
    } else {
        console.log(
            `ℹ️ Inbound SMS from unknown number ${payload.from} (normalized ${fromNorm}); not forwarding`
        );
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