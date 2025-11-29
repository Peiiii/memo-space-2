import React, { createContext, useContext, useRef } from 'react';
import { AppPresenter } from '../AppPresenter';

const PresenterContext = createContext<AppPresenter | null>(null);

export const PresenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use a ref to ensure the presenter is a singleton per provider lifecycle
  // Initialize with null and instantiate lazily to ensure it happens only once
  const presenterRef = useRef<AppPresenter | null>(null);

  if (presenterRef.current === null) {
    presenterRef.current = new AppPresenter();
  }

  return (
    <PresenterContext.Provider value={presenterRef.current}>
      {children}
    </PresenterContext.Provider>
  );
};

export const usePresenter = () => {
  const context = useContext(PresenterContext);
  if (!context) {
    throw new Error("usePresenter must be used within a PresenterProvider");
  }
  return context;
};