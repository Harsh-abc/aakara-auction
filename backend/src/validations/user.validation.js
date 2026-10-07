import { z } from 'zod';
import { changeRoleSchema } from './role.validation.js';

export const getAllUsersSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    emailVerified: z.enum(['true', 'false']).optional(),
    kycStatus: z.enum(['NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED']).optional(),
    role: z.string().trim().toUpperCase().optional(),
});

export const getUserByIdSchema = z.object({
    uuid: z.string().uuid("Invalid user id"),
});


const parseJson = (val) => {
    if (typeof val !== 'string') return val;
    try { return JSON.parse(val); } catch { return val; }
};

// mirrors the DocumentType enum in schema.prisma
export const KYC_DOCUMENT_TYPES = [
    'PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'AADHAAR',
    'PAN_CARD', 'UTILITY_BILL', 'BANK_STATEMENT', 'BUSINESS_REGISTRATION', 'OTHERS'
];

export const uploadUserKycSchema = z.object({
    kycType: z.enum(['INDIVIDUAL', 'BUSINESS']),
    documents: z.preprocess(
        parseJson,
        z.array(
            z.object({
                documentType: z.enum(KYC_DOCUMENT_TYPES),
                documentNumber: z.string().trim().max(50).optional(),
                expiresAt: z.coerce.date().optional(),
            })
        ).min(1, 'At least one document is required')
    ),
});

// bidder submitting their own KYC — file for documents[i] arrives as the "document_i" field
export const submitMyKycSchema = z.object({
    kycType: z.enum(['INDIVIDUAL', 'BUSINESS']),
    documents: z.preprocess(
        parseJson,
        z.array(z.object({ documentType: z.enum(KYC_DOCUMENT_TYPES) }))
            .min(1, 'Add at least one document')
            .max(10, 'Upload at most 10 documents at a time')
            .refine((docs) => {
                const types = docs.map((d) => d.documentType).filter((t) => t !== 'OTHERS');
                return new Set(types).size === types.length;
            }, 'Each document type can only be uploaded once')
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
        // lives on User, not UserProfile — stored with its country code, e.g. +919876543210
        phone: emptyToNull(z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').nullable().optional()),
    })
    .strict();


export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .max(64, 'Password must be 64 characters or fewer')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol'),
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
        message: 'New password must be different from your current password',
        path: ['newPassword'],
    });





export const createUserSchema = z.object({
    fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name too long"),
    email: z.string().trim().toLowerCase().email("Invalid email"),
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password too long"),
});

// Super admin "Add User" from Settings → Team: same fields plus the role to give them
export const createUserWithRoleSchema = createUserSchema.extend({
    roleName: changeRoleSchema.shape.roleName.default("BIDDER"),
});

// staff approving / rejecting submitted KYC documents (one or many at once)
export const reviewKycSchema = z.object({
    reviews: z.array(
        z.object({
            documentId: z.string().regex(/^\d+$/, 'Invalid document id'),
            action: z.enum(['APPROVE', 'REJECT']),
            reason: z.string().trim().max(300, 'Reason must be 300 characters or fewer').optional(),
        }).refine((r) => r.action === 'APPROVE' || !!r.reason, {
            message: 'Give a reason when rejecting a document',
            path: ['reason'],
        })
    )
        .min(1, 'Choose at least one document to review')
        .refine((reviews) => new Set(reviews.map((r) => r.documentId)).size === reviews.length, 'Each document can only be reviewed once'),
});


// staff asking a user to upload specific KYC documents
export const requestKycDocumentsSchema = z.object({
    documentTypes: z.array(z.enum(KYC_DOCUMENT_TYPES))
        .min(1, 'Choose at least one document to request')
        .refine((types) => new Set(types).size === types.length, 'Each document can only be requested once'),
    note: z.string().trim().max(500, 'Note must be 500 characters or fewer').optional(),
});
