import { useWorldStore } from '../stores/worldStore';
import { useMemoryStore } from '../stores/memoryStore';

export class WorldManager {
  private autoPlayInterval: any = null;

  setActiveIndex = (index: number) => {
    const count = useMemoryStore.getState().memories.length;
    if (count === 0) return;
    const safeIndex = (index + count) % count; // Loop navigation for World view
    useWorldStore.getState().setActiveIndex(safeIndex);
  };

  navigateNext = () => {
    const { activeIndex } = useWorldStore.getState();
    this.setActiveIndex(activeIndex + 1);
  };

  navigatePrev = () => {
    const { activeIndex } = useWorldStore.getState();
    this.setActiveIndex(activeIndex - 1);
  };

  togglePlay = () => {
    const isPlaying = useWorldStore.getState().isPlaying;
    this.setPlay(!isPlaying);
  };

  setPlay = (playing: boolean) => {
    useWorldStore.getState().setIsPlaying(playing);
    
    if (playing) {
      this.startAutoPlay();
    } else {
      this.stopAutoPlay();
    }
  };

  private startAutoPlay = () => {
    this.stopAutoPlay(); // Ensure no duplicate intervals
    this.autoPlayInterval = setInterval(() => {
      this.navigateNext();
    }, 5000);
  };

  private stopAutoPlay = () => {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  };

  // Cleanup method to be called when component unmounts if needed
  cleanup = () => {
    this.stopAutoPlay();
  };
}
