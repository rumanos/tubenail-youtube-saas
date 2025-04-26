"use client";

import { getVideoDetails } from "@/actions/getVideoDetails";
import { VideoDetails } from "@/types/types";
import { Calendar, Eye, MessageCircle, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

function YoutubeVideoDetails({ videoId }: { videoId: string }) {
  const [video, setVideo] = useState<VideoDetails | null>(null);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      const video = await getVideoDetails(videoId);
      setVideo(video ?? null);
    }

    fetchVideoDetails();
  }, [videoId]);

  if (!video) return (
    <div className="flex items-center justify-center p-4">
      <div className="h-8 w-8 border-4 border-zinc-300 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="@container bg-white rounded-xl">
      <div className="flex flex-col gap-8">
        {/* Video Thumbnail */}
        <div className="flex-shrink-0">
          <Image
            src={video.thumbnail}
            alt={video.title}
            width={500}
            height={500}
            className="w-full rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300"
          />
        </div>

        {/* Video Details */}
        <div className="flex-grow space-y-4">
          <h1 className="text-2xl @lg:text-3xl font-bold text-zinc-900 leading-tight line-clamp-2">
            {video.title}
          </h1>

          {/* Channel info */}
          <div className="flex items-center gap-4">
            <Image
              src={video.channel.thumbnail}
              alt={video.channel.title}
              width={48}
              height={48}
              className="w-10 h-10 @md:w-12 @md:h-12 rounded-full border-2 border-zinc-100"
            />
            <div>
              <p className="text-base @md:text-lg font-semibold text-zinc-900">
                {video.channel.title}
              </p>
              <p className="text-sm @md:text-base text-zinc-600">
                {video.channel.subscribers} subscribers
              </p>
            </div>
          </div>

          {/* Video Stats */}
          <div className="grid grid-cols-2 @lg:grid-cols-4 gap-2 pt-4">
            <div className="bg-zinc-50 rounded-lg p-3 transition-all duration-300 hover:bg-zinc-100">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-zinc-600" />
                <p className="text-sm text-zinc-600">Published</p>
              </div>
              <p className="font-medium text-zinc-900">
                {new Date(video.publishedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-zinc-50 rounded-lg p-3 transition-all duration-300 hover:bg-zinc-100">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-zinc-600" />
                <p className="text-sm text-zinc-600">Views</p>
              </div>
              <p className="font-medium text-zinc-900">
                {video.views}
              </p>
            </div>

            <div className="bg-zinc-50 rounded-lg p-3 transition-all duration-300 hover:bg-zinc-100">
              <div className="flex items-center gap-2 mb-1">
                <ThumbsUp className="w-4 h-4 text-zinc-600" />
                <p className="text-sm text-zinc-600">Likes</p>
              </div>
              <p className="font-medium text-zinc-900">
                {video.likes}
              </p>
            </div>

            <div className="bg-zinc-50 rounded-lg p-3 transition-all duration-300 hover:bg-zinc-100">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-zinc-600" />
                <p className="text-sm text-zinc-600">Comments</p>
              </div>
              <p className="font-medium text-zinc-900">
                {video.comments}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default YoutubeVideoDetails
