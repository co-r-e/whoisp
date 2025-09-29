"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type HistoryLocale = "en" | "ja";

export type SessionHistoryItem = {
  id: string;
  title: string;
  path: string;
  locale: HistoryLocale;
  createdAt: number;
  updatedAt: number;
};

function orderByCreatedAtDescending(list: SessionHistoryItem[]) {
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

type HistoryContextValue = {
  items: SessionHistoryItem[];
  createSession: (locale: HistoryLocale) => SessionHistoryItem;
  ensureSession: (item: SessionHistoryItem) => SessionHistoryItem;
  renameSession: (id: string, title: string) => void;
  renameIfUntitled: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  touchSession: (id: string) => void;
  getDefaultTitle: (locale: HistoryLocale) => string;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

const STORAGE_KEY = "whoisp.sessionHistory.v1";

function readInitialItems(): SessionHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return orderByCreatedAtDescending(
      parsed.map((item) => ({
        ...item,
        createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
        updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
      })),
    );
  } catch {
    return [];
  }
}

function writeItems(items: SessionHistoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function getDefaultTitle(locale: HistoryLocale) {
  return locale === "ja" ? "無題の調査" : "Untitled research";
}

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const isHydratedRef = useRef(false);

  useEffect(() => {
    if (isHydratedRef.current) return;
    isHydratedRef.current = true;
    const initial = readInitialItems();
    if (initial.length === 0) return;
    setItems((prev) => {
      if (prev.length === 0) {
        return orderByCreatedAtDescending(initial);
      }
      const existingIds = new Set(prev.map((item) => item.id));
      const normalizedInitial = orderByCreatedAtDescending(initial);
      const newItems = normalizedInitial.filter((item) => !existingIds.has(item.id));
      if (newItems.length === 0) {
        return prev;
      }
      return [...newItems, ...prev];
    });
  }, []);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    writeItems(items);
  }, [items]);

  const createSession = useCallback((locale: HistoryLocale) => {
    const id = generateId();
    const path = locale === "ja" ? `/ja/investigations/${id}` : `/investigations/${id}`;
    const now = Date.now();
    const item: SessionHistoryItem = {
      id,
      title: getDefaultTitle(locale),
      path,
      locale,
      createdAt: now,
      updatedAt: now,
    };
    setItems((prev) => [item, ...prev]);
    return item;
  }, []);

  const ensureSession = useCallback((input: SessionHistoryItem) => {
    const normalized: SessionHistoryItem = {
      ...input,
      createdAt: input.createdAt ?? Date.now(),
      updatedAt: input.updatedAt ?? Date.now(),
      title: input.title?.trim().length ? input.title : getDefaultTitle(input.locale),
    };

    setItems((prev) => {
      const exists = prev.some((entry) => entry.id === normalized.id);
      if (exists) {
        return prev.map((entry) =>
          entry.id === normalized.id
            ? {
                ...entry,
                title: entry.title?.trim().length ? entry.title : normalized.title,
                path: normalized.path,
                locale: normalized.locale,
              }
            : entry,
        );
      }
      return [normalized, ...prev];
    });

    return normalized;
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const trimmed = title.trim();
        return {
          ...item,
          title: trimmed.length > 0 ? trimmed : getDefaultTitle(item.locale),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const renameIfUntitled = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed.length) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const defaultTitle = getDefaultTitle(item.locale);
        if (item.title && item.title !== defaultTitle) {
          return item;
        }
        return {
          ...item,
          title: trimmed,
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const deleteSession = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const touchSession = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              updatedAt: Date.now(),
            }
          : item,
      ),
    );
  }, []);

  const value = useMemo<HistoryContextValue>(
    () => ({
      items,
      createSession,
      ensureSession,
      renameSession,
      renameIfUntitled,
      deleteSession,
      touchSession,
      getDefaultTitle,
    }),
    [items, createSession, ensureSession, renameSession, renameIfUntitled, deleteSession, touchSession],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistoryContext() {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error("useHistoryContext must be used within a HistoryProvider");
  }
  return ctx;
}

export function useDefaultTitle(locale: HistoryLocale) {
  return useMemo(() => getDefaultTitle(locale), [locale]);
}
