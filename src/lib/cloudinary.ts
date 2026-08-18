import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from "cloudinary";

// Helper to clean quotes and whitespace from env strings
const cleanEnv = (val?: string) => val ? val.trim().replace(/^["']|["']$/g, "") : undefined;

// Initialize Cloudinary with runtime configuration and fallbacks
function getCloudinaryConfig() {
  let cloudName = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
  let apiKey = cleanEnv(process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
  let apiSecret = cleanEnv(process.env.CLOUDINARY_API_SECRET);

  // Support full CLOUDINARY_URL string (cloudinary://<key>:<secret>@<cloud_name>)
  if (process.env.CLOUDINARY_URL && (!cloudName || !apiKey || !apiSecret)) {
    const cleanUrl = cleanEnv(process.env.CLOUDINARY_URL) || "";
    const match = cleanUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    if (match) {
      apiKey = apiKey || match[1];
      apiSecret = apiSecret || match[2];
      cloudName = cloudName || match[3];
    }
  }

  return {
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  };
}

cloudinary.config(getCloudinaryConfig());

export { cloudinary };

export interface CloudinaryUploadResult {
  url: string;
  public_id: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

/**
 * Upload a Buffer or Uint8Array directly to Cloudinary
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer | Uint8Array,
  options: UploadApiOptions = {}
): Promise<CloudinaryUploadResult> {
  const config = getCloudinaryConfig();

  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    console.error("❌ Cloudinary Config Missing:", {
      cloud_name: !!config.cloud_name,
      api_key: !!config.api_key,
      api_secret: !!config.api_secret,
    });
    throw new Error(
      `Cloudinary configuration missing in environment variables. Found: cloud_name=${!!config.cloud_name}, api_key=${!!config.api_key}, api_secret=${!!config.api_secret}. Please check .env.local and restart your dev server.`
    );
  }

  cloudinary.config(config);

  const defaultOptions: UploadApiOptions = {
    folder: "ivest",
    resource_type: "auto",
    transformation: [
      { quality: "auto", fetch_format: "auto" },
    ],
    ...options,
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed with empty response"));
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}
