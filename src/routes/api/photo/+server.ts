// src/routes/api/damage-check/+server.ts
import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY, VENDOR_PHONE_NUMBER } from '$env/static/private';
import { sendMessage } from '$lib/server/sinch';

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
								'- If there IS damage: return 1-5 bullet points, each like "Area: short description (approx severity)".\n' +
								'- If there is NO visible damage: return exactly "No visible damage in this photo.".\n' +
								'- Do not mention things that are ambiguous or not clearly visible.'
						}
					]
				}
			]
		});

		const summary = response.output_text ?? '';

        let sentToVendor = false;
        let sendError: string | null = null;

        if (!VENDOR_PHONE_NUMBER) {
            console.warn('VENDOR_PHONE_NUMBER is not set, skipping vendor SMS');
        } else if (!summary.trim()) {
            console.warn('No summary returned from OpenAI, skipping vendor SMS');
        } else {
            const messageBody =
                `New damage report:\n\n${summary}\n\nGenerated at: ${new Date().toISOString()}`;

            try {
                await sendMessage(VENDOR_PHONE_NUMBER, messageBody);
                sentToVendor = true;
            } catch (error: any) {
                console.error('Failed to send vendor SMS:', error);
                sendError = error?.message ?? 'Failed to send vendor SMS';
            }
        }
        
		return json({ summary, sentToVendor, sendError });
		
	} catch (error) {
		console.error('Damage check error:', error);
		return json({ error: 'Failed to analyze image' }, { status: 500 });
	}
};

