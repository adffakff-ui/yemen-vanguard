import React, { useMemo } from 'react';
import { WarTheaterId } from '../types/game.ts';

interface GameCanvasProps {
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  theaterId: WarTheaterId;
  yaw: number;
  pitch: number;
}

/**
 * GameCanvas: Wraps the Three.js canvas and provides a multi-layered CSS background
 * with HD panoramic images and parallax depth effects.
 */
export const GameCanvas: React.FC<GameCanvasProps> = ({ canvasContainerRef, theaterId, yaw, pitch }) => {
  // Map theater to environment type
  const environment = useMemo(() => {
    if (theaterId === 'snow') return 'snow';
    if (theaterId === 'forest') return 'forest';
    return 'desert';
  }, [theaterId]);

  const bgUrl = `/assets/backgrounds/${environment}.jpg`;

  /**
   * Parallax Logic:
   * We shift the background image based on camera orientation.
   * yaw: horizontal rotation (radians)
   * pitch: vertical rotation (radians)
   */
  const parallaxStyle = useMemo(() => {
    // Normalize yaw to stay within a reasonable range for a flat pano image
    // In a 3D orbit, yaw goes 0 to 2PI.
    // We'll use a sine function or simple wrap to create a looping-ish effect for the parallax layer.
    const horizontalShift = ((yaw % (Math.PI * 2)) / Math.PI) * 120; // pixels
    const verticalShift = pitch * 40; // pixels

    return {
      transform: `translate(${horizontalShift}px, ${verticalShift}px) scale(1.15)`,
    };
  }, [yaw, pitch]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-950 select-none">
      {/* LAYER 1: SKY GRADIENT (Deep atmospheric color) */}
      <div 
        className={`absolute inset-0 transition-colors duration-1000 ${
          environment === 'desert' ? 'bg-gradient-to-b from-sky-500 via-sky-400 to-amber-200' :
          environment === 'snow' ? 'bg-gradient-to-b from-slate-400 via-blue-200 to-slate-100' :
          'bg-gradient-to-b from-emerald-950 via-green-900 to-green-700'
        }`}
      />

      {/* LAYER 2: HD PANORAMIC BACKGROUND WITH PARALLAX */}
      <div 
        className="absolute inset-0 w-[115%] h-[115%] -left-[7.5%] -top-[7.5%] transition-transform duration-100 ease-out will-change-transform pointer-events-none"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          ...parallaxStyle,
          opacity: environment === 'forest' ? 0.7 : 0.85,
          filter: 'contrast(1.05) saturate(1.1)',
        }}
      />

      {/* LAYER 3: ATMOSPHERIC HAZE / FOG OVERLAY */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          environment === 'desert' ? 'bg-orange-500/5 mix-blend-overlay' :
          environment === 'snow' ? 'bg-blue-100/10 mix-blend-screen' :
          'bg-green-900/15 mix-blend-multiply'
        }`}
      />

      {/* THREE.JS WEBGL CANVAS (Transparent) */}
      <div 
        ref={canvasContainerRef} 
        className="absolute inset-0 w-full h-full z-10"
      />
      
      {/* VIGNETTE & GRAIN LAYER */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.4)] z-20" />
    </div>
  );
};
