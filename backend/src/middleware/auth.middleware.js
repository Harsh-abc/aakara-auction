import jwt from 'jsonwebtoken'
import { isUserBlocked } from '../libs/accountBlock.js'

export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    console.log("========== AUTH DEBUG ==========");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Authorization:", authHeader);
    console.log("================================");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Missing or malformed access token",
        });
    }

    const token = authHeader.substring(7).trim();

    console.log("TOKEN EXISTS:", !!token);
    console.log("TOKEN LENGTH:", token.length);

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        console.log("DECODED:", decoded);

        req.user = {
            uuid: decoded.sub,
            userId: decoded.userId,
            roleId: decoded.roleId,
            sessionId: decoded.sessionId,
            role: decoded.role,
            permissions: decoded.permissions ?? [],
        };

        console.log("REQ.USER:", req.user);
    } catch (err) {
        console.error("JWT ERROR:", err);

        return res.status(401).json({
            success: false,
            message: "Invalid access token",
        });
    }

    // suspended after this token was issued — 401 so the app tries to refresh, which the
    // suspended account can't, and logs the user out
    if (await isUserBlocked(req.user.userId)) {
        return res.status(401).json({
            success: false,
            message: "Your account has been suspended",
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
        // a suspended account is treated as a guest
        if (!(await isUserBlocked(decoded.userId))) {
            req.user = {
                uuid: decoded.sub,
                userId: decoded.userId,
                roleId: decoded.roleId,
                sessionId: decoded.sessionId,
                role: decoded.role,
                permissions: decoded.permissions ?? [],
            };
        }
    } catch {
        // expired / invalid token — watch as a guest
    }
    next();
}
