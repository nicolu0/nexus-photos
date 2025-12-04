// src/routes/api/damage-check/+server.ts
import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';

const client = new OpenAI({
	apiKey: OPENAI_API_KEY
});

const VERIFIED_VENDORS = [
	{
		id: 'plumber',
		trade: 'plumber',
		name: 'Mario and Luigi',
		phone: '+1-111-111-1111'
	},
	{
		id: 'electrician',
		trade: 'electrician',
		name: 'Zeri',
		phone: '+1-222-222-2222'
	}
] as const;


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
								'You also have a list of verified vendors (JSON below):\n' +
								JSON.stringify(VERIFIED_VENDORS) +
								'\n\n' +
								'Task:\n' +
								'1) Summarize visible damage in <= 5 short bullet points for landlord and vendor.\n' +
								'2) Decide what kind of vendor is needed to fix the *main* issue.\n' +
								'3) If an appropriate vendor exists in the list, choose exactly ONE by trade and name.\n' +
								'4) If no vendor in the list matches, say what trade is needed instead and for name, put new.\n\n' +
								'Rules:\n' +
								'- If there is NO visible damage: explanation = "No visible damage in this photo." and trade = null and name = null.\n' +
								'- Do NOT mention anything ambiguous or not clearly visible.\n'
						}
					]
				}
			],
			text: {
				format: {
					name: 'output',
					type: 'json_schema',
					strict: true,
					schema: {
						type: 'object',
						properties: {
							summary: { type: 'string' },
							trade: { type: ['string', 'null'] },
							name: { type: ['string', 'null'] }
						},
						required: ['summary', 'trade', 'name'],
						additionalProperties: false
					}
				}
			}

		});

		const summary = response.output_text ?? '';
		return json({ summary });
		
	} catch (error) {
		console.error('Damage check error:', error);
		return json({ error: 'Failed to analyze image' }, { status: 500 });
	}
};

