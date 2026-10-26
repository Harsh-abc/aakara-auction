import { z } from 'zod'

export const changeRoleSchema = z.object({
    roleName: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'AUCTIONEER', 'BIDDER', 'USER']),
})

// suspend / reactivate an account (super admin)
export const changeUserStatusSchema = z.object({
    action: z.enum(['SUSPEND', 'REACTIVATE']),
})