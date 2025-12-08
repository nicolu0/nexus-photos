import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { sendMessage } from '$lib/server/sinch';
import { classifyVendorSms, type WorkOrderCandidate, type ConversationMessage } from '$lib/server/classify';
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

async function isRecentDuplicateInbound(
    landlordPhone: string | null,
    vendorPhone: string | null,
    body: string,
    windowMs = 10_000
): Promise<boolean> {
    if (!landlordPhone || !vendorPhone || !body.trim()) return false;

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('id, created_at, body')
            .eq('landlord_phone', landlordPhone)
            .eq('vendor_phone', vendorPhone)
            .eq('sender_role', 'vendor')
            .eq('direction', 'inbound')
            .eq('body', body)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('Failed to check recent duplicate vendor inbound:', error);
            return false;
        }

        if (!data || data.length === 0) return false;

        const last = data[0] as { id: string; created_at: string; body: string };
        if (!last.created_at) return false;

        const lastTs = new Date(last.created_at).getTime();
        if (Number.isNaN(lastTs)) return false;

        const nowTs = Date.now();
        const diff = nowTs - lastTs;

        if (diff >= 0 && diff <= windowMs) {
            console.log(
                'Detected recent duplicate vendor inbound SMS, skipping processing:',
                { landlordPhone, vendorPhone, body, diffMs: diff }
            );
            return true;
        }

        return false;
    } catch (err) {
        console.error('Unexpected error while checking recent duplicate vendor inbound:', err);
        return false;
    }
}

