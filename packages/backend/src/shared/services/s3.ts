import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

/**
 * Uploads a file buffer to S3 and returns the object key.
 */
export const uploadToS3 = async (
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = 'uploads'
): Promise<{ key: string; url: string }> => {
  const ext = originalName.split('.').pop() ?? 'bin';
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const url = `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
  return { key, url };
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key,
    })
  );
};

export const getPresignedUrl = async (key: string, expiresIn = 3600): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: env.aws.s3Bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};
