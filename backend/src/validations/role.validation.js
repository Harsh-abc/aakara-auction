import { z } from 'zod'

export const changeRoleSchema = z.object({
    roleName: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'AUCTIONEER', 'BIDDER', 'USER']),
})

// suspend / reactivate an account (super admin)
export const changeUserStatusSchema = z.object({
    action: z.enum(['SUSPEND', 'REACTIVATE']),
})

// "Verified for lots" on the user page (super admin)
export const setLotsVerifiedSchema = z.object({
    verified: z.boolean(),
})

// bidding limit on the user page (super admin): an amount sets it, null removes it
export const setBiddingLimitSchema = z.object({
    amount: z
        .number({ message: 'Enter the limit as a number' })
        .positive('The limit must be more than zero')
        .max(9999999999.99, 'The limit is too large')
        .nullable(),
    currency: z.string().trim().toUpperCase().length(3, 'Pick a currency').default('INR'),
})
