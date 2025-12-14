// src/lib/server/gmail.ts
import { simplifyThread } from '$lib/messageHelpers';
import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/public';
import { GOOGLE_CLIENT_SECRET } from '$env/static/private';

export async function getThreads( supabase: any, userId: string, allowedSenders: string[] = []) {
	// 1) load gmail_tokens for userId
	const { data, error } = await supabase
		.from('gmail_tokens')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();

	const now = new Date();
	const expiresAt = data?.expiration ? new Date(data.expiration) : null;
	const expired = !expiresAt || expiresAt <= now;

	if (error) {
		console.error('gmail_tokens error', error);
		throw new Error('Failed to load gmail tokens');
	}
	let accessToken = data?.access_token;
	let refreshToken = data?.refresh_token;
	if (expired) {
		const body = new URLSearchParams({
			client_id: PUBLIC_GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			refresh_token: refreshToken,
			grant_type: 'refresh_token'
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
			refresh_token_expires_in: number;
		};
		accessToken = tokens.access_token;
		const now = Date.now();
		const accessTokenExpiresAt = new Date(now + tokens.expires_in * 1000).toISOString();
		const refreshTokenExpiresAt = new Date(now + tokens.refresh_token_expires_in * 1000).toISOString();

		await supabase
		  .from('gmail_tokens')
		  .upsert({
			user_id: userId,
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token,
			expiration: accessTokenExpiresAt,
			refreshExpiration: refreshTokenExpiresAt
		  });
	}

	// 2) build Gmail threads.list URL with optional from: filters
	let url = 'https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=10';

	if (allowedSenders.length > 0) {
		const q = allowedSenders.map((addr) => `from:${addr}`).join(' OR ');
		url += `&q=${encodeURIComponent(q)}`;
	}

	// 3) list matching threads
	let ids: string[] = [];
	try {
		const res = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});
		const json = await res.json();
		const message_objs = json.threads ?? [];
		ids = message_objs.map((m: any) => m.id);
	} catch (e) {
		console.error('gmail threads list error', e);
		throw new Error('Failed to fetch threads list');
	}

	// 4) fetch each thread and simplify
	try {
		const results = await Promise.all(
			ids.map((id: string) =>
				fetch(
					`https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}`,
					{
						headers: {
							Authorization: `Bearer ${accessToken}`
						}
					}
				).then((r) => r.json())
			)
		);

		const threads = results.map(simplifyThread);
		return threads;
	} catch (e) {
		console.error('gmail thread details error', e);
		throw new Error('Failed to fetch thread details');
	}
}
