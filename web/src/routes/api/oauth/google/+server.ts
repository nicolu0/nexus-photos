import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

const BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const REDIRECT = 'http://localhost:5173/api/oauth/google/callback';

export const GET: RequestHandler = async (event) => {
	const state = crypto.randomUUID();
	const params = new URLSearchParams({
		client_id: PUBLIC_GOOGLE_CLIENT_ID,
		redirect_uri: REDIRECT,
		response_type: 'code',
		scope: 'https://www.googleapis.com/auth/gmail.readonly',
		access_type: 'offline',
		prompt: 'consent',
		state
	});
	const authUrl = `${BASE}?${params.toString()}`;
	throw redirect(302, authUrl);
};
