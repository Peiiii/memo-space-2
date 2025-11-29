import { useViewStore, ViewMode } from '../stores/viewStore';

export class ViewManager {
  setViewMode = (mode: ViewMode) => {
    useViewStore.getState().setViewMode(mode);
  };
}
