import { create } from 'zustand';

interface GalleryState {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

export const useGalleryStore = create<GalleryState>((set) => ({
  activeIndex: 0,
  setActiveIndex: (activeIndex) => set({ activeIndex }),
}));
