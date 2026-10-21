// How long a login lasts, from sign-in. Access token, refresh token and the refresh
// cookie all end with it — refreshing never extends it — so after this the user
// logs in again (storefront and dashboard alike). See services/auth.services.js.
export const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
