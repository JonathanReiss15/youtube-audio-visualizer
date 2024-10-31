import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

const PARTICLE_COUNT = 12000;
const AUDIO_SAMPLES = 128;

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface VisualizerProps {
  youtubeUrl: string;
}

export default function Visualizer({ youtubeUrl }: VisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<number>(0);
  const playerRef = useRef<any>(null);
  const audioDataRef = useRef<number[]>(new Array(AUDIO_SAMPLES).fill(0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set up Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 12;
    camera.position.y = 3;
    camera.lookAt(0, 0, 0);

    // Set up particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    const gridSize = Math.sqrt(PARTICLE_COUNT);
    const spacing = 16 / gridSize;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = ((i % gridSize) - gridSize / 2) * spacing;
      const z = (Math.floor(i / gridSize) - gridSize / 2) * spacing;

      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = z;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Set up YouTube player with additional event listeners
    const videoId = new URL(youtubeUrl).searchParams.get("v");

    // Load YouTube IFrame API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("youtube-player", {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsLoaded(true);
            updateAudioData();
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    };

    // Function to simulate audio data from video timestamp
    const updateAudioData = () => {
      if (!playerRef.current) return;

      try {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const isCurrentlyPlaying =
          playerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING;

        if (isCurrentlyPlaying) {
          // Generate pseudo-audio data based on current timestamp
          for (let i = 0; i < AUDIO_SAMPLES; i++) {
            const frequency = i / AUDIO_SAMPLES;
            const amplitude = Math.sin(currentTime * (frequency + 1) * 5);
            const volume = playerRef.current.getVolume() / 100;

            audioDataRef.current[i] =
              (Math.sin(currentTime * 2 + i * 0.1) * 0.5 + 0.5) *
              Math.abs(amplitude) *
              volume;
          }
        }
      } catch (e) {
        console.warn("Error updating audio data:", e);
      }

      setTimeout(updateAudioData, 16);
    };

    const getVisualizationData = (
      x: number,
      z: number,
      time: number
    ): number => {
      const xIndex = Math.floor(((x + 8) / 16) * (AUDIO_SAMPLES - 1));
      const zIndex = Math.floor(((z + 8) / 16) * (AUDIO_SAMPLES - 1));

      const xAudio = audioDataRef.current[Math.abs(xIndex)] || 0;
      const zAudio = audioDataRef.current[Math.abs(zIndex)] || 0;

      return (
        (xAudio * 3 + zAudio * 3) * Math.sin(time * 0.5 + x * 0.2 + z * 0.2) +
        (xAudio + zAudio) * 4
      );
    };

    const animate = () => {
      requestAnimationFrame(animate);
      timeRef.current += 0.016;

      const positions = geometry.attributes.position.array as Float32Array;
      const time = timeRef.current;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        positions[i + 1] = getVisualizationData(x, z, time);
      }

      geometry.attributes.position.needsUpdate = true;

      const avgActivity =
        audioDataRef.current.reduce((a, b) => a + b, 0) /
        audioDataRef.current.length;

      material.color.setHSL(
        0.5 + avgActivity * 0.2,
        0.8,
        0.4 + avgActivity * 0.4
      );

      particles.rotation.y = Math.sin(time * 0.5) * 0.2;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [youtubeUrl]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleRestart = () => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0);
    if (!isPlaying) {
      playerRef.current.playVideo();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div id="youtube-player" className="hidden" />

      {/* Controls Overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePlayPause}
          disabled={!isLoaded}
          className="bg-black/50 hover:bg-black/70 border-white/20"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRestart}
          disabled={!isLoaded}
          className="bg-black/50 hover:bg-black/70 border-white/20"
        >
          <RotateCcw className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  );
}
