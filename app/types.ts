export interface VisualizerProps {
  youtubeUrl: string;
}

export interface VisualizerState {
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
}
