import { create } from 'zustand';
import { Memory } from '../types';

interface MemoryState {
  memories: Memory[];
  selectedMemoryId: string | null;
  isProcessing: boolean;
  setMemories: (memories: Memory[]) => void;
  updateMemory: (id: string, updates: Partial<Memory>) => void;
  addMemories: (memories: Memory[]) => void;
  setSelectedMemoryId: (id: string | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
}

export const useMemoryStore = create<MemoryState>((set) => ({
  memories: [],
  selectedMemoryId: null,
  isProcessing: false,
  setMemories: (memories) => set({ memories }),
  updateMemory: (id, updates) => set((state) => ({
    memories: state.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  })),
  addMemories: (newMemories) => set((state) => ({
    memories: [...state.memories, ...newMemories]
  })),
  setSelectedMemoryId: (selectedMemoryId) => set({ selectedMemoryId }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
}));