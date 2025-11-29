import { create } from 'zustand';

interface OrbState {
  isGravityMode: boolean;
  sphereRadius: number;
  cameraRotation: { x: number; y: number };
  setIsGravityMode: (isGravityMode: boolean) => void;
  setSphereRadius: (sphereRadius: number) => void;
  setCameraRotation: (rotation: { x: number; y: number }) => void;
}

export const useOrbStore = create<OrbState>((set) => ({
  isGravityMode: false,
  sphereRadius: 350,
  cameraRotation: { x: 0, y: 0 },
  setIsGravityMode: (isGravityMode) => set({ isGravityMode }),
  setSphereRadius: (sphereRadius) => set({ sphereRadius }),
  setCameraRotation: (cameraRotation) => set({ cameraRotation }),
}));
