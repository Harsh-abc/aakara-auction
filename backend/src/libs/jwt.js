// One place for JWT options: the algorithm is pinned (no "none" / algorithm-confusion
// tricks) and each kind of token gets its own audience, so an access token can't be
// replayed as a refresh or password-reset token, or the other way round.
const ISSUER = "aakara-api";

export const JWT_AUDIENCE = {
    ACCESS: "aakara-access",
    REFRESH: "aakara-refresh",
    PASSWORD_RESET: "aakara-password-reset",
};

export const jwtSignOptions = (audience, expiresIn) => ({ algorithm: "HS256", issuer: ISSUER, audience, expiresIn });

export const jwtVerifyOptions = (audience) => ({ algorithms: ["HS256"], issuer: ISSUER, audience });
