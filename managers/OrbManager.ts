import { useOrbStore } from '../stores/orbStore';

export class OrbManager {
  toggleGravityMode = () => {
    const current = useOrbStore.getState().isGravityMode;
    useOrbStore.getState().setIsGravityMode(!current);
  };

  setSphereRadius = (radius: number) => {
    useOrbStore.getState().setSphereRadius(radius);
  };

  updateCameraRotation = (x: number, y: number) => {
    useOrbStore.getState().setCameraRotation({ x, y });
  };

  getCameraRotation = () => {
    return useOrbStore.getState().cameraRotation;
  };
}
