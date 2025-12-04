import { addEvent } from './events';

const region = process.env.SINCH_REGION ?? 'us';
const servicePlanId = process.env.SINCH_SERVICE_PLAN_ID;
const apiToken = process.env.SINCH_API_TOKEN;
const fromNumber = process.env.SINCH_FROM_NUMBER;

if (!servicePlanId || !apiToken || !fromNumber) {
    console.warn('Missing SINCH_SERVICE_PLAN_ID, SINCH_API_TOKEN, or SINCH_FROM_NUMBER');
}

export async function sendMessage(to: string, body: string) {
    if (!servicePlanId || !apiToken || !fromNumber) {
        throw new Error('Missing SINCH_SERVICE_PLAN_ID, SINCH_API_TOKEN, or SINCH_FROM_NUMBER');
    }

    const url = `https://${region}.sms.api.sinch.com/v1/${servicePlanId}/batches`;

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
    addEvent({
        id,
        direction: 'outbound',
        at: new Date().toISOString(),
        from: fromNumber,
        to,
        body,
    });

    return json;
}