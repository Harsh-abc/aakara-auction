import jwt from 'jsonwebtoken'
import { tokenAccessProblem } from '../libs/accountBlock.js'

export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Missing or malformed access token",
        });
    }

    const token = authHeader.substring(7).trim();

    let decoded;
    try {
        decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        req.user = {
            uuid: decoded.sub,
            userId: decoded.userId,
            roleId: decoded.roleId,
            sessionId: decoded.sessionId,
            role: decoded.role,
            permissions: decoded.permissions ?? [],
            // this login entered its authenticator code (libs/dashboardMfa.js)
            mfa: decoded.mfa === true,
        };
    } catch {
        // expired / invalid token — the app refreshes on a 401
        return res.status(401).json({
            success: false,
            message: "Invalid access token",
        });
    }

    // suspended, or role / password changed, after this token was issued — 401 so the app
    // tries to refresh: a suspended or demoted account can't (its sessions are gone) and is
    // logged out; after a password change this browser's session gets a fresh token
    const problem = await tokenAccessProblem(decoded);
    if (problem) {
        return res.status(401).json({
            success: false,
            message: problem === "SUSPENDED" ? "Your account has been suspended" : "Your access has changed. Please log in again.",
        });
    }

    next();
}

// like authenticate, but lets guests through: req.user is set only for a valid access token
export async function optionalAuthenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    try {
        const decoded = jwt.verify(authHeader.substring(7).trim(), process.env.JWT_ACCESS_SECRET);
        // a suspended account, or a token from before a role / password change, is treated as a guest
        if (!(await tokenAccessProblem(decoded))) {
            req.user = {
                uuid: decoded.sub,
                userId: decoded.userId,
                roleId: decoded.roleId,
                sessionId: decoded.sessionId,
                role: decoded.role,
                permissions: decoded.permissions ?? [],
                mfa: decoded.mfa === true,
            };
        }
    } catch {
        // expired / invalid token — watch as a guest
    }
    next();
}
