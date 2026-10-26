import { getIpBlocksService, unblockAllIpsService, unblockIpService } from "../services/ipBlock.services.js";

const handleError = (res, error, label, fallback) => {
    console.error(`${label} error:`, error);
    const status = error.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: status === 500 ? fallback : error.message,
    });
};

// -----------------------------------------------------------------
// GET /api/admin/ip-blocks — blocked IPs and IPs with failed sign-ins
// -----------------------------------------------------------------

export const getIpBlocks = async (req, res) => {
    try {
        const data = await getIpBlocksService();
        res.set("Cache-Control", "no-store");
        return res.status(200).json({ success: true, message: "Blocked IP addresses fetched successfully", data });
    } catch (error) {
        return handleError(res, error, "Get IP blocks", "Failed to fetch the blocked IP addresses");
    }
};

// -----------------------------------------------------------------
// DELETE /api/admin/ip-blocks/:ip — clears the block and the failure count
// -----------------------------------------------------------------

export const unblockIp = async (req, res) => {
    try {
        const ip = String(req.params.ip ?? "").trim();
        if (!ip || ip.length > 64 || /[\s*?[\]]/.test(ip)) {
            return res.status(400).json({ success: false, message: "Invalid IP address" });
        }
        await unblockIpService(ip);
        return res.status(200).json({ success: true, message: `${ip} can sign in again` });
    } catch (error) {
        return handleError(res, error, "Unblock IP", "Failed to unblock the IP address");
    }
};

// -----------------------------------------------------------------
// DELETE /api/admin/ip-blocks — clears every block and failure count
// -----------------------------------------------------------------

export const unblockAllIps = async (req, res) => {
    try {
        const count = await unblockAllIpsService();
        return res.status(200).json({
            success: true,
            message: `Unblocked ${count} IP address${count === 1 ? "" : "es"} and cleared every failed sign-in count`,
            data: { count },
        });
    } catch (error) {
        return handleError(res, error, "Unblock all IPs", "Failed to unblock the IP addresses");
    }
};
