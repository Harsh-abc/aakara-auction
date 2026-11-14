/**
 * SMS through MSG91's Flow API (https://docs.msg91.com/sms/send-sms), using the DLT-approved
 * "Akara-Reg" SMS template (sender AKARAZ):
 *   "Your OTP for registering with Aakara Art is ##var1##. This OTP is valid for ##var2## min. …"
 * We generate the code ourselves and verify it against Redis; MSG91 only delivers it.
 * Every variable must be filled, or the text no longer matches DLT and the operator drops it
 * (MSG91 still answers "success").
 *
 * env: MSG91_AUTH_KEY, MSG91_TEMPLATE_ID (MSG91's 24-character template id, not the DLT one)
 *      MSG91_RESET_TEMPLATE_ID — the password-reset template (same var1 = code, var2 = minutes)
 *      MSG91_PROXY_TEMPLATE_ID — "proxy bid set" (var1 = name, var2 = lot number)
 *      MSG91_DRY_RUN=true — log the code instead of sending (local dev, no SMS cost)
 */
import https from "node:https";

const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow";
const REQUEST_TIMEOUT_MS = 10_000;

// POST JSON over IPv4 only. The MSG91 authkey has an IP whitelist, and servers with IPv6
// (e.g. Lightsail) would otherwise reach MSG91 over it — MSG91 then sees an unlisted IPv6
// address and silently drops the SMS. `fetch` can't pin the address family, https can.
const postJsonIPv4 = (url, headers, payload) =>
    new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = https.request(
            url,
            {
                method: "POST",
                family: 4,
                headers: { ...headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
                timeout: REQUEST_TIMEOUT_MS,
            },
            (res) => {
                let raw = "";
                res.setEncoding("utf8");
                res.on("data", (chunk) => (raw += chunk));
                res.on("end", () => {
                    let body = null;
                    try {
                        body = JSON.parse(raw);
                    } catch {
                        // non-JSON answer — treated as a failure below
                    }
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body });
                });
            }
        );
        req.on("timeout", () => req.destroy(new Error(`timed out after ${REQUEST_TIMEOUT_MS}ms`)));
        req.on("error", reject);
        req.end(data);
    });

const httpError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const SEND_FAILED = "We couldn't send the SMS code. Please try again in a moment.";

// "+919876543210" → "919876543210": MSG91 wants the country code without the "+"
const toMsg91Mobile = (e164) => e164.replace(/^\+/, "");

// DLT caps each variable at 30 characters; a longer value no longer matches the template
const DLT_VAR_MAX = 30;

// `phone` is E.164 (validated at signup); works for international numbers too
// when the international route is enabled on the MSG91 account.
// `vars` are the template's ##var1##, ##var2##, … in order — every one must be filled.
const sendFlowSms = async ({ phone, templateId, vars, label }) => {
    const filled = Object.fromEntries(vars.map((value, i) => [`var${i + 1}`, String(value ?? "").slice(0, DLT_VAR_MAX)]));

    if (process.env.MSG91_DRY_RUN === "true") {
        console.warn(`[sms] MSG91_DRY_RUN — ${label} SMS for ${phone}:`, filled);
        return { requestId: null };
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey || !templateId) {
        console.error("[sms] MSG91_AUTH_KEY or the SMS template id is not set");
        throw httpError(SEND_FAILED, 503);
    }

    let response;
    try {
        response = await postJsonIPv4(
            MSG91_FLOW_URL,
            { authkey: authKey, accept: "application/json" },
            {
                template_id: templateId,
                short_url: "0",
                recipients: [{ mobiles: toMsg91Mobile(phone), ...filled }],
            }
        );
    } catch (err) {
        console.error("[sms] MSG91 request failed:", err.message);
        throw httpError(SEND_FAILED, 502);
    }
    const { body } = response;

    // MSG91 can answer 200 with { type: "error", message }
    if (!response.ok || body?.type !== "success") {
        console.error("[sms] MSG91 rejected the SMS:", response.status, body?.message ?? body);
        throw httpError(SEND_FAILED, 502);
    }

    // on success the Flow API puts the request id in `message`. "success" only means queued —
    // MSG91 accepts even unknown template ids — so delivery is checked in MSG91 → Reports → Logs
    const requestId = body.request_id ?? body.message ?? null;
    console.info(`[sms] MSG91 queued ${label} SMS for …${phone.slice(-3)} — request id ${requestId}`);
    return { requestId };
};

// var1 = the code, var2 = minutes it's valid for (signup "Akara-Reg" and reset "res_psw" templates).
// `templateId` defaults to the signup template; password reset passes MSG91_RESET_TEMPLATE_ID
export const sendOtpSms = ({ phone, otp, validForMinutes, templateId = process.env.MSG91_TEMPLATE_ID }) =>
    sendFlowSms({ phone, templateId, vars: [otp, validForMinutes], label: "OTP" });

// "P_SET2": "Dear ##var1##, your proxy bid for Lot ##var2## is now active. …"
export const sendProxyBidSetSms = ({ phone, name, lotNumber }) =>
    sendFlowSms({
        phone,
        templateId: process.env.MSG91_PROXY_TEMPLATE_ID,
        vars: [name || "Collector", lotNumber],
        label: "proxy bid",
    });
