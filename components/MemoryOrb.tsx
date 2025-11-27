import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Memory } from '../types';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

// Cast motion.div to any to avoid type errors with 'initial' prop in some environments
const MotionDiv = motion.div as any;

interface MemoryOrbProps {
  memory: Memory;
  radius: number;
  worldRotationX: any;
  worldRotationY: any;
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
    // Drag Right (deltaX > 0) -> Surface moves Right -> rotateY increases
    orbRotationY.set(orbRotationY.get() + deltaX * 0.6);
    // Drag Up (deltaY < 0) -> Surface moves Up -> rotateX increases (positive moves front up)
    orbRotationX.set(orbRotationX.get() - deltaY * 0.6);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);

    // If Gravity Mode is active, snap back to vertical balance when released
    if (isGravityMode) {
      orbRotationX.set(snapToBalance(orbRotationX.get()));
      orbRotationY.set(snapToBalance(orbRotationY.get()));
    }
  };

  // Calculate 3D Cartesian position from Spherical coordinates
  const x = radius * Math.sin(memory.phi) * Math.cos(memory.theta);
  const y = radius * Math.cos(memory.phi);
  const z = radius * Math.sin(memory.phi) * Math.sin(memory.theta);

  const inverseRotateX = useTransform(worldRotationX, (v: number) => -v);
  const inverseRotateY = useTransform(worldRotationY, (v: number) => -v);

  const driftX = useMemo(() => Math.random() * 20 - 10, []);
  const driftY = useMemo(() => Math.random() * 20 - 10, []);
  const duration = useMemo(() => 10 + Math.random() * 10, []);

  // Simplified Scaling Logic
  const BASE_SCALE = memory.scale;
  const HOVER_SCALE_MULTIPLIER = 2.2; 
  
  const targetScale = isHovered ? BASE_SCALE * HOVER_SCALE_MULTIPLIER : BASE_SCALE;

  return (
    <div
      className="absolute top-1/2 left-1/2 flex items-center justify-center"
      style={{
        transform: `translate3d(${x}px, ${y}px, ${z}px)`,
        zIndex: isHovered ? 10000 : Math.floor(z),
        transformStyle: 'preserve-3d',
        pointerEvents: 'auto'
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
          className="relative flex items-center justify-center group"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 1, 
            scale: targetScale,
            x: isHovered ? 0 : [0, driftX, -driftX, 0],
            y: isHovered ? 0 : [0, driftY, -driftY, 0],
            rotate: isHovered ? 0 : [memory.rotation - 2, memory.rotation + 2, memory.rotation - 2],
          }}
          transition={{
            opacity: { duration: 1 },
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
           {/* 
              Glass Orb Container 
              We separate the image from the 'glass skin' overlay to ensure the glass effects (reflection, rim light)
              sit visually ON TOP of the image, creating a true 3D marble look.
           */}
           <MotionDiv 
             className={`relative rounded-full cursor-grab active:cursor-grabbing ${isHovered ? 'filter-none' : 'opacity-90'}`}
             style={{
               width: '140px',
               height: '140px',
               rotateX: smoothOrbX,
               rotateY: smoothOrbY,
             }}
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onDoubleClick={(e: React.MouseEvent) => {
               e.stopPropagation();
               onDoubleClick(memory);
             }}
           >
              {/* 1. The Image Layer (Bottom) */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <img 
                  src={memory.url} 
                  alt="memory" 
                  className="w-full h-full object-cover scale-[1.05]" /* Slight scale to prevent pixel bleeding at edges */
                  draggable={false}
                />
              </div>

              {/* 2. Glass Skin Overlay (Top) - Handles Shadows, Reflections, and Rim Light */}
              <div 
                className="absolute inset-0 rounded-full z-20 pointer-events-none transition-all duration-500"
                style={{
                   // Glass Physics:
                   // 1. Inset Shadow (White): Simulates the thickness of the glass at the edges (Fresnel effect).
                   // 2. Drop Shadow (Colored/Black): Simulates ambient occlusion and glow.
                   // 3. Border: Very subtle 1px rim.
                   boxShadow: isHovered 
                     ? 'inset 0 0 20px rgba(255, 255, 255, 0.5), inset 0 0 5px rgba(255, 255, 255, 0.5), 0 0 50px rgba(100, 200, 255, 0.5)' 
                     : 'inset 0 0 12px rgba(255, 255, 255, 0.3), inset 0 0 2px rgba(255, 255, 255, 0.2), 0 10px 20px rgba(0,0,0,0.25)',
                   border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              >
                 {/* Specular Highlight (Top Reflection) */}
                 {/* A soft white gradient at the top simulating a light source reflection on a curved surface */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2/5 bg-gradient-to-b from-white/50 to-transparent rounded-t-full opacity-70 blur-[3px]"></div>
                 
                 {/* Bottom Secondary Refraction (Caustic-like) */}
                 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/2 h-1/4 bg-gradient-to-t from-white/30 to-transparent rounded-b-full opacity-40 blur-[5px]"></div>
              </div>
              
              {/* Loading / Analyzing Overlay */}
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
                <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                  <p className="text-white text-base font-serif italic leading-relaxed tracking-wider text-shadow-sm">
                    "{memory.description}"
                  </p>
                </div>
              </MotionDiv>
            )}
        </MotionDiv>
      </MotionDiv>
    </div>
  );
};