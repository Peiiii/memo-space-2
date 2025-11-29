import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline';
import { usePresenter } from '../hooks/usePresenter';
import { useMemoryStore } from '../stores/memoryStore';
import { useWorldStore } from '../stores/worldStore';

const MotionDiv = motion.div as any;
const MotionImg = motion.img as any;
const MotionP = motion.p as any;

export const WorldView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Stores
  const memories = useMemoryStore(s => s.memories);
  const activeIndex = useWorldStore(s => s.activeIndex);
  const isPlaying = useWorldStore(s => s.isPlaying);
  
  // Logic
  const { worldManager, memoryManager } = usePresenter();

  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => a.timestamp - b.timestamp);
  }, [memories]);

  const activeMemory = sortedMemories[activeIndex];

  // Mouse / Parallax State
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], ["5deg", "-5deg"]); 
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], ["-5deg", "5deg"]); 
  
  const bgMoveX = useTransform(smoothMouseX, [-0.5, 0.5], ['5%', '-5%']);
  const bgMoveY = useTransform(smoothMouseY, [-0.5, 0.5], ['5%', '-5%']);
  const textMoveX = useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]);
  const textMoveY = useTransform(smoothMouseY, [-0.5, 0.5], [-20, 20]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth) - 0.5;
    const y = (clientY / innerHeight) - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  // Manage auto-play lifecycle via component mount/unmount if needed, 
  // but logic is mostly in Manager. 
  // We just ensure the manager stops when component unmounts to prevent leaks.
  useEffect(() => {
    return () => {
        worldManager.cleanup();
        worldManager.setPlay(false); // Reset state on exit
    };
  }, [worldManager]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (memories.length === 0) return;
      if (e.key === 'ArrowRight') worldManager.navigateNext();
      if (e.key === 'ArrowLeft') worldManager.navigatePrev();
      if (e.key === ' ') {
         e.preventDefault();
         worldManager.togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [memories.length, worldManager]);

  if (!sortedMemories || sortedMemories.length === 0) return null;
  if (!activeMemory) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-20 flex items-center justify-center bg-[#050505] overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <AnimatePresence mode="popLayout">
        <MotionDiv
            key={`atmosphere-${activeMemory.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "linear" }}
            className="absolute inset-[-10%]"
            style={{ x: bgMoveX, y: bgMoveY }}
        >
            <div 
              className="absolute inset-0 bg-cover bg-center blur-[100px] opacity-40 scale-125 saturate-150 brightness-75 animate-pulse"
              style={{ 
                  backgroundImage: `url(${activeMemory.url})`,
                  animationDuration: '8s' 
              }}
            />
            <div 
              className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at center, transparent 0%, #050505 80%)' }}
            />
            
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay"
                 style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                 }}
            />
        </MotionDiv>
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-7xl h-full flex flex-col md:flex-row items-center justify-center p-6 md:p-20 perspective-[1500px]">
         
         <div className="relative w-full md:w-2/3 h-[50vh] md:h-[70vh] flex items-center justify-center">
            <AnimatePresence mode="wait">
                <MotionDiv
                    key={`card-${activeMemory.id}`}
                    initial={{ opacity: 0, scale: 0.9, z: -200, rotateY: 15 }}
                    animate={{ opacity: 1, scale: 1, z: 0, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 1.1, z: 100, filter: 'blur(20px)' }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} 
                    style={{ 
                        rotateX: rotateX, 
                        rotateY: rotateY,
                        transformStyle: 'preserve-3d'
                    }}
                    className="relative w-auto h-full max-h-full aspect-auto shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] cursor-pointer"
                    onClick={() => memoryManager.selectMemory(activeMemory.id)}
                >
                    <MotionImg 
                        src={activeMemory.url} 
                        className="w-full h-full object-contain rounded-sm shadow-2xl relative z-10"
                        style={{
                            border: '1px solid rgba(255,255,255,0.1)',
                            backgroundColor: 'rgba(0,0,0,0.5)'
                        }}
                        draggable={false}
                    />

                    <div className="absolute inset-0 z-20 rounded-sm bg-gradient-to-tr from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
                </MotionDiv>
            </AnimatePresence>
         </div>

         <div className="absolute md:relative bottom-12 md:bottom-auto w-full md:w-1/3 md:h-full flex flex-col justify-end md:justify-center items-center md:items-start md:pl-16 pointer-events-none">
            <AnimatePresence mode="wait">
                <MotionDiv
                    key={`text-${activeMemory.id}`}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    style={{ x: textMoveX, y: textMoveY }} 
                    className="text-center md:text-left relative z-30"
                >
                    <div className="overflow-hidden mb-2">
                        <MotionP 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="text-xs font-sans uppercase tracking-[0.4em] text-white/50 mb-4"
                        >
                           Memories No. {activeIndex + 1}
                        </MotionP>
                    </div>

                    <h2 className="text-2xl md:text-5xl font-serif text-white leading-tight drop-shadow-lg font-light tracking-wide mb-6">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                            {activeMemory.description}
                        </span>
                    </h2>

                    <div className="flex items-center justify-center md:justify-start gap-3 opacity-60">
                         <span className="h-px w-8 bg-white/50"></span>
                         <span className="text-xs font-mono text-white/80">
                             {new Date(activeMemory.timestamp).toLocaleDateString().replace(/\//g, '.')}
                         </span>
                    </div>
                </MotionDiv>
            </AnimatePresence>
         </div>

      </div>

      <div className="absolute bottom-8 left-8 z-50">
        <button 
          onClick={() => worldManager.togglePlay()}
          className="group flex items-center gap-3 text-white/40 hover:text-white transition-colors"
        >
          {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          <span className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isPlaying ? 'Pause Drift' : 'Auto Drift'}
          </span>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
        <MotionDiv 
            className="h-full bg-white/40"
            initial={{ width: 0 }}
            animate={{ width: `${((activeIndex + 1) / sortedMemories.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 50 }}
        />
      </div>

      <div 
        className="absolute inset-y-0 left-0 w-1/4 z-20 cursor-none md:cursor-w-resize group flex items-center justify-start pl-8"
        onClick={() => worldManager.navigatePrev()}
      >
        <div className="p-4 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-10 group-hover:translate-x-0">
             <ChevronLeftIcon className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <div 
        className="absolute inset-y-0 right-0 w-1/4 z-20 cursor-none md:cursor-e-resize group flex items-center justify-end pr-8"
        onClick={() => worldManager.navigateNext()}
      >
        <div className="p-4 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-10 group-hover:translate-x-0">
             <ChevronRightIcon className="w-6 h-6 text-white" />
        </div>
      </div>

    </div>
  );
};
