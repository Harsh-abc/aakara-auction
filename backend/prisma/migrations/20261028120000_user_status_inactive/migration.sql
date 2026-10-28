-- New signups start INACTIVE: they can log in and upload KYC, but can't register
-- for auctions or bid until staff make them ACTIVE. Existing accounts are unchanged.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';
