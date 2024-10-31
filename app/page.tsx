// src/app/page.tsx
"use client";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import { VisualizerState } from "./types";

const Visualizer = dynamic(() => import("./Visualizer"), {
  ssr: false,
});

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState<string>(
    "https://www.youtube.com/watch?v=i_7bLbrbz-k"
  );
  const [visualizerState, setVisualizerState] = useState<VisualizerState>({
    isLoading: false,
    error: null,
    isPlaying: false,
  });

  const extractVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v");
      } else if (urlObj.hostname === "youtu.be") {
        return urlObj.pathname.slice(1);
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(youtubeUrl);

    if (!videoId) {
      setVisualizerState({
        isLoading: false,
        error: "Invalid YouTube URL",
        isPlaying: false,
      });
      return;
    }

    setVisualizerState({
      isLoading: true,
      error: null,
      isPlaying: true,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          3D Music Visualizer
        </h1>

        <form onSubmit={handleSubmit} className="mb-8 max-w-xl mx-auto">
          <div className="flex flex-col gap-4">
            {visualizerState.error && (
              <div className="text-red-500 text-sm text-center">
                {visualizerState.error}
              </div>
            )}
            <div className="flex gap-4">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={visualizerState.isLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {visualizerState.isLoading ? "Loading..." : "Visualize"}
              </button>
            </div>
          </div>
        </form>

        {visualizerState.isPlaying && (
          <div className="w-full aspect-[16/9] rounded-lg overflow-hidden border border-gray-800">
            <Visualizer youtubeUrl={youtubeUrl} />
          </div>
        )}
      </div>
    </main>
  );
}
