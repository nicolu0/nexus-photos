import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
    const [configRes, eventsRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/events')
    ]);

    const config = await configRes.json();
    const { events } = await eventsRes.json();

    return { config, events };
};