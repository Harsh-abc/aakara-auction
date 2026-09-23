import crypto from "crypto";
import path from "path";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import s3Client from "../config/s3.js";

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;

/**
 * "My Painting (final).JPG" -> "my-painting-final.jpg"
 * Spaces / brackets / unicode in S3 keys produce broken public URLs.
 */
const safeFileName = (originalname = "file") => {
    const ext = path.extname(originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const base = path
        .basename(originalname, path.extname(originalname))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    return `${base || "file"}${ext}`;
};

export const uploadToS3 = async ({ file, folder }) => {
    const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeFileName(file.originalname)}`;
    const key = `${folder}/${fileName}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        })
    );

    return {
        key,
        fileName,
        bucket: BUCKET_NAME,
        url: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`,
    };
};

export const deleteFromS3 = async (key) => {
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        })
    );
    return true;
};