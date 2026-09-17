import jwt from 'jsonwebtoken'
export function authenticate(req, res, next) {
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

        next();
    } catch (err) {
        console.error("JWT ERROR:", err);

        return res.status(401).json({
            success: false,
            message: "Invalid access token",
        });
    }
}