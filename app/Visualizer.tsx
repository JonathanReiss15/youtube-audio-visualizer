// src/components/Visualizer.tsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import YouTubePlayer from "youtube-player";
import {
  AudioData,
  ParticleSystem,
  VisualizerProps,
  YouTubePlayerState,
} from "./types";

const PARTICLE_COUNT = 10000; // Increased for more detailed waves
const WAVE_SPEED = 0.5;

export default function Visualizer({ youtubeUrl }: VisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const timeRef = useRef<number>(0);
  const [playerState, setPlayerState] = useState<YouTubePlayerState>({
    player: null,
    videoId: null,
    isReady: false,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
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

    // Position camera
    camera.position.z = 15;
    camera.position.y = 2;
    camera.lookAt(0, 0, 0);

    // Create particles in a wave pattern
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);

    // Organize particles in a grid
    const gridSize = Math.sqrt(PARTICLE_COUNT);
    const spacing = 20 / gridSize;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = ((i % gridSize) - gridSize / 2) * spacing;
      const z = (Math.floor(i / gridSize) - gridSize / 2) * spacing;

      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = z;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Create shimmering material
    const material = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.8,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Set up YouTube player
    const videoId = new URL(youtubeUrl).searchParams.get("v");
    const player = YouTubePlayer("youtube-player", {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
      },
    });

    setPlayerState({ player, videoId, isReady: false });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      timeRef.current += 0.016;

      // Update particle positions for wave effect
      const positions = geometry.attributes.position.array as Float32Array;
      const time = timeRef.current;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];

        // Create multiple overlapping waves
        const distance = Math.sqrt(x * x + z * z);
        const wave1 = Math.sin(distance * 0.3 - time * WAVE_SPEED) * 0.5;
        const wave2 = Math.cos(distance * 0.2 + time * WAVE_SPEED * 0.8) * 0.3;
        const wave3 = Math.sin(x * 0.2 + time * WAVE_SPEED * 0.6) * 0.2;
        const wave4 = Math.cos(z * 0.15 - time * WAVE_SPEED * 0.4) * 0.2;

        positions[i + 1] = wave1 + wave2 + wave3 + wave4;
      }

      geometry.attributes.position.needsUpdate = true;

      // Rotate the entire particle system slowly
      particles.rotation.y = time * 0.1;

      // Animate colors
      const hue = (Math.sin(time * 0.1) + 1) * 0.5;
      material.color.setHSL(hue, 0.8, 0.5);

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [youtubeUrl]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div id="youtube-player" className="hidden" />
    </div>
  );
}
