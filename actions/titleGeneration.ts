"use server";

import { api } from "@/convex/_generated/api";
import { FeatureFlag, featureFlagEvents } from "@/features/flags";
import { getConvexClient } from "@/lib/convex";
import { client } from "@/lib/schematic";
import { createVertex } from "@ai-sdk/google-vertex";
import { currentUser } from "@clerk/nextjs/server";
import { generateText } from "ai";

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

export async function titleGeneration(
  videoId: string,
  videoSummary: string,
  considerations: string
) {
  const user = await currentUser();

  if(!user?.id) {
    throw new Error("User not found");
  }

  try {
    console.log("🎯 Video summary:", videoSummary);
    console.log("🎯 Generating title for video for videoId:", videoId);
    console.log("🎯 Considerations:", considerations);

    const { text } = await generateText({
      model: vertex("gemini-1.5-pro"),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful YouTube video creator assistant that creates high quality SEO friendly concise video titles."
        },
        {
          role: "user",
          content: `Please provide ONE concise YouTube title (and nothing else) for this video. Focus on the main points and key takeaways, it should be SEO friendly and 100 characters or less:\n\n${videoSummary}\n\n${considerations}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 500,
    });

    const title = text || "Unable to generate title ";

    if (!title) {
      return {
        error: "Failed to generate title (System error)",
      };
    }

    await convexClient.mutation(api.titles.generate, {
      videoId,
      userId: user.id,
      title: title
    })

    await client.track({
      event: featureFlagEvents[FeatureFlag.TITLE_GENERATIONS].event,
      company: { id: user.id },
      user: { id: user.id },
    })

    console.log("🎯 Title generated:", title);

    return title;
  } catch (error) {
    console.error("❌ Error generating title:", error);
    throw new Error("Failed to generate title");
  }
}