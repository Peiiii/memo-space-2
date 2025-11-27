import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AmbientBackground } from './components/AmbientBackground';
import { MemoryOrb } from './components/MemoryOrb';
import { MemoryModal } from './components/MemoryModal';
import { Memory } from './types';
import { interpretMemory } from './services/geminiService';
import { PlusIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { motion, useSpring, useMotionValue } from 'framer-motion';

// Cast motion.div to any to avoid type errors with transformTemplate
const MotionDiv = motion.div as any;

// Helper: Fibonacci Sphere Distribution
// Distributes N points evenly on a sphere
const getFibonacciPos = (index: number, total: number) => {
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  
  return {
    theta: theta, 
    phi: phi 
  };
};

// Calculate the spherical coordinates that correspond to the "Front" of the view
// given the current world rotation.
const getFrontAndCenterPos = (rotXDeg: number, rotYDeg: number) => {
  // Convert to radians
  const rotX = rotXDeg * Math.PI / 180;
  const rotY = rotYDeg * Math.PI / 180;

  // We want to find the local point (x,y,z) on the sphere that ends up at 
  // View Space (0, 0, 1) (directly in front of camera) after the container's rotation.
  // Container applies: RotateY(rotY) -> RotateX(rotX).
  // To find the source point, we apply the inverse: RotateX(-rotX) -> RotateY(-rotY) to (0,0,1).

  // 1. Un-rotate X (rotate (0,0,1) by -rotX around X-axis)
  // y1 = sin(rotX)
  // z1 = cos(rotX)
  // x1 = 0
  
  // 2. Un-rotate Y (rotate (0, y1, z1) by -rotY around Y-axis)
  // x2 = z1 * sin(-rotY) = cos(rotX) * -sin(rotY)
  // y2 = y1 = sin(rotX)
  // z2 = z1 * cos(-rotY) = cos(rotX) * cos(rotY)

  const x = -Math.cos(rotX) * Math.sin(rotY);
  const y = Math.sin(rotX);
  const z = Math.cos(rotX) * Math.cos(rotY);

  // Convert Cartesian (x, y, z) to Spherical (phi, theta) based on MemoryOrb's coordinate system:
  // x = R * sin(phi) * cos(theta)
  // y = R * cos(phi)  <-- Note: our system uses Y as the polar axis component
  // z = R * sin(phi) * sin(theta)

  // Calculate Phi
  // y = cos(phi) => phi = acos(y)
  // Clamp value to avoid NaN due to float precision
  const clampedY = Math.max(-1, Math.min(1, y));
  const phi = Math.acos(clampedY);

  // Calculate Theta
  // z = sin(phi)sin(theta), x = sin(phi)cos(theta)
  // theta = atan2(z, x)
  const theta = Math.atan2(z, x);

  return { theta, phi };
};

const RAW_MEMORY_DATA = [
  {
    id: 'mem-sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
    description: "夕阳沉入地平线，带走了最后的喧嚣。",
    scale: 1.1,
    rotation: -5,
  },
  {
    id: 'mem-forest',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop',
    description: "深林的呼吸，是地球最古老的语言。",
    scale: 1,
    rotation: 5,
  },
  {
    id: 'mem-urban',
    url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=600&auto=format&fit=crop',
    description: "城市灯火阑珊，藏着万千心事。",
    scale: 1.15,
    rotation: -8,
  },
  {
    id: 'mem-coffee',
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop',
    description: "时光在咖啡香气中变得缓慢而醇厚。",
    scale: 0.9,
    rotation: 12,
  },
  {
    id: 'mem-sea',
    url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=600&auto=format&fit=crop',
    description: "海浪轻抚沙滩，抹去昨日的足迹。",
    scale: 1.2,
    rotation: 0,
  },
  {
    id: 'mem-stars',
    url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=600&auto=format&fit=crop',
    description: "在星尘的注视下，我们都是孩子。",
    scale: 1.05,
    rotation: -15,
  },
  {
    id: 'mem-book',
    url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop',
    description: "文字搭建的城堡，比现实更永恒。",
    scale: 0.95,
    rotation: 8,
  },
  {
    id: 'mem-cat',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop',
    description: "柔软的注视，治愈了坚硬的世界。",
    scale: 1.0,
    rotation: -4,
  },
  {
    id: 'mem-rain',
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=600&auto=format&fit=crop',
    description: "雨滴敲打窗棂，像一首未完的诗。",
    scale: 1.08,
    rotation: 6,
  },
  {
    id: 'mem-flower',
    url: 'https://images.unsplash.com/photo-1460039230329-eb070fc6c77c?q=80&w=600&auto=format&fit=crop',
    description: "花开一瞬，却留下了整个春天的记忆。",
    scale: 0.92,
    rotation: -10,
  },
  {
    id: 'mem-snow',
    url: 'https://images.unsplash.com/photo-1548266652-99cf27701ced?q=80&w=600&auto=format&fit=crop',
    description: "世界纯白如初，掩盖了所有的来路。",
    scale: 1.02,
    rotation: 3,
  },
  {
    id: 'mem-night',
    url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=600&auto=format&fit=crop',
    description: "夜色温柔，收容了所有流浪的梦。",
    scale: 0.98,
    rotation: -6,
  },
];

// Generate Initial Memories with Fibonacci Distribution
const DEFAULT_MEMORIES: Memory[] = RAW_MEMORY_DATA.map((data, index) => {
  const pos = getFibonacciPos(index, RAW_MEMORY_DATA.length);
  return {
    ...data,
    timestamp: Date.now(),
    theta: pos.theta,
    phi: pos.phi,
    driftSpeed: 0.8 + Math.random() * 0.4,
    isAnalyzing: false,
  };
});

const App: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>(DEFAULT_MEMORIES);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGravityMode, setIsGravityMode] = useState(false);
  
  // 3D Sphere Interaction State
  const containerRef = useRef<HTMLDivElement>(null);
  const [sphereRadius, setSphereRadius] = useState(350);
  
  // Physics-based rotation
  const rotationX = useMotionValue(0);
  const rotationY = useMotionValue(0);
  
  // Smooth springs for inertia
  const springConfig = { damping: 20, stiffness: 100, mass: 1 };
  const smoothRotateX = useSpring(rotationX, springConfig);
  const smoothRotateY = useSpring(rotationY, springConfig);

  // Responsive Radius
  useEffect(() => {
    const handleResize = () => {
      const r = Math.min(window.innerWidth, window.innerHeight) * 0.48;
      setSphereRadius(Math.max(350, r)); 
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Capture current rotation state once for this batch
    const currentRotX = rotationX.get();
    const currentRotY = rotationY.get();
    
    // Calculate the "center/front" position based on rotation
    const centerPos = getFrontAndCenterPos(currentRotX, currentRotY);

    const newMemories: Memory[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const id = uuidv4();
      const objectUrl = URL.createObjectURL(file);
      
      // Add a small random spread so multiple uploads don't overlap perfectly
      // Spread +/- 0.3 radians (~17 degrees)
      const spread = 0.3;
      const theta = centerPos.theta + (Math.random() - 0.5) * spread;
      let phi = centerPos.phi + (Math.random() - 0.5) * spread;
      
      // Clamp phi to avoid singularity issues at exact poles (0 or PI)
      phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

      const memory: Memory = {
        id,
        url: objectUrl,
        description: "正在唤醒记忆...",
        timestamp: Date.now(),
        theta: theta,
        phi: phi,
        scale: 0.9 + Math.random() * 0.3,
        rotation: Math.random() * 30 - 15,
        driftSpeed: 10 + Math.random() * 10,
        isAnalyzing: true,
      };

      newMemories.push(memory);

      fileToBase64(file).then(async (base64) => {
        const description = await interpretMemory(base64, file.type);
        setMemories(current => 
          current.map(m => m.id === id ? { ...m, description, isAnalyzing: false } : m)
        );
      });
    }

    setMemories(prev => [...prev, ...newMemories]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag Interaction Logic
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only trigger drag if we aren't clicking a button or interactable element
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
        return;
    }

    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    
    // Calculate delta
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    // Update rotation values
    const sensitivity = 0.3;
    
    // Drag Right (deltaX > 0) -> Surface moves Right -> rotateY increases (Direct Manipulation)
    rotationY.set(rotationY.get() + deltaX * sensitivity);
    // Drag Up (deltaY < 0) -> Surface moves Up -> rotateX increases (positive rotateX moves front up)
    rotationX.set(rotationX.get() - deltaY * sensitivity);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'grab';
    
    // Note: Global gravity snapping is intentionally removed.
    // The nebula's rotation remains where the user left it.
  };

  const toggleGravityMode = () => {
    setIsGravityMode(prev => !prev);
  };

  const handleMemoryUpdate = (id: string, newDescription: string) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, description: newDescription } : m));
  };

  const selectedMemory = memories.find(m => m.id === selectedMemoryId) || null;

  return (
    <div 
      className="relative w-full h-screen overflow-hidden text-slate-200 bg-[#0f172a] touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      ref={containerRef}
      style={{ cursor: 'grab' }}
    >
      <AmbientBackground />

      {/* 3D Scene Container */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ perspective: '1200px' }} 
      >
        {/* The Rotatable World */}
        <MotionDiv 
          className="relative preserve-3d pointer-events-auto"
          style={{ 
            rotateX: smoothRotateX, 
            rotateY: smoothRotateY,
            transformStyle: 'preserve-3d', 
            width: 0, 
            height: 0 
          }}
          // Enforce a specific rotation order: Rotate Y first, then Rotate X.
          // This allows children to perfectly inverse this order (Un-Rotate X, then Un-Rotate Y).
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
              onDoubleClick={(m) => setSelectedMemoryId(m.id)}
            />
          ))}
        </MotionDiv>
      </div>

      {/* Empty State Instructions */}
      {memories.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <h1 className="text-4xl md:text-6xl font-serif text-white/80 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-4 animate-pulse">
            记忆空间
          </h1>
          <p className="text-white/40 font-light tracking-wide text-lg max-w-md text-center">
            拖拽以旋转空间，或拨动单个记忆星球<br/>
            上传你的照片，让它们在此刻凝结成诗
          </p>
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          
          {/* Upload Button */}
          <button 
            className="flex flex-col items-center group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="bg-white/10 p-3 rounded-full group-hover:bg-white/20 transition-colors border border-white/5">
              <PlusIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-white/40 mt-1">上传</span>
          </button>
          
          <div className="w-px h-8 bg-white/10"></div>

          {/* Gravity Toggle */}
          <button 
            onClick={toggleGravityMode}
            className="flex flex-col items-center group"
          >
             <div className={`p-3 rounded-full transition-all duration-300 border ${isGravityMode ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/10 border-white/5 text-white/70 group-hover:bg-white/20'}`}>
                <ArrowsUpDownIcon className="w-6 h-6" />
             </div>
             <span className={`text-[10px] mt-1 transition-colors ${isGravityMode ? 'text-indigo-300' : 'text-white/40'}`}>
               {isGravityMode ? '重力' : '悬浮'}
             </span>
          </button>

          <div className="w-px h-8 bg-white/10"></div>

          {/* Status Text */}
          <div className="flex flex-col items-start min-w-[80px]">
             <span className="text-xs text-white/80 font-medium flex items-center gap-1">
                Memory Space
             </span>
             <span className="text-[10px] text-white/40">{memories.length} 个记忆片段</span>
          </div>
          
          {/* Hidden Input */}
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={handleFileUpload}
          />

        </div>
      </div>

      {/* Detail Modal */}
      <MemoryModal 
        memory={selectedMemory} 
        onClose={() => setSelectedMemoryId(null)} 
        onUpdateMemory={handleMemoryUpdate}
      />

      {/* Decorative Overlay Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-40"></div>
    </div>
  );
};

export default App;