export const POST: RequestHandler = async ({ request }) => {
    let payload: SinchIncomingSms;
    
    try {
        payload = (await request.json()) as SinchIncomingSms;
    } catch (error) {
        console.error('Failed to parse request body as JSON:', error);
        return json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const sinchMessageId = payload.id ?? null;

    if (sinchMessageId) {
        try {
            const { data: existing, error: existingError } = await supabase
                .from('messages')
                .select('id')
                .eq('sinch_message_id', sinchMessageId)
                .maybeSingle();

            if (existingError) {
                console.error('Failed to check for existing message:', existingError);
            } else if (existing) {
                console.log('Message already exists, skipping:', existing);
                return new Response(JSON.stringify({ status: 'duplicate_ignored' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (err) {
            console.error('Unexpected error while checking for existing message (duplicate checking):', err);
        }
    }

    // const inboundAt = payload.received_at ?? new Date().toISOString();
    const body = payload.body ?? '';

    const fromNorm = normalize(payload.from);
    const landlordNorm = normalize(landlordNumber);
    const vendorNorm = normalize(vendorNumber);
    const sinchFromNorm = normalize(sinchFromNumber);

    const landlordPhone = landlordNorm || null;
    const vendorPhone = vendorNorm || null;

    console.log('Incoming SMS from Sinch:', {
        from: payload.from,
        to: payload.to,
        fromNorm,
        landlordNorm,
        vendorNorm,
        sinchFromNorm,
        body
    });

    // If env is misconfigured, just log the inbound as "system" and bail
    if (!landlordNorm || !vendorNorm) {
        console.warn('LANDLORD_PHONE_NUMBER or VENDOR_PHONE_NUMBER missing in env, skipping forward');

        try {
            const { error } = await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: 'system',
                direction: 'inbound',
                body,
                work_order_id: null,
                sinch_message_id: sinchMessageId,
            });

            if (error) {
                console.error(
                    'Failed to insert inbound message into messages table (missing env):',
                    error
                );
            }
        } catch (err) {
            console.error('Unexpected error inserting inbound message (missing env):', err);
        }

        return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // --- Branch: Landlord -> Vendor ---
    if (fromNorm === landlordNorm) {
        const senderRole: 'landlord' = 'landlord';

        // 1) Log inbound landlord message
        try {
            const { error } = await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: senderRole,
                direction: 'inbound',
                body,
                work_order_id: null,
                sinch_message_id: sinchMessageId,
            });

            if (error) {
                console.error(
                    'Failed to insert inbound landlord message into messages table:',
                    error
                );
            }
        } catch (err) {
            console.error('Unexpected error inserting inbound landlord message:', err);
        }

        // 2) Forward to vendor
        const forwardBody = `Work request from landlord ${payload.from}:\n${body}`;

        try {
            await sendMessage(vendorNumber!, forwardBody, {
                landlordPhone: landlordNumber ?? null,
                vendorPhone: vendorNumber ?? null,
                senderRole: 'landlord',
                workOrderId: null // you can wire this later if the landlord text is tied to a specific work order
            });
        } catch (err) {
            console.error('Failed to forward landlord message to vendor:', err);
        }

        return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // --- Branch: Vendor -> Landlord ---
    if (fromNorm === vendorNorm) {
        const senderRole: 'vendor' = 'vendor';
        let workOrderId: string | null = null;

        const isDupe = await isRecentDuplicateInbound(landlordPhone, vendorPhone, body);
        if (isDupe) {
            return new Response(JSON.stringify({ status: 'duplicate_ignored_recent' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // get candidate work orders
        let candidates: WorkOrderCandidate[] = [];
        try {
            const { data, error } = await supabase
                .from('work_orders')
                .select('id, summary, status, property_label, unit_label, created_at')
                .eq('landlord_phone', landlordPhone)
                .eq('vendor_phone', vendorPhone)
                .in('status', ['pending', 'in_progress']);

            if (error) {
                console.error('Failed to fetch work_orders candidates for vendor:', error);
            } else if (data) {
                candidates = data as WorkOrderCandidate[];
            }
        } catch (err) {
            console.error('Unexpected error fetching work_orders candidates for vendor:', err);
        }

        // get list of recent messages in conversation
        let recentMessages: ConversationMessage[] = [];
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('sender_role, body, created_at')
                .eq('landlord_phone', landlordPhone)
                .eq('vendor_phone', vendorPhone)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) {
                console.error('Failed to fetch recent messages between landlord + vendor:', error);
            } else if (data) {
                recentMessages = (data ?? []).reverse(); // get 10 most recent msgs in chronological order
            }
        } catch (err) {
            console.error('Unexpected error fetching recent messages between landlord + vendor:', err);
        }

        // classify vendor SMS + choose best work order
        try {
            const classification = await classifyVendorSms(body, candidates, recentMessages);

            console.log('Vendor SMS classification:', {
                sms: body,
                category: classification.category,
                confidence: classification.confidence,
                reasoning: classification.reasoning,
                work_order_id: classification.work_order_id,
                work_order_confidence: classification.work_order_confidence
            });

            const threshold = 0.5; // bump up if you want to be more conservative
            if (
                classification.work_order_id &&
                (classification.work_order_confidence ?? 0) >= threshold
            ) {
                workOrderId = classification.work_order_id;

                if (classification.category === 'confirmation') {
                    try {
                        const { error } = await supabase
                            .from('work_orders')
                            .update({ status: 'in_progress' })
                            .eq('id', workOrderId)
                            .in('status', ['pending', 'in_progress']);

                        if (error) {
                            console.error(
                                'Failed to update work order status → in_progress:',
                                error
                            );
                        } else {
                            console.log(
                                `Work order ${workOrderId} updated to 'in_progress' based on vendor SMS`
                            );
                        }
                    } catch (err) {
                        console.error(
                            'Unexpected error updating work order status → in_progress:',
                            err
                        );
                    }
                } else if (classification.category === 'completion') {
                    try {
                        const { error } = await supabase
                            .from('work_orders')
                            .update({ status: 'completed' })
                            .eq('id', workOrderId)
                            .in('status', ['pending', 'in_progress']);

                        if (error) {
                            console.error(
                                'Failed to update work order status → completed:',
                                error
                            );
                        } else {
                            console.log(
                                `Work order ${workOrderId} updated to 'completed' based on vendor SMS`
                            );
                        }
                    } catch (err) {
                        console.error(
                            'Unexpected error updating work order status → completed:',
                            err
                        );
                    }
                }
            } else {
                console.log(
                    'No confident work_order match; leaving work_order_id = null for this vendor message'
                );
            }
        } catch (err) {
            console.error('Failed to classify vendor SMS:', err);
        }

        // log inbound vendor message with attached work_order_id
        try {
            const { error } = await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: senderRole,
                direction: 'inbound',
                body,
                work_order_id: workOrderId,
                sinch_message_id: sinchMessageId,
            });

            if (error) {
                console.error(
                    'Failed to insert inbound vendor message into messages table:',
                    error
                );
            }
        } catch (err) {
            console.error('Unexpected error inserting inbound vendor message:', err);
        }

        // forward vendor update to landlord
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

    // --- Branch: Our own Sinch number or unknown sender ---
    if (sinchFromNorm && fromNorm === sinchFromNorm) {
        console.log('Ignoring SMS that appears to originate from our own Sinch number');
    } else {
        console.log('Inbound SMS from unknown sender; logging as system only');
        try {
            const { error } = await supabase.from('messages').insert({
                landlord_phone: landlordPhone,
                vendor_phone: vendorPhone,
                sender_role: 'system',
                direction: 'inbound',
                body,
                work_order_id: null,
                sinch_message_id: sinchMessageId,
            });

            if (error) {
                console.error('Failed to insert inbound unknown message into messages table:', error);
            }
        } catch (err) {
            console.error('Unexpected error inserting inbound unknown message:', err);
        }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
    });
};
