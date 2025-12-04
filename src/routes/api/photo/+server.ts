// src/routes/api/damage-check/+server.ts
import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';

const client = new OpenAI({
	apiKey: OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('image');

		if (!(file instanceof File)) {
			return json({ error: 'Missing image file "image"' }, { status: 400 });
		}

		// Convert uploaded File -> base64 data URL
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const base64 = buffer.toString('base64');
		const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;

		const response = await client.responses.create({
			model: 'gpt-5-nano-2025-08-07',
			instructions:
				'You are a professional rental property inspector. ' +
				'Identify visible damage, wear, or safety issues suitable for a security deposit deduction report. ' +
				'Be precise and conservative; do not invent damage.',
			input: [
				{
					role: 'user',
					content: [
						{
							type: 'input_text',
							text:
								'Here is a photo from a rental unit. ' +
								'Look ONLY at what is clearly visible in the image.'
						},
						{
							type: 'input_image',
							image_url: dataUrl,
							detail: 'low' // or "low" if you want cheaper/rougher analysis :contentReference[oaicite:0]{index=0}
						},
						{
							type: 'input_text',
							text:
								'Output a concise damage summary for a landlord:\n' +
								'- If there IS damage: return 1–5 bullet points, each like "Area: short description (approx severity)".\n' +
								'- If there is NO visible damage: return exactly "No visible damage in this photo.".\n' +
								'- Do not mention things that are ambiguous or not clearly visible.'
						}
					]
				}
			]
		});

		const summary = response.output_text ?? '';
		return json({ summary });
		
	} catch (error) {
		console.error('Damage check error:', error);
		return json({ error: 'Failed to analyze image' }, { status: 500 });
	}
};

