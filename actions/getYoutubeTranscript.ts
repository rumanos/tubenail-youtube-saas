"use server";

import { api } from "@/convex/_generated/api";
import { FeatureFlag, featureFlagEvents } from "@/features/flags";
import { client } from "@/lib/schematic";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { Innertube } from "youtubei.js";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface TranscriptEntry {
  text: string;
  timestamp: string;
}

const youtube = await Innertube.create({
  lang: "en",
  location: "US",
  retrieve_player: false,
})

function formatTimestamp(start_ms: number): string {
  const minutes = Math.floor(start_ms / 60000);
  const seconds = Math.floor((start_ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function fetchTranscript(videoId: string): Promise<TranscriptEntry[]> {
  try {
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();
    const transcript: TranscriptEntry[] = 
    transcriptData.transcript.content?.body?.initial_segments.map(
      segment => ({
        text: segment.snippet.text ?? "N/A",
        timestamp: formatTimestamp(Number(segment.start_ms)),
      })
    ) ?? [];
  
    return transcript;
  } catch (error) {
    console.log("Error fetching transcript:", error);
    throw error;
  }
}


export async function getYoutubeTranscript(videoId: string) {
  console.log("Attempting to fetch transcript for video ID:", videoId);
  const user = await currentUser();

  if(!user?.id) {
    throw new Error("User not found");
  }

  console.log("Checking if transcript exists in database for user ID:", user.id, "and video ID:", videoId);
  const existingTranscript = await convex.query(
    api.transcript.getTranscriptByVideoId,
    { videoId, userId: user.id }
  );

  if (existingTranscript) {
    console.log("🔍 Transcript found in database for video ID:", videoId);
    return {
      cache: 
        "This video has already been transcribed - Accessing cached transcript instead of using a token",
      transcript: existingTranscript.transcript,
    };
  }

  console.log("Transcript not found in database, attempting to fetch from YouTube for video ID:", videoId);
  try {
    const transcript = await fetchTranscript(videoId);
    console.log("Transcript fetched successfully for video ID:", videoId);

    console.log("Storing transcript in database for user ID:", user.id, "and video ID:", videoId);
    await convex.mutation(api.transcript.storeTranscript, {
      videoId,
      userId: user.id,
      transcript,
    });

    console.log("Tracking transcription event for user ID:", user.id);
    await client.track({
      event: featureFlagEvents[FeatureFlag.TRANSCRIPTION].event,
      company: { id: user.id },
      user: { id: user.id },
    })

    return {
      transcript,
      cache:
        "This video was transcribed using a token, the transcript is now saved in the database",
    }

  } catch (error) {
    console.error("❌ Error fetching transcript for video ID:", videoId, "Error:", error);
    return {
      transcript: [],
      cache: "Error fetching transcript, please try again later",
    };
  }
}