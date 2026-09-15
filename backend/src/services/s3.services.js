import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

import s3Client from '../config/s3.js'

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

export const uploadToS3 = async ({ file, folder }) => {
    const fileName = `${Date.now()}-${file.originalname}`;

    const key = `${folder}/${fileName}`;

    const globalFileUplaoder = `${BUCKET_NAME}.s3.${process.env.AWS_REGION}`

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const url = `https://${globalFileUplaoder}.amazonaws.com/${key}`;

    // console.log(url)

    return {
        key,
        fileName,
        bucket: BUCKET_NAME,
        url,
    };
};


export const deleteFromS3 = async (key) => {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);

    return true;
};