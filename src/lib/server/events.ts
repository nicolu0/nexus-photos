export type EventType = 'inbound_from_landlord' | 'outbound_to_vendor' | 'outbound_confirmation_to_landlord';

export interface Event {
    id: string;
    created_at: string;
    type: EventType;
    from?: string;
    to?: string;
    body?: string;
    media_urls?: string[];
    twilio_sid?: string;
}

const events: Event[] = [];

export function logEvent(event: Omit<Event, 'id' | 'created_at'>): Event {
    const fullEvent: Event = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...event,
    };
    events.push(fullEvent);
    return fullEvent;
}

export function getEvents(): Event[] {
    return [...events].reverse();
}