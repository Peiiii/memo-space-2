import React, { useRef, useEffect, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePresenter } from '../hooks/usePresenter';
import { useMemoryStore } from '../stores/memoryStore';
import { useGalleryStore } from '../stores/galleryStore';
import { Memory } from '../types';

const MotionDiv = motion.div as any;

const ITEM_SPACING = 280; 
const VISIBLE_RANGE = 3; 

export const GalleryView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Stores
  const memories = useMemoryStore(s => s.memories);
  const activeIndex = useGalleryStore(s => s.activeIndex);
  
  // Logic
  const { galleryManager, memoryManager } = usePresenter();
  
  // Sort for gallery (Ascending timestamp)
  const sortedMemories = useMemo(() => {
    return [...memories].sort((a, b) => a.timestamp - b.timestamp);
  }, [memories]);

  const indexMV = useMotionValue(activeIndex);
  const springIndex = useSpring(indexMV, { stiffness: 200, damping: 25, mass: 0.8 });

  useEffect(() => {
    indexMV.set(activeIndex);
  }, [activeIndex, indexMV]);

  const isDragging = useRef(false);

  const onPanStart = () => {
    isDragging.current = true;
  };

  const onPan = (e: any, info: any) => {
    const deltaIndex = -info.offset.y / ITEM_SPACING;
    const rawTarget = activeIndex + deltaIndex;
    let dampenedTarget = rawTarget;
    if (rawTarget < 0) {
      dampenedTarget = rawTarget * 0.3;
    } else if (rawTarget > sortedMemories.length - 1) {
      const max = sortedMemories.length - 1;
      dampenedTarget = max + (rawTarget - max) * 0.3;
    }
    indexMV.set(dampenedTarget);
  };

  const onPanEnd = (e: any, info: any) => {
    setTimeout(() => { isDragging.current = false; }, 100);
    const velocity = -info.velocity.y; 
    const offset = -info.offset.y;
    const SWIPE_THRESHOLD = ITEM_SPACING * 0.25; 
    const VELOCITY_THRESHOLD = 300; 

    let targetIndex = activeIndex;
    if (velocity > VELOCITY_THRESHOLD || offset > SWIPE_THRESHOLD) {
       targetIndex = activeIndex + 1;
    } else if (velocity < -VELOCITY_THRESHOLD || offset < -SWIPE_THRESHOLD) {
       targetIndex = activeIndex - 1;
    }
    galleryManager.setActiveIndex(targetIndex);
  };

  const wheelAccumulator = useRef(0);
  const lastWheelTime = useRef(0);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastWheelTime.current > 200) wheelAccumulator.current = 0;
    lastWheelTime.current = now;
    wheelAccumulator.current += e.deltaY;
    
    const THRESHOLD = 60;
    if (Math.abs(wheelAccumulator.current) > THRESHOLD) {
        const direction = Math.sign(wheelAccumulator.current);
        const newIndex = Math.max(0, Math.min(sortedMemories.length - 1, activeIndex + direction));
        if (newIndex !== activeIndex) {
            galleryManager.setActiveIndex(newIndex);
            wheelAccumulator.current = 0;
        }
    }
  };

  const scrollbarRef = useRef<HTMLDivElement>(null);
  const handleScrollbarClick = (e: React.PointerEvent) => {
     if (!scrollbarRef.current) return;
     const rect = scrollbarRef.current.getBoundingClientRect();
     const pct = (e.clientY - rect.top) / rect.height;
     const idx = Math.round(pct * (sortedMemories.length - 1));
     galleryManager.setActiveIndex(idx);
  };

  const scrollbarTop = useTransform(springIndex, (v: any) => {
     if (sortedMemories.length <= 1) return '0%';
     const val = typeof v === 'number' ? v : 0;
     const pct = Math.max(0, Math.min(1, val / (sortedMemories.length - 1)));
     return `${pct * 100}%`;
  });

  return (
    <MotionDiv 
      ref={containerRef}
      className="absolute inset-0 z-10 overflow-hidden touch-none select-none bg-slate-900/50 backdrop-blur-sm"
      onWheel={handleWheel}
      onPanStart={onPanStart}
      onPan={onPan}
      onPanEnd={onPanEnd}
      style={{ touchAction: 'none' }} 
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none perspective-[1000px]">
         <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
            {sortedMemories.map((memory, i) => {
               if (Math.abs(i - activeIndex) > VISIBLE_RANGE) return null;
               return (
                 <GalleryItem 
                   key={memory.id}
                   memory={memory}
                   index={i}
                   globalIndex={springIndex}
                   isActive={i === activeIndex}
                   onClick={() => {
                       if (!isDragging.current) {
                           if (i === activeIndex) memoryManager.selectMemory(memory.id);
                           else galleryManager.setActiveIndex(i);
                       }
                   }}
                 />
               );
            })}
         </div>
      </div>

      <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-[60vh] flex items-center gap-6 z-50 pointer-events-auto">
         <div 
            ref={scrollbarRef}
            className="relative h-full w-8 flex justify-center cursor-pointer group"
            onPointerDown={handleScrollbarClick}
         >
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/10 rounded-full group-hover:bg-white/20 transition-colors"></div>
            <MotionDiv 
               className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"
               style={{ top: scrollbarTop, marginTop: '-6px' }}
            >
                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur px-2 py-1 rounded text-[10px] text-white whitespace-nowrap border border-white/10 pointer-events-none shadow-xl">
                    {activeIndex + 1} / {sortedMemories.length}
                </div>
            </MotionDiv>
         </div>
      </div>
      
       {activeIndex === 0 && sortedMemories.length > 1 && (
        <MotionDiv 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/30 text-xs tracking-widest pointer-events-none animate-pulse"
        >
          上下滑动
        </MotionDiv>
      )}

    </MotionDiv>
  );
};

interface GalleryItemProps {
    memory: Memory;
    index: number;
    globalIndex: any; 
    isActive: boolean;
    onClick: () => void;
}

const GalleryItem: React.FC<GalleryItemProps> = ({ memory, index, globalIndex, isActive, onClick }) => {
    const offset = useTransform(globalIndex, (current: number) => index - current);
    
    const y = useTransform(offset, (val: number) => val * ITEM_SPACING);
    const scale = useTransform(offset, (val: number) => 1 - Math.abs(val) * 0.1);
    const opacity = useTransform(offset, (val: number) => 1 - Math.abs(val) * 0.25);
    const z = useTransform(offset, (val: number) => -Math.abs(val) * 100);
    const rotateX = useTransform(offset, (val: number) => val * -5); 
    const blurVal = useTransform(offset, (val: number) => `blur(${Math.abs(val) * 5}px) brightness(${1 - Math.abs(val) * 0.3})`);

    return (
        <MotionDiv
            className="absolute flex items-center justify-center w-full"
            style={{
                y, z, scale, opacity, rotateX, filter: blurVal,
                zIndex: useTransform(offset, (val: number) => 100 - Math.round(Math.abs(val))),
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

                 <div className="hidden md:block flex-1 text-left">
                     <h3 className="text-2xl font-serif text-white/90 leading-snug drop-shadow-md">
                        "{memory.description}"
                     </h3>
                     <div className="mt-4 h-px w-12 bg-white/20"></div>
                 </div>

                  <div className={`absolute -bottom-16 left-0 right-0 md:hidden text-center z-30 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-lg mx-4">
                        <p className="text-sm font-serif text-white/90">{memory.description}</p>
                    </div>
                </div>
            </div>
        </MotionDiv>
    );
};
