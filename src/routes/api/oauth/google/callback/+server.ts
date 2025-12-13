import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
import { GOOGLE_CLIENT_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

const REDIRECT = 'http://localhost:5173/api/oauth/google/callback';
const OK = 'http://localhost:5173/workorders';

export const GET: RequestHandler = async ({url, locals}) => {
	if (!locals.user) throw redirect(302, '/');
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
    if (!code) {
		return new Response('Missing code', { status: 400 });
	}

	const body = new URLSearchParams({
		code,
		client_id: PUBLIC_GOOGLE_CLIENT_ID,
		client_secret: GOOGLE_CLIENT_SECRET,
		redirect_uri: REDIRECT,
		grant_type: 'authorization_code'
	});
	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});

	const tokens = await tokenRes.json() as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
		scope: string;
		token_type: string;
	};

	const now = Date.now();
	const accessTokenExpiresAt = new Date(now + tokens.expires_in * 1000).toISOString();

	await locals.supabase
	  .from('gmail_tokens')
	  .upsert({
		user_id: locals?.user?.id,
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token,
		expiration: accessTokenExpiresAt
	  });

	const ok = new URL('/workorders', url.origin);
	throw redirect(302, ok);
};
