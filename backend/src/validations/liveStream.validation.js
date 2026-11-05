import { z } from "zod";

// a LiveKit identity: "user-<uuid>" (or "host-<uuid>", refused by the service)
export const viewerIdentityParamSchema = z.object({
    identity: z.string().regex(/^[a-z]+-[a-zA-Z0-9-]{1,72}$/, { message: "Invalid viewer" }),
});

export const removeViewerBodySchema = z.object({
    ban: z.boolean().optional().default(false),
    name: z.string().trim().max(120).optional(),
});
