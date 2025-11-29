import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Memory } from '../types';
import { motion, useMotionValue, useTransform, useSpring, MotionValue } from 'framer-motion';

// Cast motion.div to any to avoid type errors with 'initial' prop in some environments
const MotionDiv = motion.div as any;

interface MemoryOrbProps {
  memory: Memory;
  radius: number;
  worldRotationX: MotionValue<number>;
  worldRotationY: MotionValue<number>;
  isGravityMode: boolean;
  onFocus: (memory: Memory) => void;
  onDoubleClick: (memory: Memory) => void;
}

export const MemoryOrb: React.FC<MemoryOrbProps> = ({ 
  memory, 
  radius, 
  worldRotationX, 
  worldRotationY,
  isGravityMode,
  onFocus,
  onDoubleClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Local rotation state for "Planet Spin"
  const orbRotationX = useMotionValue(0);
  const orbRotationY = useMotionValue(0);
  const springConfig = { damping: 20, stiffness: 120, mass: 0.5 };
  const smoothOrbX = useSpring(orbRotationX, springConfig);
  const smoothOrbY = useSpring(orbRotationY, springConfig);

  const isDraggingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Snap to nearest 360 degrees (vertical/upright equilibrium)
  const snapToBalance = (val: number) => {
    return Math.round(val / 360) * 360;
  };

  // Reset/Snap rotation when Gravity Mode is enabled
  useEffect(() => {
    if (isGravityMode) {
      orbRotationX.set(snapToBalance(orbRotationX.get()));
      orbRotationY.set(snapToBalance(orbRotationY.get()));
    }
  }, [isGravityMode, orbRotationX, orbRotationY]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    
    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    // Standard rotation mapping (Direct Manipulation)
    orbRotationY.set(orbRotationY.get() + deltaX * 0.6);
    orbRotationX.set(orbRotationX.get() - deltaY * 0.6);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);

    if (isGravityMode) {
      orbRotationX.set(snapToBalance(orbRotationX.get()));
      orbRotationY.set(snapToBalance(orbRotationY.get()));
    }
  };

  // 1. Calculate Static 3D Cartesian position from Spherical coordinates
  const x = radius * Math.sin(memory.phi) * Math.cos(memory.theta);
  const y = radius * Math.cos(memory.phi);
  const z = radius * Math.sin(memory.phi) * Math.sin(memory.theta);

  // 2. Real-time Depth Calculation
  // We compute the 'Projected Z' to determine if the orb is in front or back after world rotation.
  const projectedZ = useTransform(
    [worldRotationX, worldRotationY],
    ([rotX, rotY]) => {
      // Convert degrees to radians
      const rX = (rotX as number) * (Math.PI / 180);
      const rY = (rotY as number) * (Math.PI / 180);

      // Apply World Rotation Matrix logic (matching OrbView's rotation order: Y then X, or X then Y)
      // Note: OrbView applies CSS transform `rotateY(y) rotateX(x)`. 
      // This means we rotate around X first (local), then Y (global).
      
      // Step A: Rotate around X-axis
      // y' = y*cos(rX) - z*sin(rX)
      // z' = y*sin(rX) + z*cos(rX)
      const z_after_x = y * Math.sin(rX) + z * Math.cos(rX);
      const y_after_x = y * Math.cos(rX) - z * Math.sin(rX); // Not strictly needed for Z calc but good for completeness

      // Step B: Rotate around Y-axis
      // z_final = z'*cos(rY) - x*sin(rY)
      const z_final = z_after_x * Math.cos(rY) - x * Math.sin(rY);

      return z_final;
    }
  );

  // 3. Map Depth to Visual Styles (Atmospheric Perspective)
  const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

  // Dynamic Styles based on Projected Z
  // Z ranges roughly from -radius (Back) to +radius (Front)
  
  const dynamicOpacity = useTransform(projectedZ, (z) => {
     // Range clamped slightly to avoid flickering at exact poles
     const safeZ = Math.max(-radius, Math.min(radius, z)); 
     return mapRange(safeZ, -radius * 0.8, radius * 0.8, 0.4, 1);
  });

  const dynamicFilter = useTransform(projectedZ, (z) => {
     const safeZ = Math.max(-radius, Math.min(radius, z));
     // Blur: 4px at back, 0px at front
     const blur = Math.max(0, mapRange(safeZ, -radius, radius * 0.5, 4, 0));
     // Brightness: 0.7 at back (lighter shadow), 1.0 at front
     const brightness = Math.max(0.7, Math.min(1, mapRange(safeZ, -radius, radius * 0.5, 0.7, 1)));
     // Grayscale: 20% gray at back, 0% at front
     const gray = Math.max(0, Math.min(0.2, mapRange(safeZ, -radius, radius * 0.5, 0.2, 0)));
     
     return `blur(${blur}px) brightness(${brightness}) grayscale(${gray})`;
  });

  const dynamicZIndex = useTransform(projectedZ, (z) => Math.round(z + radius + 100));
  
  // Disable interaction if item is in the back hemisphere (z < 0)
  const dynamicPointerEvents = useTransform(projectedZ, (z) => {
      return z < 0 ? 'none' : 'auto';
  });

  const inverseRotateX = useTransform(worldRotationX, (v: number) => -v);
  const inverseRotateY = useTransform(worldRotationY, (v: number) => -v);

  const driftX = useMemo(() => Math.random() * 20 - 10, []);
  const driftY = useMemo(() => Math.random() * 20 - 10, []);
  const duration = useMemo(() => 10 + Math.random() * 10, []);

  // Simplified Scaling Logic
  const BASE_SCALE = memory.scale;
  const HOVER_SCALE_MULTIPLIER = 1.35; 
  
  const targetScale = isHovered ? BASE_SCALE * HOVER_SCALE_MULTIPLIER : BASE_SCALE;

  return (
    // w-0 h-0 is crucial here. It forces the center of this container to be the exact point of the translate3d coordinate.
    // The flexbox then centers the content around this 0x0 point.
    <MotionDiv
      className="absolute top-1/2 left-1/2 w-0 h-0 flex items-center justify-center"
      style={{
        transform: `translate3d(${x}px, ${y}px, ${z}px)`,
        // Use dynamic Z-Index for proper layering during rotation
        zIndex: isHovered ? 10000 : dynamicZIndex, 
        transformStyle: 'preserve-3d',
        pointerEvents: dynamicPointerEvents
      }}
    >
      {/* Counter-Rotation Wrapper for Billboarding */}
      <MotionDiv
        style={{
          rotateX: inverseRotateX,
          rotateY: inverseRotateY,
          transformStyle: 'preserve-3d'
        }}
        transformTemplate={({ rotateX, rotateY }: { rotateX: string, rotateY: string }) => {
          return `rotateX(${rotateX}) rotateY(${rotateY})`;
        }}
        className="relative"
      >
        <MotionDiv
          className="relative flex items-center justify-center group transition-colors duration-500"
          initial={{ opacity: 0, scale: 0 }}
          style={{
             opacity: isHovered ? 1 : dynamicOpacity, // Apply atmospheric fade
             filter: isHovered ? 'none' : dynamicFilter, // Apply blur/brightness
          }}
          animate={{ 
            scale: targetScale,
            x: isHovered ? 0 : [0, driftX, -driftX, 0],
            y: isHovered ? 0 : [0, driftY, -driftY, 0],
            rotate: isHovered ? 0 : [memory.rotation - 2, memory.rotation + 2, memory.rotation - 2],
          }}
          transition={{
            scale: { type: 'spring', stiffness: 300, damping: 25 },
            x: { duration: duration, repeat: Infinity, ease: "easeInOut" },
            y: { duration: duration * 1.3, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: duration * 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
          onMouseEnter={() => {
            setIsHovered(true);
            onFocus(memory);
          }}
          onMouseLeave={() => {
            if (!isDraggingRef.current) setIsHovered(false);
          }}
        >
           {/* Glass Orb Container */}
           <MotionDiv 
             className={`relative rounded-full cursor-grab active:cursor-grabbing`}
             style={{
               width: '140px',
               height: '140px',
               rotateX: smoothOrbX,
               rotateY: smoothOrbY,
               boxShadow: isHovered 
                 ? 'inset 0 0 20px rgba(255, 255, 255, 0.5), inset 0 0 5px rgba(255, 255, 255, 0.5), 0 0 50px rgba(100, 200, 255, 0.5)' 
                 : 'inset 0 0 12px rgba(255, 255, 255, 0.3), inset 0 0 2px rgba(255, 255, 255, 0.2), 0 10px 20px rgba(0,0,0,0.25)',
               border: '1px solid rgba(255, 255, 255, 0.15)'
             }}
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onDoubleClick={(e: React.MouseEvent) => {
               e.stopPropagation();
               onDoubleClick(memory);
             }}
           >
              {/* 1. The Image Layer */}
              <div className="absolute inset-0 rounded-full overflow-hidden bg-black">
                <img 
                  src={memory.url} 
                  alt="memory" 
                  className="w-full h-full object-cover scale-[1.05]"
                  draggable={false}
                />
              </div>

              {/* 2. Glass Skin Overlay */}
              <div 
                className="absolute inset-0 rounded-full z-20 pointer-events-none transition-all duration-500"
              >
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2/5 bg-gradient-to-b from-white/50 to-transparent rounded-t-full opacity-70 blur-[3px]"></div>
                 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/2 h-1/4 bg-gradient-to-t from-white/30 to-transparent rounded-b-full opacity-40 blur-[5px]"></div>
              </div>
              
              {/* Loading Overlay */}
              {memory.isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30 rounded-full">
                  <div className="w-8 h-8 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                </div>
              )}
            </MotionDiv>

            {/* Text Reveal */}
            {isHovered && !memory.isAnalyzing && (
              <MotionDiv 
                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1.0 / HOVER_SCALE_MULTIPLIER }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 text-center pointer-events-none z-[20000]"
              >
                <div className="bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                  <p className="text-white text-base font-serif italic leading-relaxed tracking-wider text-shadow-sm">
                    "{memory.description}"
                  </p>
                </div>
              </MotionDiv>
            )}
        </MotionDiv>
      </MotionDiv>
    </MotionDiv>
  );
};