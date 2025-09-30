"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import type { DeepResearchImage } from "@/shared/deep-research-types";

type ResearchRunContextValue = {
  status: string;
  isRunning: boolean;
  cancel: (() => void) | null;
  setStatus: (value: string) => void;
  setRunningState: (running: boolean, cancel?: () => void) => void;
  images: DeepResearchImage[];
  setImages: Dispatch<SetStateAction<DeepResearchImage[]>>;
  imagesStatus: ImagesStatus;
  setImagesStatus: Dispatch<SetStateAction<ImagesStatus>>;
  isImagesLoading: boolean;
};

const ResearchRunContext = createContext<ResearchRunContextValue | null>(null);

export type ImagesStatus = "idle" | "loading" | "success" | "empty";

export function ResearchRunProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [images, setImages] = useState<DeepResearchImage[]>([]);
  const [imagesStatus, setImagesStatus] = useState<ImagesStatus>("idle");
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
      images,
      setImages,
      imagesStatus,
      setImagesStatus,
      isImagesLoading: imagesStatus === "loading",
    }),
    [status, isRunning, cancel, images, imagesStatus, setRunningState, setStatus, setImages, setImagesStatus],
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
