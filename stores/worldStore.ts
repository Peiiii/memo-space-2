import { create } from 'zustand';

interface WorldState {
  activeIndex: number;
  isPlaying: boolean;
  setActiveIndex: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  activeIndex: 0,
  isPlaying: false,
  setActiveIndex: (activeIndex) => set({ activeIndex }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
}));
