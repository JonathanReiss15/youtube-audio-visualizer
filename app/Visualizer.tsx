// src/components/Visualizer.tsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import YouTubePlayer from "youtube-player";
import { VisualizerProps } from "./types";

const PARTICLE_COUNT = 12000;
const VOLATILITY = 2.5;

export default function Visualizer({ youtubeUrl }: VisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<number>(0);
  const noiseRef = useRef<number[]>([]);

  // Initialize noise array for volatility
  useEffect(() => {
    noiseRef.current = Array(50)
      .fill(0)
      .map(() => Math.random() * 2 - 1);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

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

    // Set up YouTube player
    const videoId = new URL(youtubeUrl).searchParams.get("v");
    YouTubePlayer("youtube-player", {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
      },
    });

    const oscilloscopeWave = (x: number, z: number, time: number): number => {
      const noiseIndex =
        Math.floor(Math.abs(x * 2 + z * 2)) % noiseRef.current.length;
      const noise = noiseRef.current[noiseIndex];

      const tri = Math.asin(Math.sin(x * 0.5 + time * 2)) / (Math.PI / 2);
      const square = Math.sign(Math.sin(z * 0.3 + time * 1.5));
      const saw = ((x + time) % 2) - 1;

      return (
        tri * VOLATILITY * Math.abs(Math.sin(time * 0.5)) +
        square * 0.3 * Math.abs(Math.cos(time * 0.7)) +
        saw * 0.4 * Math.abs(Math.sin(time * 0.9)) +
        noise * 0.8 * Math.abs(Math.sin(time * 2))
      );
    };

    const updateNoise = () => {
      noiseRef.current = noiseRef.current.map(() => Math.random() * 2 - 1);
    };

    const animate = () => {
      requestAnimationFrame(animate);
      timeRef.current += 0.016;

      if (Math.random() < 0.1) {
        updateNoise();
      }

      const positions = geometry.attributes.position.array as Float32Array;
      const time = timeRef.current;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        positions[i + 1] = oscilloscopeWave(x, z, time);
      }

      geometry.attributes.position.needsUpdate = true;

      const colorPhase = Math.floor(time * 2) % 2;
      const brightness = 0.4 + Math.abs(Math.sin(time * 4)) * 0.2;
      material.color.setHSL(0.5 + colorPhase * 0.1, 0.8, brightness);

      particles.rotation.y = Math.sin(time * 0.5) * 0.2;

      renderer.render(scene, camera);
    };

    animate();

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
