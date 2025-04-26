"use server";

import { getConvexClient } from "@/lib/convex";
import { currentUser } from "@clerk/nextjs/server";
import { createVertex } from '@ai-sdk/google-vertex';
import { experimental_generateImage as generateImage } from 'ai';
import { api } from "@/convex/_generated/api";
import { client } from "@/lib/schematic";
import { FeatureFlag, featureFlagEvents } from "@/features/flags";

const convexClient = getConvexClient();

const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT,
  location: process.env.GOOGLE_VERTEX_LOCATION,
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  },
});

export const vertexImageGeneration = async (prompt: string, videoId: string) => {
  const user = await currentUser();

  if(!user?.id) {
    throw new Error("User not found");
  }

  if (!prompt) {
    throw new Error("Failed to generate image prompt");
  }
  
  console.log("🎨 Generating image with prompt: ", prompt);

  // Generate the image using Imagen-3
  const { image } = await generateImage({
    model: vertex.image('imagen-3.0-generate-002'),
    prompt: prompt,
    aspectRatio: '16:9',
  });

  const base64 = image.base64; // base64 image data

  if (!base64) {
    throw new Error("Failed to generate image");
  }

  // 1. Get Convex upload URL
  const postUrl = await convexClient.mutation(api.images.generateUploadUrl);

  // 2. Convert base64 to Blob
  const imageBlob = Buffer.from(base64, "base64");

  // 3. Upload the image data via POST
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": image!.mimeType },
    // headers: { "Content-Type": "image/png" }, // Assuming PNG, adjust if needed
    body: imageBlob,
  });

  const { storageId } = await result.json();

  if (!storageId) {
      throw new Error("Failed to get storage ID from Convex upload.");
  }

  // 4. Store the image metadata in the Convex database
  await convexClient.mutation(api.images.storeImage, {
      storageId: storageId,
      videoId: videoId,
      userId: user.id,
  });

  console.log("✅ Image stored successfully with storageId:", storageId);

  // Get serve image url
  const dbImageUrl = await convexClient.query(api.images.getImage, {
    videoId,
    userId: user.id
  });

  // Track the image generation event
  await client.track({
    event: featureFlagEvents[FeatureFlag.IMAGE_GENERATION].event,
    company: { id: user.id },
    user: { id: user.id },
  });

  return {
    imageUrl: dbImageUrl,
  }
}