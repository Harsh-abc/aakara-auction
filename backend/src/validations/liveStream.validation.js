import { z } from "zod";

// stable id the viewer's browser keeps, so a guest can be removed / banned
export const viewerTokenQuerySchema = z.object({
    viewerId: z
        .string({ message: "viewerId is required" })
        .regex(/^[a-zA-Z0-9-]{8,40}$/, { message: "Invalid viewerId" }),
});

// a LiveKit identity: "user-<uuid>", "viewer-<id>" (or "host-<uuid>", refused by the service)
export const viewerIdentityParamSchema = z.object({
    identity: z.string().regex(/^[a-z]+-[a-zA-Z0-9-]{1,72}$/, { message: "Invalid viewer" }),
});

export const removeViewerBodySchema = z.object({
    ban: z.boolean().optional().default(false),
    name: z.string().trim().max(120).optional(),
});
