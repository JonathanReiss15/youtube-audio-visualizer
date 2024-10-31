import * as THREE from "three";

// src/types/visualizer.ts
export interface AudioData {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  averageFrequency: number;
}

export interface VisualizerProps {
  youtubeUrl: string;
}

export interface VisualizerState {
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
}

export interface ParticleSystem {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  mesh: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array;
}

export type VideoId = string | null;

export interface YouTubePlayerState {
  player: any; // YouTubePlayer type from youtube-player
  videoId: VideoId;
  isReady: boolean;
}
