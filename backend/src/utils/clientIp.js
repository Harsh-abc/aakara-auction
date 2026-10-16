// "::1" → "127.0.0.1", "::ffff:10.0.0.5" → "10.0.0.5"
export const normalizeIp = (ip) => {
    if (!ip) return "unknown";

    if (ip === "::1") {
        return "127.0.0.1";
    }

    if (ip.startsWith("::ffff:")) {
        return ip.replace("::ffff:", "");
    }

    return ip;
};

// the visitor's address — req.ip follows X-Forwarded-For only from proxies
// trusted by app.set("trust proxy") in index.js
export const getClientIp = (req) => normalizeIp(req.ip ?? req.socket?.remoteAddress);
