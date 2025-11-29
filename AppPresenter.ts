import { MemoryManager } from './managers/MemoryManager';
import { ViewManager } from './managers/ViewManager';
import { OrbManager } from './managers/OrbManager';
import { GalleryManager } from './managers/GalleryManager';
import { WorldManager } from './managers/WorldManager';

export class AppPresenter {
  memoryManager: MemoryManager;
  viewManager: ViewManager;
  orbManager: OrbManager;
  galleryManager: GalleryManager;
  worldManager: WorldManager;

  constructor() {
    this.memoryManager = new MemoryManager();
    this.viewManager = new ViewManager();
    this.orbManager = new OrbManager();
    this.galleryManager = new GalleryManager();
    this.worldManager = new WorldManager();
  }
}
