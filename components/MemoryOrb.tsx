import React, { useState, useMemo } from 'react';
import { Memory } from '../types';
import { motion, useTransform, MotionValue } from 'framer-motion';

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

  // 1. Calculate Static 3D Cartesian position from Spherical coordinates
  const x = radius * Math.sin(memory.phi) * Math.cos(memory.theta);
  const y = radius * Math.cos(memory.phi);
  const z = radius * Math.sin(memory.phi) * Math.sin(memory.theta);

  // 2. Real-time Depth Calculation
  // We compute the 'Projected Z' to determine if the orb is in front or back.
  // Must match the Nested Div structure in OrbView: Outer(Pitch) -> Inner(Yaw).
  // Math Order: PitchMatrix * (YawMatrix * Point).
  const projectedZ = useTransform(
    [worldRotationX, worldRotationY],
    ([rotX, rotY]) => {
      // Convert degrees to radians
      const rX = (rotX as number) * (Math.PI / 180);
      const rY = (rotY as number) * (Math.PI / 180);

      // Step 1: Apply Inner Rotation (Yaw/Y-axis) first
      // x' = x*cos(rY) + z*sin(rY)
      // z' = -x*sin(rY) + z*cos(rY)
      // y' = y
      const x_yaw = x * Math.cos(rY) + z * Math.sin(rY);
      const z_yaw = -x * Math.sin(rY) + z * Math.cos(rY);
      const y_yaw = y;

      // Step 2: Apply Outer Rotation (Pitch/X-axis) second
      // y'' = y'*cos(rX) - z'*sin(rX)
      // z'' = y'*sin(rX) + z'*cos(rX)
      const z_final = y_yaw * Math.sin(rX) + z_yaw * Math.cos(rX);

      return z_final;
    }
  );

  // 3. Map Depth to Visual Styles (Atmospheric Perspective)
  const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

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
    <MotionDiv
      className="absolute top-1/2 left-1/2 w-0 h-0 flex items-center justify-center"
      style={{
        transform: `translate3d(${x}px, ${y}px, ${z}px)`,
        zIndex: isHovered ? 10000 : dynamicZIndex, 
        transformStyle: 'preserve-3d',
        pointerEvents: dynamicPointerEvents
      }}
    >
      {/* Counter-Rotation Wrapper for Billboarding */}
      <MotionDiv
        style={{
          // Inverse of Pitch(Yaw) is InvYaw(InvPitch)
          // Since child transform is applied inside, the hierarchy is Outer -> Inner -> Child -> ChildBillboards
          // Total: RotX * RotY * BillY * BillX.
          // We want identity: RotX * RotY * BillY * BillX = I.
          // So BillY * BillX = RotY^-1 * RotX^-1.
          // So rotateY(-Y) rotateX(-X).
          rotateY: inverseRotateY, 
          rotateX: inverseRotateX, 
          transformStyle: 'preserve-3d'
        }}
        transformTemplate={({ rotateX, rotateY }: { rotateX: string, rotateY: string }) => {
          return `rotateY(${rotateY}) rotateX(${rotateX})`;
        }}
        className="relative"
      >
        <MotionDiv
          className="relative flex items-center justify-center group transition-colors duration-500"
          initial={{ scale: 0 }} 
          style={{
             opacity: isHovered ? 1 : dynamicOpacity, 
             filter: isHovered ? 'none' : dynamicFilter, 
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
            setIsHovered(false);
          }}
        >
           {/* Glass Orb Container */}
           <MotionDiv 
             className={`relative rounded-full`}
             style={{
               width: '140px',
               height: '140px',
               boxShadow: isHovered 
                 ? 'inset 0 0 20px rgba(255, 255, 255, 0.5), inset 0 0 5px rgba(255, 255, 255, 0.5), 0 0 50px rgba(100, 200, 255, 0.5)' 
                 : 'inset 0 0 12px rgba(255, 255, 255, 0.3), inset 0 0 2px rgba(255, 255, 255, 0.2), 0 10px 20px rgba(0,0,0,0.25)',
               border: '1px solid rgba(255, 255, 255, 0.15)'
             }}
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