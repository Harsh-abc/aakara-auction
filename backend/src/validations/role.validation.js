import { z } from 'zod'

export const changeRoleSchema = z.object({
    roleName: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'AUCTIONEER', 'BIDDER']),
})