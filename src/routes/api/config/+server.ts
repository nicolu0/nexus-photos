import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
    return json({
        fromNumber: process.env.SINCH_FROM_NUMBER ?? null,
        landlordNumber: process.env.LANDLORD_NUMBER ?? null,
        vendorNumber: process.env.VENDOR_NUMBER ?? null
    });
};
