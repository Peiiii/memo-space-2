import { create } from 'zustand';

export type ViewMode = 'orb' | 'gallery' | 'world';

interface ViewState {
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  viewMode: 'orb',
  setViewMode: (viewMode) => set({ viewMode }),
}));
