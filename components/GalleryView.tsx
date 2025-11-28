import React, { useRef, useEffect } from 'react';
import { Memory } from '../types';
import { motion, useMotionValue, useSpring, useTransform, PanInfo } from 'framer-motion';

interface GalleryViewProps {
  memories: Memory[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onMemoryClick: (memory: Memory) => void;
}

const ITEM_SPACING = 280; // Pixels between items. Tuned for natural swipe distance.
const VISIBLE_RANGE = 3;  // Virtualization window

export const GalleryView: React.FC<GalleryViewProps> = ({ 
  memories, 
  activeIndex, 
  setActiveIndex,
  onMemoryClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // -- Continuous Index Motion Value --
  // This value represents the exact floating-point scroll position.
  // e.g. 1.5 means we are visually halfway between card 1 and card 2.
  const indexMV = useMotionValue(activeIndex);
  
  // Spring smoothes out the updates to indexMV, creating the fluid "physics" feel.
  const springIndex = useSpring(indexMV, { stiffness: 200, damping: 25, mass: 0.8 });

  // Sync external activeIndex changes (e.g. from keyboard or click) to our MotionValue
  useEffect(() => {
    indexMV.set(activeIndex);
  }, [activeIndex, indexMV]);

  // -- Gesture Logic --
  // We use a ref to track if a drag is effectively a "click" (no movement)
  const isDragging = useRef(false);

  const onPanStart = () => {
    isDragging.current = true;
  };

  const onPan = (e: any, info: PanInfo) => {
    // 1:1 Mapping: Dragging 1px on screen moves the content 1px.
    // Since y position is calculated as (index * spacing), a delta in pixels 
    // corresponds to delta/spacing in index units.
    // Dragging UP (negative Y) should increase index (move to next item).
    const deltaIndex = -info.offset.y / ITEM_SPACING;
    const rawTarget = activeIndex + deltaIndex;
    
    // Apply resistance (rubber-banding) at the start and end of the list
    let dampenedTarget = rawTarget;
    if (rawTarget < 0) {
      dampenedTarget = rawTarget * 0.3;
    } else if (rawTarget > memories.length - 1) {
      const max = memories.length - 1;
      dampenedTarget = max + (rawTarget - max) * 0.3;
    }

    indexMV.set(dampenedTarget);
  };

  const onPanEnd = (e: any, info: PanInfo) => {
    // We delay resetting isDragging slightly to prevent accidental clicks immediately after release
    setTimeout(() => { isDragging.current = false; }, 100);

    const velocity = -info.velocity.y; // Positive = flick up (Next)
    const offset = -info.offset.y;     // Positive = dragged up (Next)

    const SWIPE_THRESHOLD = ITEM_SPACING * 0.25; // Drag 25% of height to switch
    const VELOCITY_THRESHOLD = 300; // Fast flick threshold

    let targetIndex = activeIndex;

    // Logic to determine if we should switch card
    if (velocity > VELOCITY_THRESHOLD || offset > SWIPE_THRESHOLD) {
       targetIndex = activeIndex + 1;
    } else if (velocity < -VELOCITY_THRESHOLD || offset < -SWIPE_THRESHOLD) {
       targetIndex = activeIndex - 1;
    }

    // Clamp within bounds
    targetIndex = Math.max(0, Math.min(memories.length - 1, targetIndex));

    // Update the state. 
    // The useEffect above will catch this change and update indexMV.set(targetIndex).
    // The 'springIndex' will then automatically animate smoothly from the current floating position 
    // to the new integer target. This handles both "snap to next" and "snap back" seamlessly.
    setActiveIndex(targetIndex);
  };

  // -- Wheel Logic --
  const wheelAccumulator = useRef(0);
  const lastWheelTime = useRef(0);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastWheelTime.current > 200) wheelAccumulator.current = 0;
    lastWheelTime.current = now;

    wheelAccumulator.current += e.deltaY;
    
    // Threshold for wheel step
    const THRESHOLD = 60;
    if (Math.abs(wheelAccumulator.current) > THRESHOLD) {
        const direction = Math.sign(wheelAccumulator.current);
        const newIndex = Math.max(0, Math.min(memories.length - 1, activeIndex + direction));
        
        if (newIndex !== activeIndex) {
            setActiveIndex(newIndex);
            wheelAccumulator.current = 0;
        }
    }
  };

  // -- Scrollbar Logic --
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const handleScrollbarClick = (e: React.PointerEvent) => {
     if (!scrollbarRef.current) return;
     const rect = scrollbarRef.current.getBoundingClientRect();
     // Calculate percentage of click within the bar
     const pct = (e.clientY - rect.top) / rect.height;
     const idx = Math.round(pct * (memories.length - 1));
     setActiveIndex(Math.max(0, Math.min(memories.length - 1, idx)));
  };

  // Map springIndex to percentage for the scrollbar thumb
  const scrollbarTop = useTransform(springIndex, (v) => {
     if (memories.length <= 1) return '0%';
     const pct = Math.max(0, Math.min(1, v / (memories.length - 1)));
     return `${pct * 100}%`;
  });

