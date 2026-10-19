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
// trusted by app.set("trust proxy") in index.js. Many nginx configs only set
// X-Real-IP, so fall back to it when the request came straight from a trusted proxy.
export const getClientIp = (req) => {
    const peer = req.socket?.remoteAddress;
    const isTrusted = req.app?.get("trust proxy fn");
    const realIp = req.get?.("x-real-ip")?.trim();

    if (!req.get?.("x-forwarded-for") && realIp && peer && isTrusted?.(peer, 0)) {
        return normalizeIp(realIp);
    }

    return normalizeIp(req.ip ?? peer);
};
