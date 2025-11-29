import React, { useRef, useEffect } from 'react';
import { AmbientBackground } from './components/AmbientBackground';
import { MemoryModal } from './components/MemoryModal';
import { GalleryView } from './components/GalleryView';
import { WorldView } from './components/WorldView';
import { OrbView } from './components/OrbView';
import { PlusIcon, ArrowsUpDownIcon, ListBulletIcon, GlobeAmericasIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { usePresenter } from './hooks/usePresenter';
import { useMemoryStore } from './stores/memoryStore';
import { useViewStore } from './stores/viewStore';
import { useOrbStore } from './stores/orbStore';

const MotionDiv = motion.div as any;

const App: React.FC = () => {
  // Use Stores with atomic selectors to prevent unnecessary re-renders
  const memories = useMemoryStore(s => s.memories);
  const viewMode = useViewStore(s => s.viewMode);
  // Gravity Mode is now in OrbStore
  const isGravityMode = useOrbStore(s => s.isGravityMode);

  // Use Presenter
  const { memoryManager, viewManager, orbManager } = usePresenter();
  
  // Local Refs & UI State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Data
  useEffect(() => {
    memoryManager.loadInitialMemories();
  }, [memoryManager]);

  // Responsive Radius handled by OrbManager now
  useEffect(() => {
    const handleResize = () => {
      const r = Math.min(window.innerWidth, window.innerHeight) * 0.48;
      orbManager.setSphereRadius(Math.max(350, r)); 
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [orbManager]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Get current rotation from orb manager to position new memories in front
    const currentRotation = orbManager.getCameraRotation();
    await memoryManager.uploadFiles(files, currentRotation);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="relative w-full h-screen overflow-hidden text-slate-200 bg-[#0f172a] select-none">
      <AmbientBackground />

      <AnimatePresence>
        {viewMode === 'orb' && (
           <OrbView key="orb-view" />
        )}

        {viewMode === 'gallery' && (
           <MotionDiv
             key="gallery-view"
             initial={{ opacity: 0, y: 50 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 50 }}
             transition={{ duration: 0.4 }}
             className="absolute inset-0"
           >
             <GalleryView />
           </MotionDiv>
        )}

        {viewMode === 'world' && (
          <MotionDiv
            key="world-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-30"
          >
            <WorldView />
          </MotionDiv>
        )}
      </AnimatePresence>

      {memories.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
          <h1 className="text-4xl md:text-6xl font-serif text-white/80 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-4 animate-pulse">
            记忆空间
          </h1>
          <p className="text-white/40 font-light tracking-wide text-lg max-w-md text-center">
            上传你的照片，让它们在此刻凝结成诗
          </p>
        </div>
      )}

      {/* Control Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto max-w-[90vw]">
        <div className="flex items-center gap-2 sm:gap-4 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 py-3 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          
          <button 
            className="flex flex-col items-center group w-12 sm:w-14"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="bg-white/10 p-2 sm:p-3 rounded-full group-hover:bg-white/20 transition-colors border border-white/5">
              <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[10px] text-white/40 mt-1">上传</span>
          </button>
          
          <div className="w-px h-8 bg-white/10"></div>

          <div className="flex items-center bg-black/40 p-1 rounded-full border border-white/5 mx-2">
            
            <button 
              onClick={() => viewManager.setViewMode('orb')}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 relative group/orb ${viewMode === 'orb' ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
            >
              <GlobeAmericasIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/orb:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
                星云
              </div>
            </button>
            
            <button 
              onClick={() => viewManager.setViewMode('gallery')}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 relative group/gallery ${viewMode === 'gallery' ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
            >
              <ListBulletIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/gallery:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
                画廊
              </div>
            </button>

            <button 
              onClick={() => viewManager.setViewMode('world')}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 relative group/world ${viewMode === 'world' ? 'bg-indigo-500/40 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
            >
              <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6" />
               <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/world:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10">
                世界
              </div>
            </button>

          </div>

          <div className={`overflow-hidden transition-all duration-500 flex items-center ${viewMode === 'orb' ? 'w-auto max-w-[100px] opacity-100 scale-100' : 'max-w-0 opacity-0 scale-90'}`}>
             <div className="w-px h-8 bg-white/10 mx-2 sm:mx-4"></div>
             <button 
                onClick={() => orbManager.toggleGravityMode()}
                className="flex flex-col items-center group w-12 sm:w-14"
                disabled={viewMode !== 'orb'}
              >
                <div className={`p-2 sm:p-3 rounded-full transition-all duration-300 border ${isGravityMode ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/10 border-white/5 text-white/70 group-hover:bg-white/20'}`}>
                    <ArrowsUpDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`text-[10px] mt-1 transition-colors ${isGravityMode ? 'text-indigo-300' : 'text-white/40'}`}>
                  {isGravityMode ? '重力' : '悬浮'}
                </span>
             </button>
          </div>

          <div className="hidden md:flex items-center">
             <div className="w-px h-8 bg-white/10 mx-4"></div>
             <div className="flex flex-col items-start min-w-[80px]">
                <span className="text-xs text-white/80 font-medium flex items-center gap-1">
                    Memory Space
                </span>
                <span className="text-[10px] text-white/40">{memories.length} 个记忆片段</span>
             </div>
          </div>
          
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

      <MemoryModal />

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-40"></div>
    </div>
  );
};

export default App;