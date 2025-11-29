import { useGalleryStore } from '../stores/galleryStore';
import { useMemoryStore } from '../stores/memoryStore';

export class GalleryManager {
  setActiveIndex = (index: number) => {
    const count = useMemoryStore.getState().memories.length;
    if (count === 0) return;
    const safeIndex = Math.max(0, Math.min(count - 1, index));
    useGalleryStore.getState().setActiveIndex(safeIndex);
  };

  navigateNext = () => {
    const { activeIndex } = useGalleryStore.getState();
    const { memories } = useMemoryStore.getState();
    if (memories.length === 0) return;
    
    // Gallery doesn't loop by default usually, but we can make it safe
    if (activeIndex < memories.length - 1) {
        this.setActiveIndex(activeIndex + 1);
    }
  };

  navigatePrev = () => {
    const { activeIndex } = useGalleryStore.getState();
    if (activeIndex > 0) {
        this.setActiveIndex(activeIndex - 1);
    }
  };
}
