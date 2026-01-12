// lib/r2.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Validate R2 configuration on startup
const r2Endpoint = process.env.R2_ENDPOINT?.trim();
const r2AccessKey = process.env.R2_ACCESS_KEY_ID?.trim();
const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

if (!r2Endpoint || !r2AccessKey || !r2SecretKey) {
  console.warn("⚠️  R2 configuration incomplete. File uploads may fail.");
  console.warn("Missing:", {
    R2_ENDPOINT: !r2Endpoint,
    R2_ACCESS_KEY_ID: !r2AccessKey,
    R2_SECRET_ACCESS_KEY: !r2SecretKey,
  });
}

const r2 = new S3Client({
  region: "auto",
  endpoint: r2Endpoint, 
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
});

/**
 * Upload buffer to a selected bucket
 * @param {*} buffer 
 * @param {*} bucket 
 * @param {*} key 
 * @param {*} contentType 
 * @returns public URL
 */
async function uploadToBucket(buffer, bucket, key, contentType) {
  // Validate and trim bucket name
  if (!bucket) {
    const error = new Error("Bucket name is required but was not provided (null/undefined)");
    console.error("❌ Upload validation error:", {
      bucket: bucket,
      bucketType: typeof bucket,
      key: key,
    });
    throw error;
  }

  const trimmedBucket = String(bucket).trim();
  if (trimmedBucket === '') {
    const error = new Error("Bucket name is required but was empty or whitespace only");
    console.error("❌ Upload validation error:", {
      originalBucket: bucket,
      trimmedBucket: trimmedBucket,
      key: key,
    });
    throw error;
  }

  // Validate and trim key
  if (!key) {
    const error = new Error("Key (file path) is required but was not provided (null/undefined)");
    console.error("❌ Upload validation error:", {
      bucket: trimmedBucket,
      key: key,
      keyType: typeof key,
    });
    throw error;
  }

  const trimmedKey = String(key).trim();
  if (trimmedKey === '') {
    const error = new Error("Key (file path) is required but was empty or whitespace only");
    console.error("❌ Upload validation error:", {
      bucket: trimmedBucket,
      originalKey: key,
      trimmedKey: trimmedKey,
    });
    throw error;
  }

  console.log("📤 Uploading to R2:", {
    bucket: trimmedBucket,
    key: trimmedKey.substring(0, 50) + (trimmedKey.length > 50 ? "..." : ""),
    contentType: contentType,
    bufferSize: buffer.length,
  });

  // Final validation before creating command
  if (!trimmedBucket || trimmedBucket === '') {
    throw new Error("Bucket name validation failed - bucket is empty after trimming");
  }

  const command = new PutObjectCommand({
    Bucket: trimmedBucket,
    Key: trimmedKey,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    await r2.send(command);
    console.log("✅ Upload successful:", { 
      bucket: trimmedBucket, 
      key: trimmedKey.substring(0, 50) + (trimmedKey.length > 50 ? "..." : "")
    });
  } catch (uploadError) {
    console.error("❌ R2 upload failed:", {
      bucket: trimmedBucket,
      key: trimmedKey,
      error: uploadError.message,
      errorCode: uploadError.Code,
      errorName: uploadError.name,
      stack: uploadError.stack,
    });
    throw uploadError;
  }

  // Determine which public base URL to use (compare with trimmed env vars)
  let publicBaseURL = "";
  const videosBucket = process.env.R2_BUCKET_VIDEOS?.trim();
  const docsBucket = process.env.R2_BUCKET_DOCS?.trim();
  const imagesBucket = process.env.R2_BUCKET_IMAGES?.trim();

  if (trimmedBucket === videosBucket) {
    publicBaseURL = process.env.R2_PUBLIC_URL_VIDEOS?.trim();
  } else if (trimmedBucket === docsBucket) {
    publicBaseURL = process.env.R2_PUBLIC_URL_DOCS?.trim();
  } else if (trimmedBucket === imagesBucket) {
    publicBaseURL = process.env.R2_PUBLIC_URL_IMAGES?.trim();
  } else {
    console.error("❌ Unknown bucket name:", {
      provided: trimmedBucket,
      expectedVideos: videosBucket,
      expectedDocs: docsBucket,
      expectedImages: imagesBucket,
    });
    throw new Error(`Unknown bucket name: "${trimmedBucket}". Expected one of: ${videosBucket}, ${docsBucket}, ${imagesBucket}`);
  }

  if (!publicBaseURL) {
    throw new Error(`Public URL not configured for bucket: ${trimmedBucket}`);
  }

  return `${publicBaseURL}/${trimmedKey}`;
}

async function deleteFromBucket(bucket, key) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await r2.send(command);
}

module.exports = { r2, uploadToBucket, deleteFromBucket };
