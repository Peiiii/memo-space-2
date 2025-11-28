import React, { useRef, useEffect, useCallback } from 'react';
import { Memory } from '../types';
import { motion, AnimatePresence, PanInfo, useMotionValue, animate } from 'framer-motion';
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // -- Enhanced Wheel Logic --
  // We use an accumulator to handle different scroll device sensitivities (trackpad vs mouse)
  // and to allow fast scrolling to skip multiple items at once.
  const wheelAccumulator = useRef(0);
  const lastWheelTime = useRef(0);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    const dt = now - lastWheelTime.current;
    lastWheelTime.current = now;

    // Reset accumulator if paused for a moment (prevents accidental jumps after reading)
    if (dt > 150) wheelAccumulator.current = 0;

    wheelAccumulator.current += e.deltaY;

    // Threshold determines how much scroll distance triggers one "tick"
    const THRESHOLD = 50; 

    if (Math.abs(wheelAccumulator.current) >= THRESHOLD) {
       const steps = Math.floor(wheelAccumulator.current / THRESHOLD);
       
       if (steps !== 0) {
           const newIndex = Math.min(Math.max(activeIndex + steps, 0), memories.length - 1);
           
           if (newIndex !== activeIndex) {
              setActiveIndex(newIndex);
              // Subtract the consumed portion to keep the remainder for smooth continuous feel
              wheelAccumulator.current -= steps * THRESHOLD;
           }
       }
    }
  }, [activeIndex, memories.length, setActiveIndex]);

  // -- Keyboard Navigation --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') setActiveIndex(Math.max(0, activeIndex - 1));
      if (e.key === 'ArrowDown') setActiveIndex(Math.min(memories.length - 1, activeIndex + 1));
      if (e.key === 'Home') setActiveIndex(0);
      if (e.key === 'End') setActiveIndex(memories.length - 1);
      if (e.key === 'PageUp') setActiveIndex(Math.max(0, activeIndex - 5));
      if (e.key === 'PageDown') setActiveIndex(Math.min(memories.length - 1, activeIndex + 5));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, memories.length, setActiveIndex]);

  // -- Swipe / Drag Logic (TikTok Style) --
  const dragY = useMotionValue(0);

  const onPan = (event: any, info: PanInfo) => {
    // 1:1 Movement visual feedback
    dragY.set(info.offset.y);
  };

  const onPanEnd = (event: any, info: PanInfo) => {
     const SWIPE_THRESHOLD = 50;
     const VELOCITY_THRESHOLD = 300;
     
     const yOffset = info.offset.y;
     const yVelocity = info.velocity.y;

     let newIndex = activeIndex;

     // Swipe Up (dragY negative) -> Go Next (Content moves up)
     if (yOffset < -SWIPE_THRESHOLD || yVelocity < -VELOCITY_THRESHOLD) {
         newIndex = Math.min(memories.length - 1, activeIndex + 1);
     } 
     // Swipe Down (dragY positive) -> Go Prev (Content moves down)
     else if (yOffset > SWIPE_THRESHOLD || yVelocity > VELOCITY_THRESHOLD) {
         newIndex = Math.max(0, activeIndex - 1);
     }

     if (newIndex !== activeIndex) {
         setActiveIndex(newIndex);
     }

     // Smoothly spring back the drag offset to 0. 
     // The layout animation (driven by activeIndex change) will seamlessly take over the main positioning.
     animate(dragY, 0, { type: "spring", stiffness: 400, damping: 30 });
  };

  // -- Scrollbar Logic --
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const isDraggingScrollbar = useRef(false);

  const updateIndexFromScrollbar = (clientY: number) => {
      if (!scrollbarRef.current) return;
      const rect = scrollbarRef.current.getBoundingClientRect();
      // Calculate relative position (0 to 1) within the track
      const relativeY = clientY - rect.top;
      const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
      
      const newIndex = Math.round(percentage * (memories.length - 1));
      if (newIndex !== activeIndex) {
          setActiveIndex(newIndex);
      }
  };

  const handleScrollbarPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingScrollbar.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateIndexFromScrollbar(e.clientY);
  };

  const handleScrollbarPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingScrollbar.current) return;
    e.preventDefault();
    e.stopPropagation();
    updateIndexFromScrollbar(e.clientY);
  };

  const handleScrollbarPointerUp = (e: React.PointerEvent) => {
    isDraggingScrollbar.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Calculate visual progress (0 to 1)
  const progress = memories.length > 1 ? activeIndex / (memories.length - 1) : 0;
  
  return (
    <motion.div 
      ref={containerRef}
      className="absolute inset-0 z-10 overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onPan={onPan}
      onPanEnd={onPanEnd}
    >
      {/* 3D Scene */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Container that moves with the drag */}
        <motion.div 
            className="relative w-full max-w-5xl h-full flex items-center justify-center perspective-[1000px]"
            style={{ y: dragY }}
        >
          <AnimatePresence mode='popLayout'>
            {memories.map((memory, index) => {
              const offset = index - activeIndex;
              const absOffset = Math.abs(offset);
              
              // Performance Optimization: Only render items within view window
              if (absOffset > 4) return null;

              const isActive = offset === 0;
              
              return (
                <motion.div
                  key={memory.id}
                  layout
                  className="absolute flex items-center justify-center w-full pointer-events-none"
                  initial={{
                    y: offset * 300 + (offset > 0 ? 100 : -100),
                    opacity: 0,
                    scale: 0.8
                  }}
                  animate={{
                    y: offset * 220, // Tighter vertical stacking
                    z: -absOffset * 100, // Depth
                    scale: 1 - absOffset * 0.1,
                    opacity: 1 - absOffset * 0.2,
                    rotateX: offset * -5, // Subtle tilt
                    filter: `blur(${absOffset * 3}px) brightness(${1 - absOffset * 0.15})`
                  }}
                  exit={{
                    y: offset * 300 + (offset > 0 ? 100 : -100),
                    opacity: 0,
                    scale: 0.8
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 150,
                    damping: 25,
                    mass: 0.8
                  }}
                  style={{
                    zIndex: 100 - absOffset,
                  }}
                >
                  <div 
                    className={`
                      relative flex items-center gap-6 md:gap-12 w-[85%] md:w-[750px] mx-auto 
                      pointer-events-auto transition-all duration-300
                      ${isActive ? 'cursor-default' : 'cursor-pointer hover:opacity-90'}
                    `}
                    onClick={(e) => {
                        // We removed stopPropagation to ensure the parent gesture handler isn't blocked by weird event behavior,
                        // though onPan usually works regardless.
                        if (!isActive) setActiveIndex(index);
                        else onMemoryClick(memory);
                    }}
                  >
                     {/* Memory Card */}
                     <div className="relative group w-full md:w-1/2 aspect-[4/3] flex-shrink-0 shadow-2xl">
                        <div className="absolute inset-0 rounded-xl overflow-hidden bg-slate-900">
                             <img 
                               src={memory.url} 
                               alt="memory" 
                               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                               draggable={false}
                             />
                        </div>
                        
                        {/* Glass Overlay Effect */}
                        <div className={`absolute inset-0 rounded-xl border border-white/20 transition-all duration-500 ${isActive ? 'shadow-[0_0_30px_rgba(255,255,255,0.15)]' : ''} bg-gradient-to-tr from-white/10 to-transparent pointer-events-none`}></div>

                        {/* Date Badge */}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-indigo-200 uppercase tracking-widest border border-white/10 z-20">
                            {new Date(memory.timestamp).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                        </div>
                     </div>

                     {/* Text Section */}
                     <div className={`hidden md:block flex-1 text-left transition-all duration-500 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-8 blur-[2px]'}`}>
                         <h3 className="text-2xl font-serif text-white/90 leading-snug drop-shadow-md">
                            "{memory.description}"
                         </h3>
                         <div className="mt-4 h-px w-12 bg-white/20"></div>
                     </div>
                     
                     {/* Mobile Text Overlay */}
                      <div className={`absolute bottom-4 left-4 right-4 md:hidden text-center z-30 transition-all duration-500 pointer-events-none ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="bg-black/70 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-lg">
                            <p className="text-sm font-serif text-white/90">{memory.description}</p>
                        </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* -- Right Side Scroll Control -- */}
      <div className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 h-[60vh] flex items-center gap-6 z-50 pointer-events-auto">
         
         {/* Custom Vertical Scrollbar */}
         <div 
            ref={scrollbarRef}
            className="relative h-full w-6 flex justify-center cursor-pointer group"
            onPointerDown={handleScrollbarPointerDown}
            onPointerMove={handleScrollbarPointerMove}
            onPointerUp={handleScrollbarPointerUp}
            onPointerLeave={handleScrollbarPointerUp}
         >
            {/* Track Line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/5 rounded-full group-hover:bg-white/10 transition-colors"></div>
            
            {/* Draggable Thumb / Orb */}
            <motion.div 
               className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10"
               animate={{ top: `${progress * 100}%`, translateY: '-50%' }}
               transition={{ type: "spring", stiffness: 400, damping: 25 }} // Snappy follow
            >
                {/* Tooltip on Hover/Drag showing index */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/90 backdrop-blur px-2 py-1 rounded text-[10px] text-white whitespace-nowrap border border-white/10 pointer-events-none shadow-xl transform translate-x-[-5px]">
                    {activeIndex + 1} <span className="text-white/40">/</span> {memories.length}
                </div>
            </motion.div>
         </div>

         {/* Arrow Buttons */}
         <div className="flex flex-col gap-4">
            <button 
              onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-all disabled:opacity-0 disabled:cursor-not-allowed"
              disabled={activeIndex === 0}
              aria-label="Previous"
            >
               <ChevronUpIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveIndex(Math.min(memories.length - 1, activeIndex + 1))}
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-all disabled:opacity-0 disabled:cursor-not-allowed"
              disabled={activeIndex === memories.length - 1}
              aria-label="Next"
            >
               <ChevronDownIcon className="w-5 h-5" />
            </button>
         </div>
      </div>
    </motion.div>
  );
};