import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { addEvent } from '$lib/server/events';
import { sendMessage } from '$lib/server/sinch';
import { classifyVendorSms, type VendorSmsClassification } from '$lib/server/openai';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

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
    let payload: SinchIncomingSms;
    try {
        payload = (await request.json()) as SinchIncomingSms;
    } catch (error) {
        console.error('Failed to parse request body as JSON:', error);
        return json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

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

    const body = payload.body ?? '';

    if (!landlordNorm || !vendorNorm) {
        console.warn('LANDLORD_PHONE_NUMBER or VENDOR_PHONE_NUMBER missing in env, skipping forward');
    } else if (fromNorm === landlordNorm) {
        const forwardBody = `Work request from landlord ${payload.from}:\n${body}`;

        try {
            await sendMessage(vendorNumber!, forwardBody);
        } catch (err) {
            console.error('Failed to forward landlord message to vendor:', err);
        }
    } else if (fromNorm === vendorNorm) {
        try {
            const classification = await classifyVendorSms(body);

            console.log('vendor SMS classification:', {
                sms: body,
                category: classification.category,
                confidence: classification.confidence,
                reasoning: classification.reasoning
            });
        } catch (err) {
            console.error('Failed to classify vendor SMS:', err);
        }

        const forwardBody = `Update from vendor ${payload.from}:\n${body}`;

        try {
            await sendMessage(landlordNumber!, forwardBody);
        } catch (err) {
            console.error('Failed to forward vendor message to landlord:', err);
        }
    } else if (sinchFromNorm && fromNorm === sinchFromNorm) {
        // Just in case Sinch ever posts something that looks like it's from your own number
        // Ignore message from our own Sinch number
    } else {
        // Inbound SMS from unknown number; not forwarding
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