  return (
    <motion.div 
      ref={containerRef}
      className="absolute inset-0 z-10 overflow-hidden touch-none select-none bg-slate-900/50 backdrop-blur-sm"
      onWheel={handleWheel}
      onPanStart={onPanStart}
      onPan={onPan}
      onPanEnd={onPanEnd}
      style={{ touchAction: 'none' }} // Critical for preventing browser native scroll
    >
      {/* 3D Stack Container */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none perspective-[1000px]">
         <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
            {memories.map((memory, i) => {
               // Virtualization: Only render items close to the current view
               if (Math.abs(i - activeIndex) > VISIBLE_RANGE) return null;

               return (
                 <GalleryItem 
                   key={memory.id}
                   memory={memory}
                   index={i}
                   globalIndex={springIndex}
                   isActive={i === activeIndex}
                   onClick={() => {
                       // Only trigger click if we weren't just dragging
                       if (!isDragging.current) {
                           if (i === activeIndex) onMemoryClick(memory);
                           else setActiveIndex(i);
                       }
                   }}
                 />
               );
            })}
         </div>
      </div>

      {/* Interactive Scrollbar */}
      <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-[60vh] flex items-center gap-6 z-50 pointer-events-auto">
         <div 
            ref={scrollbarRef}
            className="relative h-full w-8 flex justify-center cursor-pointer group"
            onPointerDown={handleScrollbarClick}
         >
            {/* Track */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/10 rounded-full group-hover:bg-white/20 transition-colors"></div>
            
            {/* Thumb */}
            <motion.div 
               className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
               style={{ top: scrollbarTop, marginTop: '-6px' }}
            >
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur px-2 py-1 rounded text-[10px] text-white whitespace-nowrap border border-white/10 pointer-events-none shadow-xl">
                    {activeIndex + 1} / {memories.length}
                </div>
            </motion.div>
         </div>
      </div>
      
      {/* Gesture Hint (Only on first item) */}
       {activeIndex === 0 && memories.length > 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest pointer-events-none animate-pulse"
        >
          上下滑动
        </motion.div>
      )}

    </motion.div>
  );
};

// -- Sub-Component for Individual Cards --
// Calculates its own position based on the global spring index
interface GalleryItemProps {
    memory: Memory;
    index: number;
    globalIndex: any; // MotionValue<number>
    isActive: boolean;
    onClick: () => void;
}

const GalleryItem: React.FC<GalleryItemProps> = ({ memory, index, globalIndex, isActive, onClick }) => {
    // Calculate relative offset: (My Index) - (Current Scroll Position)
    // 0 = Center/Active. Positive = Below. Negative = Above.
    const offset = useTransform(globalIndex, (current: number) => index - current);
    
    // Map offset to visual properties
    const y = useTransform(offset, (val) => val * ITEM_SPACING);
    const scale = useTransform(offset, (val) => 1 - Math.abs(val) * 0.1);
    const opacity = useTransform(offset, (val) => 1 - Math.abs(val) * 0.25);
    const z = useTransform(offset, (val) => -Math.abs(val) * 100);
    const rotateX = useTransform(offset, (val) => val * -5); // Subtle tilt
    const blurVal = useTransform(offset, (val) => `blur(${Math.abs(val) * 5}px) brightness(${1 - Math.abs(val) * 0.3})`);

    return (
        <motion.div
            className="absolute flex items-center justify-center w-full"
            style={{
                y,
                z,
                scale,
                opacity,
                rotateX,
                filter: blurVal,
                zIndex: useTransform(offset, (val) => 100 - Math.round(Math.abs(val))), // Integer Z-index
            }}
        >
            <div 
                className={`
                   relative flex items-center gap-6 md:gap-12 w-[85%] md:w-[750px] mx-auto 
                   transition-all duration-300 pointer-events-auto
                   ${isActive ? 'cursor-default' : 'cursor-pointer hover:opacity-90'}
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
            >
                 {/* Card Visuals */}
                 <div className="relative w-full md:w-1/2 aspect-[4/3] flex-shrink-0 shadow-2xl group">
                    <div className="absolute inset-0 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
                         <img 
                           src={memory.url} 
                           alt="memory" 
                           className="w-full h-full object-cover"
                           draggable={false}
                         />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 rounded-xl pointer-events-none"></div>
                    
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-indigo-200 uppercase tracking-widest border border-white/10 z-20">
                        {new Date(memory.timestamp).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                    </div>
                 </div>

                 {/* Text - Desktop */}
                 <div className="hidden md:block flex-1 text-left">
                     <h3 className="text-2xl font-serif text-white/90 leading-snug drop-shadow-md">
                        "{memory.description}"
                     </h3>
                     <div className="mt-4 h-px w-12 bg-white/20"></div>
                 </div>

                 {/* Text - Mobile Overlay */}
                  <div className={`absolute -bottom-16 left-0 right-0 md:hidden text-center z-30 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-lg mx-4">
                        <p className="text-sm font-serif text-white/90">{memory.description}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
