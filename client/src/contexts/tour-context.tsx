import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  spotlightPadding?: number;
}

export interface Tour {
  id: string;
  name: string;
  steps: TourStep[];
}

interface TourState {
  activeTour: Tour | null;
  currentStepIndex: number;
  isRunning: boolean;
}

interface TourContextValue {
  state: TourState;
  startTour: (tour: Tour) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  skipTour: () => void;
  completedTours: string[];
  markTourComplete: (tourId: string) => void;
  resetTours: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const STORAGE_KEY = "mybizstream_completed_tours";

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>({
    activeTour: null,
    currentStepIndex: 0,
    isRunning: false,
  });

  const [completedTours, setCompletedTours] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedTours));
    } catch {
    }
  }, [completedTours]);

  const startTour = useCallback((tour: Tour) => {
    setState({
      activeTour: tour,
      currentStepIndex: 0,
      isRunning: true,
    });
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (!prev.activeTour) return prev;
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.activeTour.steps.length) {
        setCompletedTours((completed) => 
          completed.includes(prev.activeTour!.id) 
            ? completed 
            : [...completed, prev.activeTour!.id]
        );
        return { activeTour: null, currentStepIndex: 0, isRunning: false };
      }
      return { ...prev, currentStepIndex: nextIndex };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (!prev.activeTour || prev.currentStepIndex === 0) return prev;
      return { ...prev, currentStepIndex: prev.currentStepIndex - 1 };
    });
  }, []);

  const endTour = useCallback(() => {
    setState((prev) => {
      if (prev.activeTour) {
        setCompletedTours((completed) => 
          completed.includes(prev.activeTour!.id) 
            ? completed 
            : [...completed, prev.activeTour!.id]
        );
      }
      return { activeTour: null, currentStepIndex: 0, isRunning: false };
    });
  }, []);

  const skipTour = useCallback(() => {
    setState((prev) => {
      if (prev.activeTour) {
        setCompletedTours((completed) => 
          completed.includes(prev.activeTour!.id) 
            ? completed 
            : [...completed, prev.activeTour!.id]
        );
      }
      return { activeTour: null, currentStepIndex: 0, isRunning: false };
    });
  }, []);

  const markTourComplete = useCallback((tourId: string) => {
    setCompletedTours((completed) => 
      completed.includes(tourId) ? completed : [...completed, tourId]
    );
  }, []);

  const resetTours = useCallback(() => {
    setCompletedTours([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <TourContext.Provider
      value={{
        state,
        startTour,
        nextStep,
        prevStep,
        endTour,
        skipTour,
        completedTours,
        markTourComplete,
        resetTours,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
