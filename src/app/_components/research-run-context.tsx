"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ResearchRunContextValue = {
  status: string;
  isRunning: boolean;
  cancel: (() => void) | null;
  setStatus: (value: string) => void;
  setRunningState: (running: boolean, cancel?: () => void) => void;
};

const ResearchRunContext = createContext<ResearchRunContextValue | null>(null);

export function ResearchRunProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const setRunningState = useCallback((running: boolean, cancel?: () => void) => {
    setIsRunning(running);
    cancelRef.current = cancel ?? null;
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current?.();
  }, []);

  const value = useMemo<ResearchRunContextValue>(
    () => ({
      status,
      isRunning,
      cancel: cancelRef.current ? cancel : null,
      setStatus,
      setRunningState,
    }),
    [status, isRunning, cancel, setRunningState, setStatus],
  );

  return <ResearchRunContext.Provider value={value}>{children}</ResearchRunContext.Provider>;
}

export function useResearchRun() {
  const ctx = useContext(ResearchRunContext);
  if (!ctx) {
    throw new Error("useResearchRun must be used within a ResearchRunProvider");
  }
  return ctx;
}
