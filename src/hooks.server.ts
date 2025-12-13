import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import schedule from 'node-schedule';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => event.cookies.get(name),
        set: (name, value, options) =>
          event.cookies.set(name, value, { ...options, path: '/' }),
        remove: (name, options) =>
          event.cookies.delete(name, { ...options, path: '/' })
      }
    }
  );

  event.locals.supabase = supabase;

  const {data: { user }} = await supabase.auth.getUser();

  event.locals.user = user ?? null;

  return resolve(event);
};
