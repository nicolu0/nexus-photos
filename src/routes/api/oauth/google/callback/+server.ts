import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
import { GOOGLE_CLIENT_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

const REDIRECT = 'http://localhost:5173/api/oauth/google/callback';
const OK = 'http://localhost:5173/todo';

export const GET: RequestHandler = async (event) => {
	const url = event.url;
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

	const tokens = await tokenRes.json();
	const access_token = tokens.access_token;
	console.log('tokens: ', tokens);

	const ok = new URL('/todo', event.url.origin);
	ok.searchParams.set('token', access_token);
	throw redirect(302, ok);
};
