import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openaiClient = new OpenAI({
    apiKey: OPENAI_API_KEY
});

export type VendorSmsCategory = 'confirmation' | 'completion' | 'other';

export interface WorkOrderCandidate {
    id: string;
    summary: string;
    status: string;
    property_label?: string | null;
    unit_label?: string | null;
    created_at?: string | null;
}

export interface ConversationMessage {
    sender_role: 'landlord' | 'vendor' | 'system';
    created_at: string;
    body: string;
}

export interface VendorSmsClassification {
    category: VendorSmsCategory;
    confidence?: number;
    reasoning?: string;
    work_order_id?: string | null;
    work_order_confidence?: number;
}

export async function classifyVendorSms( body: string, candidates: WorkOrderCandidate[], recentMessages: ConversationMessage[]): Promise<VendorSmsClassification> {
    const trimmed = body.trim();

    if (!trimmed) {
        return {
            category: 'other',
            confidence: 0,
            reasoning: 'Empty or whitespace-only message',
            work_order_id: null,
            work_order_confidence: 0
        };
    }

    console.log('Conversation context:\n');
    recentMessages.forEach((m) => {
        console.log(`${m.sender_role}: ${m.body}`);
    });

    const response = await openaiClient.responses.create({
        model: 'gpt-5-nano-2025-08-07',
        instructions:
            'You are classifying SMS messages from a vendor or contractor who is ' +
            'communicating with a landlord about repair or maintenance work orders.\n\n' +
            'You are given:\n' +
            '- One vendor SMS message.\n' +
            '- A small JSON array of candidate work orders for this vendor/landlord.\n' +
            '- A short recent conversation history between this landlord and vendor, ' +
            '  including `sender_role`, `created_at`, and `body`.\n\n' +
            'First, classify the SMS into one of:\n' +
            '- "confirmation": The vendor is clearly accepting, agreeing to, or scheduling ' +
            '  the work (e.g., "I can come on Friday", "I will fix this tomorrow", ' +
            '  "Okay, I will take care of it").\n' +
            '- "completion": The vendor is clearly stating that the work has been finished ' +
            '  (e.g., "I just fixed the issue in unit 302", "the light is replaced").\n' +
            '- "other": Questions, price discussions, unclear messages, partial updates, or ' +
            '  anything that is not clearly confirmation or completion.\n\n' +
            'Second, decide which ONE candidate work order (if any) this SMS is most likely ' +
            'about. Use clues like unit number, property name, type of work, timing, wording, ' +
            'and the recent conversation context.\n' +
            '- If no candidate seems like a reasonable match, set work_order_id to null and ' +
            '  work_order_confidence to a low value (e.g. 0.0 or 0.1).\n\n' +
            'Always be conservative. If it is very ambiguous which work order is referenced, ' +
            'you may choose work_order_id = null.\n',
        input: [
            {
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text:
                            'Vendor SMS:\n' +
                            trimmed +
                            '\n\nCandidate work orders (JSON array):\n' +
                            JSON.stringify(candidates, null, 2) +
                            '\n\nRecent conversation between landlord and vendor ' +
                            '(oldest first, most recent last):\n' +
                            JSON.stringify(recentMessages, null, 2) +
                            JSON.stringify(candidates, null, 2)
                    }
                ]
            }
        ],
        text: {
            format: {
                name: 'classification',
                type: 'json_schema',
                strict: true,
                schema: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            enum: ['confirmation', 'completion', 'other']
                        },
                        confidence: {
                            type: 'number',
                            description: 'Model confidence from 0.0 to 1.0 for the category'
                        },
                        reasoning: {
                            type: 'string',
                            description: 'Short explanation of why this category and work order were chosen'
                        },
                        work_order_id: {
                            type: ['string', 'null'],
                            description: 'ID of the best-matching work order that this SMS is most likely about, or null if no match found'
                        },
                        work_order_confidence: {
                            type: 'number',
                            description: 'Model confidence from 0.0 to 1.0 that this work_order_id is correct'
                        }
                    },
                    required: ['category', 'confidence', 'reasoning', 'work_order_id', 'work_order_confidence'],
                    additionalProperties: false
                }
            }
        }
    });

    const outputText = response.output_text ?? '';

    try {
        const parsed = JSON.parse(outputText) as VendorSmsClassification;

        if (
            parsed &&
            (parsed.category === 'confirmation' ||
                parsed.category === 'completion' ||
                parsed.category === 'other')
        ) {
            return parsed;
        }

        console.warn('Parsed vendor classification has unexpected shape:', parsed);
        return {
            category: 'other',
            confidence: parsed?.confidence ?? 0,
            reasoning: parsed?.reasoning ?? 'Unexpected classification format',
            work_order_id: parsed?.work_order_id ?? null,
            work_order_confidence: parsed?.work_order_confidence ?? 0
        };
    } catch (err) {
        console.warn('Failed to parse OpenAI vendor classification JSON:', err, outputText);
        return {
            category: 'other',
            confidence: 0,
            reasoning: 'Failed to parse model output as JSON',
            work_order_id: null,
            work_order_confidence: 0
        };
    }
}
