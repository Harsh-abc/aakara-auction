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
                    'PAN_CARD', 'UTILITY_BILL', 'BANK_STATEMENT', 'BUSINESS_REGISTRATION', 'OTHERS'
                ]),
                documentNumber: z.string().trim().max(50).optional(),
                expiresAt: z.coerce.date().optional(),
            })
        ).min(1, 'At least one document is required')
    ),
});



const emptyToNull = (schema) => z.preprocess((v) => (v === '' ? null : v), schema);

const optionalText = (max) => emptyToNull(z.string().trim().max(max).nullable().optional());

export const updateMyProfileSchema = z
    .object({
        firstName: optionalText(50),
        lastName: optionalText(50),
        displayName: optionalText(60),
        bio: optionalText(500),
        gender: emptyToNull(z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).nullable().optional()),
        dateOfBirth: emptyToNull(
            z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in yyyy-MM-dd format')
                .refine((d) => new Date(d) < new Date(), 'Date of birth cannot be in the future')
                .transform((d) => new Date(d))
                .nullable()
                .optional()
        ),
        address: optionalText(255),
        city: optionalText(100),
        state: optionalText(100),
        country: optionalText(100),
        pincode: emptyToNull(z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits').nullable().optional()),
    })
    .strict();