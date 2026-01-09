// lib/r2.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, 
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
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
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2.send(command);

  // Determine which public base URL to use
  let publicBaseURL = "";

  if (bucket === process.env.R2_BUCKET_VIDEOS) {
    publicBaseURL = process.env.R2_PUBLIC_URL_VIDEOS;
  } else if (bucket === process.env.R2_BUCKET_DOCS) {
    publicBaseURL = process.env.R2_PUBLIC_URL_DOCS;
  } else if (bucket === process.env.R2_BUCKET_IMAGES) {
    publicBaseURL = process.env.R2_PUBLIC_URL_IMAGES;
  } else {
    throw new Error("Unknown bucket name: " + bucket);
  }

  return `${publicBaseURL}/${key}`;
}

async function deleteFromBucket(bucket, key) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await r2.send(command);
}

module.exports = { r2, uploadToBucket, deleteFromBucket };
