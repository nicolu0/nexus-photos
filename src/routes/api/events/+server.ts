import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getEvents } from '$lib/server/events';

export const GET: RequestHandler = () => {
    return json({ events: getEvents() });
};
