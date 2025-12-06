// src/routes/api/email2row/+server.ts
import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY } from '$env/static/private';

const client = new OpenAI({
  apiKey: OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return json({ error: 'Missing email text' }, { status: 400 });
    }

    const response = await client.responses.create({
      model: 'gpt-5-nano-2025-08-07',
      instructions:
        'You are a professional property manager assistant. ' +
        'Given the text of ONE email, extract exactly one work-order style row ' +
        'with fields: Unit, Address, Problem, Vendor, Status.\n\n' +
        'Definitions:\n' +
        '- Unit: short identifier of the unit (e.g., "Unit 402", "838 Sycamore 4B"). If unknown, use null.\n' +
        '- Address: full property address or building name if clearly stated. If unknown, use null.\n' +
        '- Problem: 1–2 sentences describing what needs to be fixed or done, in plain language.\n' +
        '- Vendor: the name of the vendor mentioned in the email likely the ones being sent to.' +
        'If unclear, guess the most reasonable trade; if truly unknown, use null.\n' +
        '- Status: one of "not started", "in progress", or "done".\n\n' +
        'Status rules:\n' +
        '- If the email only reports an issue or requests help → "not started".\n' +
        '- If the email says something is scheduled, being worked on, or awaiting parts → "in progress".\n' +
        '- If the email clearly says the work is finished / resolved → "done".\n\n' +
        'If Unit or Address are not mentioned, set them to null, not guesses.',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text:
                'Here is the full email text. Use only this content to fill the fields:\n\n' +
                email
            }
          ]
        }
      ],
      text: {
        format: {
          name: 'row',
          type: 'json_schema',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              Unit: { type: ['string', 'null'] },
              Address: { type: ['string', 'null'] },
              Problem: { type: 'string' },
              Vendor: { type: ['string', 'null'] },
              Status: {
                type: 'string',
                enum: ['not started', 'in progress', 'done']
              }
            },
            required: ['Unit', 'Address', 'Problem', 'Vendor', 'Status'],
            additionalProperties: false
          }
        }
      }
    });

    // With text.format, output_text will be a single JSON string we can parse.
    const raw = response.output_text ?? '{}';
    const row = JSON.parse(raw);

    return json(row);
  } catch (error) {
    console.error('Email-to-row error:', error);
    return json({ error: 'Failed to analyze email' }, { status: 500 });
  }
};
