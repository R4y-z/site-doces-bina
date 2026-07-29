import { S3Client } from "@aws-sdk/client-s3";
import { getEnv } from "./env.js";

// R2 expõe um endpoint compatível com S3, então usamos o SDK oficial da AWS
// apontando pra ele. Client singleton pelo mesmo motivo do db.ts.
let client: S3Client | null = null;

export function getStorage(): S3Client {
  if (!client) {
    const env = getEnv();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export function getBucketName(): string {
  return getEnv().R2_BUCKET_NAME;
}
