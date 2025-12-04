import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = () => {
    return json({
        fromNumber: env.SINCH_FROM_NUMBER ?? null,
        landlordNumber: env.LANDLORD_NUMBER ?? null,
        vendorNumber: env.VENDOR_NUMBER ?? null
    });
};
