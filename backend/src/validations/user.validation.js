import { z } from 'zod';

export const getAllUsersSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
});

export const getUserByIdSchema = z.object({
    uuid: z.string().uuid("Invalid user id"),
});


const parseJson = (val) => {
    if (typeof val !== 'string') return val;
    try { return JSON.parse(val); } catch { return val; }
};

export const uploadUserKycSchema = z.object({
    kycType: z.enum(['INDIVIDUAL', 'BUSINESS']),
    documents: z.preprocess(
        parseJson,
        z.array(
            z.object({
                documentType: z.enum([
                    'PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'AADHAAR',
                    'PAN_CARD', 'UTILITY_BILL', 'BANK_STATEMENT', 'BUSINESS_REGISTRATION',
                ]),
                documentNumber: z.string().trim().max(50).optional(),
                expiresAt: z.coerce.date().optional(),
            })
        ).min(1, 'At least one document is required')
    ),
});