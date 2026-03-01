import {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 uses S3-compatible API
const R2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET = process.env.R2_BUCKET_NAME || '';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export async function uploadToR2(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string
) {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    });
    await R2.send(command);
    return getPublicUrl(key);
}

export async function deleteFromR2(key: string) {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });
    await R2.send(command);
}

export async function listFromR2(prefix?: string) {
    const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
    });
    const response = await R2.send(command);
    return response.Contents || [];
}

export async function getPresignedUrl(key: string) {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });
    return getSignedUrl(R2, command, { expiresIn: 3600 });
}

export function getPublicUrl(key: string) {
    if (PUBLIC_URL) {
        return `${PUBLIC_URL}/${key}`;
    }
    return `https://${BUCKET}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

export { R2, BUCKET };
