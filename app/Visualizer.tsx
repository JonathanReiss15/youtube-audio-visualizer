import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

const PARTICLE_COUNT = 12000;
const AUDIO_SAMPLES = 128;
const SPIRAL_LOOPS = 20; // Number of spiral loops
const SPIRAL_RADIUS = 8; // Maximum radius of the spiral

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
  const cameraPositionRef = useRef<{ angle: number; height: number }>({
    angle: 0,
    height: 0,
  });
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

    // Initial camera position
    camera.position.set(0, 2, 0);
    camera.lookAt(5, 0, 5);

    // Set up particles in a spiral pattern
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = (i / PARTICLE_COUNT) * Math.PI * 2 * SPIRAL_LOOPS;
      const radius =
        (SPIRAL_RADIUS * (SPIRAL_LOOPS - t / (Math.PI * 2))) / SPIRAL_LOOPS;

      positions[i * 3] = Math.cos(t) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(t) * radius;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // YouTube player setup (same as before)
    const videoId = new URL(youtubeUrl).searchParams.get("v");
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

    // Audio data update function (similar to before)
    const updateAudioData = () => {
      if (!playerRef.current) return;

      try {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const isCurrentlyPlaying =
          playerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING;

        if (isCurrentlyPlaying) {
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

    // Modified visualization function for spiral effect
    const getVisualizationData = (
      radius: number,
      angle: number,
      time: number
    ): number => {
      const index = Math.floor(
        ((angle / (Math.PI * 2)) % 1) * (AUDIO_SAMPLES - 1)
      );
      const audio = audioDataRef.current[Math.abs(index)] || 0;

      return (
        audio * 2 * Math.sin(time * 0.5 + angle * 2) +
        Math.sin(radius * 2 + time) * 0.2
      );
    };

    const animate = () => {
      requestAnimationFrame(animate);
      timeRef.current += 0.016;

      const positions = geometry.attributes.position.array as Float32Array;
      const time = timeRef.current;

      // Update particle heights based on audio
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        const radius = Math.sqrt(x * x + z * z);
        const angle = Math.atan2(z, x);

        positions[i + 1] = getVisualizationData(radius, angle, time);
      }

      geometry.attributes.position.needsUpdate = true;

      // Calculate average audio activity for color
      const avgActivity =
        audioDataRef.current.reduce((a, b) => a + b, 0) /
        audioDataRef.current.length;

      // Update material color based on audio
      material.color.setHSL(
        0.5 + avgActivity * 0.2,
        0.8,
        0.4 + avgActivity * 0.4
      );

      // Update camera position for flying through effect
      const cameraSpeed = isPlaying ? 0.01 : 0;
      cameraPositionRef.current.angle += cameraSpeed;

      const radius = SPIRAL_RADIUS * 0.7;
      camera.position.x = Math.cos(cameraPositionRef.current.angle) * radius;
      camera.position.z = Math.sin(cameraPositionRef.current.angle) * radius;
      camera.position.y = 2 + Math.sin(time * 0.5) * 0.5;

      // Look ahead in the spiral
      const lookAtAngle = cameraPositionRef.current.angle + Math.PI * 0.25;
      const lookAtPoint = new THREE.Vector3(
        Math.cos(lookAtAngle) * radius,
        0,
        Math.sin(lookAtAngle) * radius
      );
      camera.lookAt(lookAtPoint);

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
