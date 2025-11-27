import React, { useState, useRef, useEffect } from 'react';
import { Memory } from '../types';
import { expandMemory } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface MemoryModalProps {
  memory: Memory | null;
  onClose: () => void;
  onUpdateMemory: (id: string, newDescription: string) => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ memory, onClose, onUpdateMemory }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShyReady, setIsShyReady] = useState(false); // Controls when the "shy" behavior activates
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open & Manage "Shy Fish" Timer
  useEffect(() => {
    if (memory) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setInputText('');

      // The fish is brave for the first 4 seconds (always visible), 
      // then becomes shy (hides on hover).
      setIsShyReady(false);
      const timer = setTimeout(() => {
        setIsShyReady(true);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [memory]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !memory || isProcessing) return;

    setIsProcessing(true);

    try {
        const blob = await fetch(memory.url).then(r => r.blob());
        const reader = new FileReader();
        
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const addedText = await expandMemory(
                base64, 
                blob.type, 
                memory.description, 
                inputText
            );

            if (addedText) {
                const separator = /[\u4e00-\u9fa5]/.test(memory.description.slice(-1)) ? '' : ' ';
                const newDescription = `${memory.description}${separator}${addedText}`;
                onUpdateMemory(memory.id, newDescription);
                setInputText('');
            }
            setIsProcessing(false);
        };
        reader.readAsDataURL(blob);

    } catch (err) {
        console.error(err);
        setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {memory && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          
          {/* 
             Backdrop - Ultra transparent (20%) to allow the background stars/orbs to be clearly seen.
             Real glass lets the world through.
          */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-all duration-700"
          />

          {/* Main Crystal Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            className="relative w-full max-w-4xl h-[75vh] md:h-[550px] flex flex-col md:flex-row group"
            style={{
                // Realistic Transparent Glass Styling
                // Minimal tint, rely on border and reflection to define shape
                backgroundColor: 'rgba(255, 255, 255, 0.01)', 
                
                // Low blur = Clear Glass. High blur = Frosted Glass.
                // We want clear, so we use a low value.
                backdropFilter: 'blur(8px)', 
                WebkitBackdropFilter: 'blur(8px)',
                
                borderRadius: '24px',
                
                // Crisp, light borders to simulate glass edge
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: `
                  0 25px 50px -12px rgba(0, 0, 0, 0.5), 
                  inset 0 0 0 1px rgba(255, 255, 255, 0.05)
                `,
            }}
          >
             {/* --- Glass Physical Highlights --- */}
             
             {/* 1. Sharp Top Highlight (The primary light source reflection) */}
             <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-70" />

             {/* 2. Sheen Gradient (Simulating the glossy surface) */}
             <div className="absolute inset-0 rounded-[24px] pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-black/20 mix-blend-overlay" />

             {/* 3. Subtle Reflection Slash */}
             <div className="absolute -inset-[100%] top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/5 to-transparent rotate-45 pointer-events-none" />

             {/* 4. NEW: Moving Border Beam (Shy Fish Effect) */}
             {/* 
                Logic: 
                - Initially opacity-100 (visible).
                - When isShyReady is TRUE, 'group-hover:opacity-0' kicks in.
                - This ensures the fish is seen swimming when first opened, but hides when user interacts later.
             */}
             <div className={`absolute inset-[-1.5px] rounded-[24px] pointer-events-none z-10 transition-opacity duration-1000 ease-in-out opacity-100 ${isShyReady ? 'group-hover:opacity-0' : ''}`}>
               <div 
                 className="absolute inset-0 rounded-[24px] animate-border-beam"
                 style={{
                   // Gradient designed to look like a comet/fish: 
                   // It starts transparent, fades into a soft blue tail, then a white bright head at 100%.
                   background: 'conic-gradient(from var(--beam-angle) at 50% 50%, transparent 0%, transparent 50%, rgba(199, 210, 254, 0.1) 70%, rgba(199, 210, 254, 0.5) 90%, #ffffff 100%)',
                   mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                   WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                   maskComposite: 'exclude',
                   WebkitMaskComposite: 'xor',
                   padding: '1.5px', // Beam width
                 }}
               />
             </div>

             {/* Close Button */}
             <button 
                onClick={onClose}
                className="absolute top-5 right-5 z-50 group/close"
             >
                <div className="p-2 rounded-full bg-white/5 border border-white/10 text-white/70 group-hover/close:bg-white/20 group-hover/close:text-white transition-all shadow-sm backdrop-blur-md">
                  <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
                </div>
             </button>

             {/* LEFT: Image Section */}
             <div className="w-full md:w-5/12 h-1/3 md:h-full relative p-4">
                <div className="relative h-full w-full rounded-[16px] overflow-hidden shadow-2xl border border-white/10 bg-black/20">
                    <img 
                        src={memory.url} 
                        alt="Memory" 
                        className="w-full h-full object-cover opacity-95 transition-transform duration-[3000ms] ease-out hover:scale-105"
                    />
                </div>
             </div>

             {/* RIGHT: Content Section */}
             <div className="flex-1 p-6 md:p-8 flex flex-col relative z-30">
                
                {/* Header: Date */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-200/80 shadow-[0_0_8px_rgba(199,210,254,0.8)]" />
                    <span className="text-xs uppercase tracking-[0.25em] font-medium text-indigo-100/60 font-sans">
                        {new Date(memory.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
                    </span>
                </div>

                {/* Description Text */}
                <div className="flex-1 overflow-y-auto no-scrollbar relative mask-linear-fade pr-2">
                    <p className="text-white text-lg md:text-xl font-serif leading-[1.8] tracking-wider font-light drop-shadow-sm">
                        {memory.description}
                    </p>
                </div>

                {/* Footer: Input */}
                <div className="mt-8 pt-6 border-t border-white/10 relative w-full">
                    <form onSubmit={handleSubmit} className="relative group/input">
                        {/* Input Container: Slightly darker to be readable against transparent glass */}
                        <div className="relative flex items-center bg-black/20 border border-white/10 rounded-full px-4 py-3 backdrop-blur-md transition-all duration-300 focus-within:bg-black/40 focus-within:border-white/25 focus-within:ring-1 focus-within:ring-white/10">
                            <div className="pr-3">
                                <SparklesIcon className="w-4 h-4 text-indigo-300/80" />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="与这段记忆对话..."
                                disabled={isProcessing}
                                className="flex-1 bg-transparent border-none text-white/90 placeholder-white/30 text-sm focus:ring-0 focus:outline-none tracking-wide font-light"
                            />
                            <button 
                                type="submit"
                                disabled={!inputText.trim() || isProcessing}
                                className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-0 disabled:scale-90"
                            >
                                {isProcessing ? (
                                    <div className="w-4 h-4 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <PaperAirplaneIcon className="w-4 h-4 -rotate-45 ml-0.5 mt-0.5" />
                                )}
                            </button>
                        </div>
                    </form>
                </div>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};