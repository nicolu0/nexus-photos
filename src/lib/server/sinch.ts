import { env } from '$env/dynamic/private';
import { addEvent } from './events';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

const region = env.SINCH_REGION ?? 'us';
const servicePlanId = env.SINCH_SERVICE_PLAN_ID;
const apiToken = env.SINCH_API_TOKEN;
const fromNumber = env.SINCH_FROM_NUMBER;

if (!servicePlanId || !apiToken || !fromNumber) {
    console.warn('Missing SINCH_SERVICE_PLAN_ID, SINCH_API_TOKEN, or SINCH_FROM_NUMBER');
}

interface SendMessageOptions {
    landlordPhone?: string | null;
    vendorPhone?: string | null;
    workOrderId?: string | null;
    senderRole?: 'landlord' | 'vendor' | 'system';
}

export async function sendMessage(to: string, body: string, options: SendMessageOptions = {}) {
    if (!servicePlanId || !apiToken || !fromNumber) {
        throw new Error('Missing SINCH_SERVICE_PLAN_ID, SINCH_API_TOKEN, or SINCH_FROM_NUMBER');
    }

    const url = `https://${region}.sms.api.sinch.com/xms/v1/${servicePlanId}/batches`;

    const payload = {
        from: fromNumber,
        to: [to],
        body,
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
        console.error('Failed to send message', res.status, json);
        throw new Error(`Failed to send message: ${res.status}`);
    }

    const id = (json as any).id ?? crypto.randomUUID();
    const now = new Date().toISOString();

    addEvent({
        id,
        direction: 'outbound',
        at: now,
        from: fromNumber,
        to,
        body,
    });

    try {
        await supabase.from('messages').insert({
            landlord_phone: options.landlordPhone,
            vendor_phone: options.vendorPhone,
            sender_role: options.senderRole,
            direction: 'outbound',
            body: body,
            work_order_id: options.workOrderId ?? null,
            sent_at: now
        });
    } catch (err) {
        console.error('Failed to insert outbound message into messages table:', err);
    }

    return json;
}