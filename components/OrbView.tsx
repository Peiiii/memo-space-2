import React, { useRef, useEffect } from 'react';
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
  const springConfig = { damping: 20, stiffness: 100, mass: 1 };
  const smoothRotateX = useSpring(rotationX, springConfig);
  const smoothRotateY = useSpring(rotationY, springConfig);

  // Sync rotation to store for other components (like upload placement)
  // We use useMotionValue change listeners to avoid re-rendering this component
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
    
    rotationY.set(rotationY.get() + deltaX * 0.3);
    rotationX.set(rotationX.get() - deltaY * 0.3);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
  };

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
        <MotionDiv 
            className="relative preserve-3d"
            style={{ 
                rotateX: smoothRotateX, 
                rotateY: smoothRotateY,
                transformStyle: 'preserve-3d', 
                width: 0, 
                height: 0 
            }}
            transformTemplate={({ rotateX, rotateY }: { rotateX: any, rotateY: any }) => {
                return `rotateY(${rotateY}) rotateX(${rotateX})`;
            }}
        >
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
  );
};
