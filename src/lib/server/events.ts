export type Direction = 'inbound' | 'outbound';

export interface Event {
    id: string;
    direction: Direction;
    at: string;
    from: string;
    to: string;
    body: string;
}

const events: Event[] = [];

export function addEvent(event: Event) {
    events.unshift(event);
    if (events.length > 100) events.length = 100;
  }

export function getEvents(): Event[] {
    return events;
}