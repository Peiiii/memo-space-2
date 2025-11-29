import React, { useRef, useEffect, useMemo } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { MemoryOrb } from './MemoryOrb';
import { useMemoryStore } from '../stores/memoryStore';
import { useOrbStore } from '../stores/orbStore';
import { usePresenter } from '../hooks/usePresenter';

const MotionDiv = motion.div as any;

export const OrbView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Stores
  const memories = useMemoryStore(s => s.memories);
  const isGravityMode = useOrbStore(s => s.isGravityMode);
  const sphereRadius = useOrbStore(s => s.sphereRadius);
  
  // Presenter
  const { orbManager, memoryManager } = usePresenter();

  // Physics-based rotation
  const rotationX = useMotionValue(0);
  const rotationY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 120, mass: 1 }; // Slightly tighter spring for "solid object" feel
  const smoothRotateX = useSpring(rotationX, springConfig);
  const smoothRotateY = useSpring(rotationY, springConfig);

  // Sync rotation to store for other components
  useEffect(() => {
    const unsubscribeX = rotationX.on("change", (latest) => {
        orbManager.updateCameraRotation(latest, rotationY.get());
    });
    const unsubscribeY = rotationY.on("change", (latest) => {
        orbManager.updateCameraRotation(rotationX.get(), latest);
    });
    return () => {
        unsubscribeX();
        unsubscribeY();
    };
  }, [rotationX, rotationY, orbManager]);

  // Drag Interaction Logic
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
        return;
    }
    e.preventDefault(); 
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Physics: Spinning a physical ball.
    // Dragging RIGHT (Positive DeltaX) -> Should rotate Y axis positive (Spin Right).
    rotationY.set(rotationY.get() + deltaX * 0.3);
    
    // Dragging UP (Negative DeltaY) -> Surface should move UP.
    // Moving surface UP means rotating around X axis such that top goes back.
    // This corresponds to Subtracting the deltaY (since deltaY is negative, we add).
    const newRotX = rotationX.get() - deltaY * 0.3;
    rotationX.set(Math.max(-85, Math.min(85, newRotX)));
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  };

  // --- Visual Generation ---
  
  // Memoize sphere wireframe parts to avoid re-calculation on every render
  const wireframeParts = useMemo(() => {
      const parts = [];

      // 1. Longitudes (Meridians) - Vertical Circles
      // Step 30 degrees: 0, 30, 60, 90, 120, 150 (180 is same as 0 inverted)
      for (let deg = 0; deg < 180; deg += 30) {
          parts.push(
              <div 
                  key={`long-${deg}`}
                  className="absolute rounded-full border border-indigo-200/[0.08] pointer-events-none"
                  style={{
                      width: sphereRadius * 2,
                      height: sphereRadius * 2,
                      transform: `rotateY(${deg}deg)`,
                      boxShadow: "0 0 20px rgba(165, 180, 252, 0.02)"
                  }}
              />
          );
      }

      // 2. Latitudes (Parallels) - Horizontal Circles stacked vertically
      // From -75 to 75 degrees
      for (let lat = -75; lat <= 75; lat += 15) {
          // Skip the equator if we want a special one, or just render it
          // Calculate radius at this latitude: R * cos(lat)
          const rad = (lat * Math.PI) / 180;
          const r = sphereRadius * Math.cos(rad);
          const y = sphereRadius * Math.sin(rad);

          // Skip very small circles at poles
          if (r < 10) continue;

          parts.push(
              <div 
                  key={`lat-${lat}`}
                  className={`absolute rounded-full pointer-events-none ${lat === 0 ? 'border border-indigo-300/20' : 'border border-white/[0.05]'}`}
                  style={{
                      width: r * 2,
                      height: r * 2,
                      // Translate Y moves it up/down (negative Y is up in CSS usually, but here we center 0,0)
                      // Rotate X 90 makes it horizontal
                      transform: `translateY(${-y}px) rotateX(90deg)`,
                      boxShadow: lat === 0 ? "0 0 15px rgba(199, 210, 254, 0.1)" : undefined
                  }}
              />
          );
      }
      return parts;
  }, [sphereRadius]);

  return (
    <MotionDiv 
        key="orb-view"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-auto touch-none"
        style={{ perspective: '1200px', cursor: 'grab' }} 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
    >
        {/* 
            NESTED ROTATION STRUCTURE 
            Outer Div: Handles Pitch (X-Axis). 
        */}
        <MotionDiv 
            className="relative preserve-3d"
            style={{ 
                rotateX: smoothRotateX,
                transformStyle: 'preserve-3d', 
                width: 0, 
                height: 0 
            }}
        >
            {/* 
                Inner Div: Handles Yaw (Y-Axis).
            */}
            <MotionDiv
                className="relative preserve-3d"
                style={{
                    rotateY: smoothRotateY,
                    transformStyle: 'preserve-3d',
                    width: 0, 
                    height: 0 
                }}
            >
                {/* --- VISUAL SPHERE / NEBULA CORE --- */}
                {/* This visualizes the "object" being rotated */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 preserve-3d flex items-center justify-center pointer-events-none">
                    
                    {/* Inner Core Glow */}
                    <div 
                        className="absolute rounded-full bg-indigo-500/10 blur-[60px]"
                        style={{ width: sphereRadius, height: sphereRadius }}
                    />
                    
                    {/* Render the Grid */}
                    {wireframeParts}

                    {/* Outer Halo */}
                    <div 
                        className="absolute rounded-full border border-indigo-400/5"
                        style={{ 
                            width: sphereRadius * 2.1, 
                            height: sphereRadius * 2.1,
                            boxShadow: "inset 0 0 50px rgba(199, 210, 254, 0.05)"
                        }}
                    />

                </div>

                {/* --- MEMORY ORBS --- */}
                {memories.map((memory) => (
                    <MemoryOrb 
                        key={memory.id} 
                        memory={memory} 
                        radius={sphereRadius}
                        worldRotationX={smoothRotateX}
                        worldRotationY={smoothRotateY}
                        isGravityMode={isGravityMode}
                        onFocus={() => {}}
                        onDoubleClick={(m) => memoryManager.selectMemory(m.id)}
                    />
                ))}
            </MotionDiv>
        </MotionDiv>
    </MotionDiv>
  );
};
