// src/lib/server/suggestions.ts
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

export type WorkorderRow = {
  email_id: string;
  Unit: string | null;
  Address: string | null;
  Problem: string | null;
  Vendor: string | null;
  Status: 'pending' | 'in_progress' | 'completed' | null;
  AiSummary: string | null;
};

type LLMRow = {
  Unit: string | null;
  Address: string | null;
  Problem: string | null;
  Vendor: string | null;
  Status: 'pending' | 'in_progress' | 'completed' | null;
  AiSummary: string | null;
};

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function getAISuggestion( email: { id: string; text: string }): Promise<WorkorderRow> {
  const response = await client.responses.create({
    model: 'gpt-5-nano-2025-08-07',
    instructions:
      'You are a professional property manager assistant.\n' +
      'Given the text of ONE email thread, decide if it is about property maintenance ' +
      'for a rental unit/building (e.g., repairs, scheduling vendors, confirming work, quotes, invoices).\n\n' +
      'If the email IS relevant (about a property/unit/building maintenance or vendor work):\n' +
      '  - Extract exactly one work-order style row with fields: Unit, Address, Problem, Vendor, Status, AiSummary.\n' +
      '  - Follow these definitions:\n' +
      '    - Unit: short identifier of the unit (e.g., "Unit 4B", "838 Sycamore 4B"). If unknown, use null.\n' +
      '    - Address: full property address or building name if clearly stated. If unknown, use null.\n' +
      '    - Problem: a VERY SHORT label (a few words, no full sentences, no period) describing the main issue.\n' +
      '      Rules for Problem:\n' +
      '        * Use a noun phrase, not a sentence.\n' +
      '        * Do NOT end with a period.\n' +
      '        * The FIRST LETTER of the label MUST be uppercase.\n' +
      '      Examples:\n' +
      '        * "Plumbing leak under sink"\n' +
      '        * "HVAC service"\n' +
      '        * "Heater replacement"\n' +
      '    - Vendor: the name of the vendor mentioned in the email (e.g., plumbing company, handyman).\n' +
      '      If unclear, guess the most reasonable trade (e.g. "plumber", "electrician"); if truly unknown, use null.\n' +
      '    - Status: one of "pending", "in_progress", or "completed".\n' +
      '      * "pending": the email reports an issue or requests help; no work has started.\n' +
      '      * "in_progress": work is scheduled, being worked on, or awaiting parts/approval.\n' +
      '      * "completed": the email clearly says the work is finished / resolved.\n' +
      '    - AiSummary: a short 1–2 sentence summary of what the assistant suggests the system/property manager should do NEXT,\n' +
      '      based on this email thread and the extracted fields.\n' +
      '      * Focus on the action, not re-quoting the email.\n' +
      '      * Example for a new issue: "Create a new plumbing work order for the kitchen sink leak in Unit 4B at 67 Mushroom Lane and schedule Mario to inspect it on Wednesday."\n' +
      '      * Example for a follow-up: "Update the existing plumbing work order to in-progress and confirm Mario is scheduled to visit on Wednesday."\n' +
      '  - If Unit or Address are not mentioned, set them to null (do NOT guess or hallucinate).\n\n' +
      'If the email is NOT relevant to property/unit/building maintenance or vendor work (e.g., marketing, newsletters, ' +
      'bank alerts, personal messages, generic spam, unrelated business topics):\n' +
      '  - Return ALL fields as null:\n' +
      '    - Unit = null\n' +
      '    - Address = null\n' +
      '    - Problem = null\n' +
      '    - Vendor = null\n' +
      '    - Status = null\n' +
      '    - AiSummary = null\n' +
      'Do NOT invent a workorder for irrelevant emails. For non-maintenance emails, everything must be null.',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text:
              'Here is the full email thread text. Use only this content to fill the fields:\n\n' +
              email.text
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
            Problem: { type: ['string', 'null'] },
            Vendor: { type: ['string', 'null'] },
            Status: {
              type: ['string', 'null'],
              enum: ['pending', 'in_progress', 'completed', null]
            },
            AiSummary: { type: ['string', 'null'] }
          },
          required: ['Unit', 'Address', 'Problem', 'Vendor', 'Status', 'AiSummary'],
          additionalProperties: false
        }
      }
    }
  });

  const raw = response.output_text ?? '{}';
  const parsed = JSON.parse(raw) as LLMRow;

  return {
    email_id: email.id,
    ...parsed
  };
}
