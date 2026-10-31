// Account statuses (UserStatus in schema.prisma).
//
// ACTIVE   — full access.
// ACTIVE is where new signups start.
// INACTIVE — switched off by staff: can log in, edit their profile and
//            upload KYC, but can't register for auctions or bid.
// SUSPENDED / BANNED / DEACTIVATED — can't log in at all.

/** Statuses that may log in, refresh a session or reset their password */
export const SIGN_IN_STATUSES = ['ACTIVE', 'INACTIVE'];

export const canSignIn = (status) => SIGN_IN_STATUSES.includes(status);
