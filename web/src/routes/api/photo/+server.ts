import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENAI_API_KEY, VENDOR_PHONE_NUMBER } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { sendMessage } from '$lib/server/sinch';

// export const config = {
// 	csrf: false
// };

const client = new OpenAI({
	apiKey: OPENAI_API_KEY
});

// Create Supabase client for server-side operations
const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

const VERIFIED_VENDORS = [
	{
		id: 'plumber',
		trade: 'plumber',
		name: 'Mario and Luigi',
		phone: VENDOR_PHONE_NUMBER
	},
	{
		id: 'electrician',
		trade: 'electrician',
		name: 'Zeri',
		phone: VENDOR_PHONE_NUMBER
	},
    {
        id: 'handyman',
        trade: 'general repair',
        name: 'Jose',
        phone: VENDOR_PHONE_NUMBER
    }
] as const;


export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('image');
		const additionalMessage = formData.get('message')?.toString() || '';

		if (!(file instanceof File)) {
			return json({ error: 'Missing image file "image"' }, { status: 400 });
		}

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
							detail: 'low'
						},
						{
							type: 'input_text',
							text:
								'You also have a list of verified vendors (JSON below):\n' +
								JSON.stringify(VERIFIED_VENDORS)
                        },
                        {
                            type: 'input_text',
                            text:
                                'The landlord also provided this extra text/note (may include property or unit info):\n' +
                                (additionalMessage || '[no extra message provided]')
                        },
                        {
                            type: 'input_text',
                            text:
								'Task:\n' +
                                '1) Summarize visible damage in <= 3 short bullet points for landlord and vendor. ' +
                                '   If the landlord text clearly mentions a property nickname (e.g. "Bellevue", "Mariposa", "Lincoln") or address, ' +
                                '   and/or a unit (e.g. "Unit 302", "#302", "302"), include that info in your structured output.\n' +
                                '2) Decide what kind of vendor is needed to fix the *main* issue.\n' +
                                '3) If an appropriate vendor exists in the list, choose exactly ONE by trade and name.\n' +
                                '4) If no vendor in the list matches, default to "handyman" and "Jose".\n\n' +
                                'Structured fields:\n' +
                                '- summary: damage summary (1-3 bullet points, plain text, not Markdown).\n' +
                                '- trade: string like "plumber", "electrician", or null if no visible damage.\n' +
                                '- name: vendor name from the list (e.g. "Mario and Luigi"), or null if no visible damage.\n' +
                                '- property_label: short human name for the property (e.g. "Bellevue", "123 Example St"), ' +
                                '  based on the landlord message if possible; otherwise null.\n' +
                                '- unit_label: short label for the unit (e.g. "Unit 302", "302", "#4"), based on the landlord ' +
                                '  message if possible; otherwise null.\n\n' +
                                'Rules:\n' +
                                '- If there is NO visible damage: summary = "No visible damage in this photo.", ' +
                                '  trade = null, name = null.\n' +
                                '- If you cannot confidently extract property or unit info, set property_label and unit_label to null.\n' +
                                '- Do NOT mention anything ambiguous or not clearly visible.'
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
							name: { type: ['string', 'null'] },
                            property_label: { type: ['string', 'null'] },
                            unit_label: { type: ['string', 'null'] }
						},
						required: ['summary', 'trade', 'name', 'property_label', 'unit_label'],
						additionalProperties: false
					}
				}
			}

		});

		const outputText = response.output_text ?? '';
		
		let parsedResponse: {
            summary: string;
            trade: string | null;
            name: string | null;
            property_label: string | null;
            unit_label: string | null;
        };

		try {
			parsedResponse = JSON.parse(outputText);
		} catch (error) {
			console.error('Failed to parse OpenAI response:', error);
			return json({ error: 'Failed to parse AI response' }, { status: 500 });
		}

		const summary = parsedResponse.summary ?? '';
		const vendorName = parsedResponse.name;
		const vendorTrade = parsedResponse.trade;
        const propertyLabel = parsedResponse.property_label ?? null;
        const unitLabel = parsedResponse.unit_label ?? null;
        
        let sentToVendor = false;
        let sendError: string | null = null;

        // Find vendor by name in VERIFIED_VENDORS array
        let vendorPhoneNumber: string | null = null;
        if (vendorName) {
            const vendor = VERIFIED_VENDORS.find(v => v.name === vendorName);
            if (vendor) {
                vendorPhoneNumber = vendor.phone;
            } else {
                console.warn(`Vendor "${vendorName}" not found in VERIFIED_VENDORS`);
            }
        }

        if (!vendorPhoneNumber) {
            console.warn('No vendor phone number found, skipping vendor SMS');
        } else if (!summary.trim()) {
            console.warn('No summary returned from OpenAI, skipping vendor SMS');
        } else {
            // Build message body with optional additional details from landlord
            let messageBody = `Hi ${vendorName}, here is a new damage report for ${vendorTrade}:\n\n${summary}`;

            if (propertyLabel || unitLabel) {
                messageBody += `\n\nLocation: `;
                if (propertyLabel) messageBody += propertyLabel;
                if (propertyLabel && unitLabel) messageBody += ' - ';
                if (unitLabel) messageBody += unitLabel;
            }
            
            if (additionalMessage.trim()) {
                messageBody += `\n\nAdditional details from landlord:\n${additionalMessage.trim()}`;
            }
            
            messageBody += `\n\nGenerated at: ${new Date().toISOString()}`;

            try {
                const landlordPhone = env.LANDLORD_PHONE_NUMBER || '';

                const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
                const normalizedLandlordPhone = normalizePhone(landlordPhone);
                const normalizedVendorPhone = normalizePhone(vendorPhoneNumber);
                
                let workOrderId: string | null = null;
                try {
                    const { data, error: workOrderError } = await supabase
                        .from('work_orders')
                        .insert({
                            landlord_phone: normalizedLandlordPhone,
                            vendor_phone: normalizedVendorPhone,
                            summary: summary,
                            status: 'pending',
                            property_label: propertyLabel,
                            unit_label: unitLabel,
                            vendor_name: vendorName,
                            vendor_trade: vendorTrade
                        })
                        .select('id')
                        .single();

                    if (workOrderError) {
                        console.error('Failed to create work order:', workOrderError);
                    } else {
                        workOrderId = data?.id ?? null;
                        console.log('Work order created successfully for vendor:', vendorName, 'with ID:', workOrderId);
                    }
                } catch (workOrderError) {
                    console.error('Failed to create work order:', workOrderError);
                }

                await sendMessage(vendorPhoneNumber, messageBody, {
                    landlordPhone: normalizedLandlordPhone,
                    vendorPhone: normalizedVendorPhone,
                    senderRole: 'system',
                    workOrderId: workOrderId
                });
                sentToVendor = true;
            } catch (error: any) {
                console.error('Failed to send vendor SMS:', error);
                sendError = error?.message ?? 'Failed to send vendor SMS';
            }
        }
        
		return json({
            summary,
            sentToVendor,
            sendError,
            name: vendorName,
            trade: vendorTrade,
            property_label: propertyLabel,
            unit_label: unitLabel
        });
		
	} catch (error) {
		console.error('Damage check error:', error);
		return json({ error: 'Failed to analyze image' }, { status: 500 });
	}
};

