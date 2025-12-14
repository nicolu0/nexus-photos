import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { sendMessage } from '$lib/server/sinch';
import { classifyVendorSms, type WorkOrderCandidate } from '$lib/server/classify';
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

function normalize(num: string | undefined): string {
    return (num ?? '').replace(/\D/g, '');
}

export const POST: RequestHandler = async ({ request }) => {
    let payload: SinchIncomingSms;
    try {
        payload = (await request.json()) as SinchIncomingSms;
    } catch (error) {
        console.error('Failed to parse request body as JSON:', error);
        return json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const inboundAt = payload.received_at ?? new Date().toISOString();

    const fromNorm = normalize(payload.from);
    const landlordNorm = normalize(landlordNumber);
    const vendorNorm = normalize(vendorNumber);
    const sinchFromNorm = normalize(sinchFromNumber);

    const landlordPhone = landlordNorm || null;
    const vendorPhone = vendorNorm || null;

    const body = payload.body ?? '';

    const senderRole: 'landlord' | 'vendor' | 'system' =
        fromNorm === landlordNorm ? 'landlord' :
        fromNorm === vendorNorm ? 'vendor' :
        'system';

    if (!landlordNorm || !vendorNorm) {
        console.warn('LANDLORD_PHONE_NUMBER or VENDOR_PHONE_NUMBER missing in env, skipping forward');

        try {
            await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: 'system',
                direction: 'inbound',
                body: body,
                work_order_id: null,
                received_at: inboundAt
            });
        } catch (err) {
            console.error('Failed to insert inbound message into messages table (missing env):', err);
        }

        return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (fromNorm === landlordNorm) {
        const senderRole: 'landlord' = 'landlord';

        try {
            await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: senderRole,
                direction: 'inbound',
                body: body,
                work_order_id: null,
                received_at: inboundAt
            });
        } catch (err) {
            console.error('Failed to insert inbound message into messages table (landlord):', err);
        }
        
        const forwardBody = `Work request from landlord ${payload.from}:\n${body}`;

        try {
            await sendMessage(vendorNumber!, forwardBody, {
                landlordPhone: landlordNumber ?? null,
                vendorPhone: vendorNumber ?? null,
                senderRole: 'landlord',
                workOrderId: null // TODO: add work order id
            });
        } catch (err) {
            console.error('Failed to forward landlord message to vendor:', err);
        }

        return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (fromNorm === vendorNorm) {
        const senderRole: 'vendor' = 'vendor';
        let workOrderId: string | null = null;

        // get candidates for work orders
        let candidates: WorkOrderCandidate[] = [];
        try {
            const { data, error } = await supabase
                .from('work_orders')
                .select('id, summary, status, property_label, unit_label, vendor_name, vendor_trade')
                .eq('landlord_phone', landlordPhone)
                .eq('vendor_phone', vendorPhone)
                .in('status', ['pending', 'in_progress']);

            if (error) {
                console.error('Failed to fetch work orders for vendor:', error);
            } else if (data) {
                candidates = data as WorkOrderCandidate[];
            }
        } catch (err) {
            console.error('Failed to fetch work orders for vendor:', err);
        }
        
        // classify vendor SMS + pick best work order
        try {
            const classification = await classifyVendorSms(body, candidates);

            console.log('vendor SMS classification:', {
                sms: body,
                category: classification.category,
                confidence: classification.confidence,
                reasoning: classification.reasoning,
                work_order_id: classification.work_order_id,
                work_order_confidence: classification.work_order_confidence
            });

            const threshold = 0.5;
            if (
                classification.work_order_id &&
                (classification.work_order_confidence ?? 0) >= threshold
            ) {
                workOrderId = classification.work_order_id;

                if (classification.category === 'confirmation') {
                    try {
                        await supabase.from('work_orders')
                            .update({ status: 'in_progress' })
                            .eq('id', workOrderId)
                            .in('status', ['pending', 'in_progress']);
                    } catch (err) {
                        console.error('Failed to update work order status to in_progress:', err);
                    }
                } else if (classification.category === 'completion') {
                    try {
                        await supabase.from('work_orders')
                            .update({ status: 'completed' })
                            .eq('id', workOrderId)
                            .in('status', ['pending', 'in_progress']);
                    } catch (err) {
                        console.error('Failed to update work order status to completed:', err);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to classify vendor SMS:', err);
        }

        // log inbound vendor msg with work order id
        try {
            await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: senderRole,
                direction: 'inbound',
                body: body,
                work_order_id: workOrderId,
                received_at: inboundAt
            });
        } catch (err) {
            console.error('Failed to insert inbound message into messages table (vendor):', err);
        }

        const forwardBody = `Update from vendor ${payload.from}:\n${body}`;

        try {
            await sendMessage(landlordNumber!, forwardBody, {
                landlordPhone: landlordNumber ?? null,
                vendorPhone: vendorNumber ?? null,
                senderRole: 'vendor',
                workOrderId: workOrderId
            });
        } catch (err) {
            console.error('Failed to forward vendor message to landlord:', err);
        }

        return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (sinchFromNorm && fromNorm === sinchFromNorm) {
        // Just in case Sinch ever posts something that looks like it's from your own number
        // Ignore message from our own Sinch number
    } else {
        try {
            await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: 'system',
                direction: 'inbound',
                body: body,
                work_order_id: null,
                received_at: inboundAt
            });
        } catch (err) {
            console.error('Failed to insert inbound message into messages table:', err);
        }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
    });
};
