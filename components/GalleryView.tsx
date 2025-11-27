import React, { useRef, useEffect } from 'react';
import { Memory } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface GalleryViewProps {
  memories: Memory[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onMemoryClick: (memory: Memory) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ 
  memories, 
  activeIndex, 
  setActiveIndex,
  onMemoryClick
}) => {
  // Handle wheel scroll for navigation
  const lastScrollTime = useRef(0);
  
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    // Debounce scroll to prevent rapid jumping
    if (now - lastScrollTime.current > 50) {
      if (e.deltaY > 20) {
        handleNext();
        lastScrollTime.current = now;
      } else if (e.deltaY < -20) {
        handlePrev();
        lastScrollTime.current = now;
      }
    }
  };

  const handlePrev = () => {
    setActiveIndex(Math.max(0, activeIndex - 1));
  };

  const handleNext = () => {
    setActiveIndex(Math.min(memories.length - 1, activeIndex + 1));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handlePrev();
      if (e.key === 'ArrowDown') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, memories.length]);

  return (
    <div 
      className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
      onWheel={handleWheel}
    >
      {/* 3D Scene Container */}
      <div className="relative w-full h-full perspective-[1000px] flex items-center justify-center">
        <div className="relative w-full max-w-5xl h-full flex items-center justify-center transform-style-3d">
          <AnimatePresence>
            {memories.map((memory, index) => {
              // Calculate relative position to active index
              const offset = index - activeIndex;
              const absOffset = Math.abs(offset);
              
              // Only render visible items to improve performance
              if (absOffset > 5) return null;

              // 3D Layout Logic
              // y: Vertical spacing
              // z: Depth (receding into background)
              // rotateX: Slight tilt for visual interest
              const isActive = offset === 0;
              
              return (
                <motion.div
                  key={memory.id}
                  layout
                  className="absolute flex items-center justify-center w-full transform-style-3d pointer-events-none"
                  initial={false}
                  animate={{
                    y: offset * 260, // Distance between cards
                    z: -absOffset * 300, // Recede into background
                    rotateX: offset * -10, // Slight tilt
                    scale: 1 - absOffset * 0.15,
                    opacity: 1 - absOffset * 0.25,
                    filter: `blur(${absOffset * 4}px)`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                    mass: 1
                  }}
                  style={{
                    zIndex: 100 - absOffset, // Ensure closer items are on top
                  }}
                >
                  {/* Card Container - Clickable */}
                  <div 
                    className={`
                      relative flex items-center gap-6 md:gap-12 w-[90%] md:w-[800px] mx-auto 
                      pointer-events-auto transition-all duration-300
                      ${isActive ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}
                    `}
                    onClick={() => {
                        if (!isActive) setActiveIndex(index);
                        else onMemoryClick(memory);
                    }}
                  >
                    {/* 
                       Glass Image Card 
                       Using the same "No Black Edge" + "Glass Overlay" technique as the Orbs,
                       but adapted for rounded rectangles.
                    */}
                    <div className="relative group w-full md:w-1/2 aspect-[4/3] flex-shrink-0">
                      
                      {/* 1. Image Layer */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-transparent shadow-2xl">
                         <img 
                           src={memory.url} 
                           alt="memory" 
                           className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                         />
                      </div>

                      {/* 2. Glass Skin Overlay */}
                      <div 
                        className="absolute inset-0 rounded-2xl z-20 pointer-events-none transition-all duration-500"
                        style={{
                           // Glassy inset shadows + soft outer glow. No dark background to prevent black edges.
                           boxShadow: isActive 
                             ? 'inset 0 0 20px rgba(255, 255, 255, 0.4), inset 0 0 2px rgba(255, 255, 255, 0.3), 0 20px 40px rgba(0,0,0,0.4)' 
                             : 'inset 0 0 10px rgba(255, 255, 255, 0.2), 0 10px 20px rgba(0,0,0,0.3)',
                           border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}
                      >
                         {/* Shine effects */}
                         <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/10 to-transparent opacity-50 skew-x-12 mix-blend-overlay"></div>
                      </div>

                      {/* Date Tag (Floating on edge) */}
                      <div className="absolute -top-3 -left-3 md:-top-4 md:-left-4 bg-slate-900/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full shadow-lg z-30">
                        <span className="text-[10px] md:text-xs font-mono text-indigo-200 tracking-widest uppercase">
                             {new Date(memory.timestamp).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Text Section (Right side) */}
                    <div className={`flex-1 hidden md:block text-left transition-all duration-500 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                       <div className="h-px w-12 bg-indigo-400/50 mb-4 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                       <h3 className="text-xl md:text-2xl font-serif text-white leading-relaxed tracking-wide text-shadow-sm">
                         "{memory.description}"
                       </h3>
                       <div className="mt-4 flex items-center gap-2">
                           <span className="text-[10px] text-white/40 font-light tracking-wider">
                              {new Date(memory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                       </div>
                    </div>

                    {/* Mobile Text (Overlay) */}
                    <div className={`absolute bottom-4 left-4 right-4 md:hidden text-center z-30 transition-all duration-500 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="bg-slate-900/70 backdrop-blur-md rounded-xl p-3 border border-white/10">
                            <p className="text-sm font-serif text-white">{memory.description}</p>
                        </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation Controls (Right Side) */}
      <div className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
         <button 
           onClick={handlePrev}
           disabled={activeIndex === 0}
           className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all backdrop-blur-sm group"
         >
           <ChevronUpIcon className="w-6 h-6 group-hover:-translate-y-0.5 transition-transform" />
         </button>
         
         <div className="flex flex-col items-center gap-2 py-2">
            {memories.map((_, idx) => {
               // Show minimal indicators, fade out distant ones
               if (Math.abs(idx - activeIndex) > 5) return null;
               return (
                   <div 
                     key={idx}
                     onClick={() => setActiveIndex(idx)}
                     className={`w-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === activeIndex ? 'h-6 bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]' : 'h-1.5 bg-white/20 hover:bg-white/40'}`}
                   />
               );
            })}
         </div>

         <button 
           onClick={handleNext}
           disabled={activeIndex === memories.length - 1}
           className="p-3 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all backdrop-blur-sm group"
         >
           <ChevronDownIcon className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
         </button>
      </div>
    </div>
  );
};
