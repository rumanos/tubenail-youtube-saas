"use server"

import { getVideoIdFromUrl } from "@/lib/getVideoIdFromUrl";
// import { getVideoIdFromUrl } from "@/lib/youtube/getVideoIdFromUrl";
import { redirect } from "next/navigation";

export async function analyseYoutubeVideo(formData: FormData) {
  const url = formData.get("url")?.toString();
  if (!url) return;

  const videoId = getVideoIdFromUrl(url);

  console.log("videoId is >>>", videoId);
  if (!videoId) return;

  //Redirect to the new post
  redirect(`/video/${videoId}/analysis`)
}