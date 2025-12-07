import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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

  event.locals.test = "hello";

  const {data: { session }} = await supabase.auth.getSession();

  event.locals.user = session?.user ?? null;

  return resolve(event);
};
