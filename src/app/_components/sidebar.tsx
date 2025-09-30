"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type HistoryLocale,
  useHistoryContext,
} from "./history-context";
import { enStrings, jaStrings } from "./deep-research-strings";
import { useResearchRun } from "./research-run-context";

function linkClasses(isActive: boolean) {
  const base = "group flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors";
  const active = "bg-sidebar-accent text-sidebar-accent-foreground";
  const inactive = "text-sidebar-foreground/80 hover:border-sidebar-border hover:bg-sidebar-accent/60 hover:text-sidebar-foreground";
  return `${base} ${isActive ? active : inactive}`;
}

function getLocaleFromPath(pathname: string): HistoryLocale {
  return pathname.startsWith("/ja") ? "ja" : "en";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, createSession, deleteSession, renameSession, touchSession, getDefaultTitle } = useHistoryContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  const locale = getLocaleFromPath(pathname);
  const isJapanese = locale === "ja";
  const strings = isJapanese ? jaStrings : enStrings;
  const { status, isRunning, cancel, images, imagesStatus, isImagesLoading } = useResearchRun();

  const localeItems = useMemo(() => {
    return items.filter((item) => item.locale === locale);
  }, [items, locale]);

  const handleToggleLocale = useCallback(() => {
    const query = searchParams.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";

    let targetPath = pathname;
    if (isJapanese) {
      targetPath = pathname.replace(/^\/ja/, "");
      if (targetPath.length === 0) {
        targetPath = "/";
      }
    } else {
      targetPath = pathname === "/" ? "/ja" : `/ja${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
    }

    const url = `${targetPath}${query ? `?${query}` : ""}${hash}`;
    router.push(url);
    setIsSettingsOpen(false);
  }, [isJapanese, pathname, router, searchParams]);

  const handleQuerySubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = queryDraft.trim();
      if (!trimmed) return;

      const session = createSession(locale);
      setEditingId(null);
      setDraftTitle("");
      setIsSettingsOpen(false);
      setQueryDraft("");

      const params = new URLSearchParams();
      params.set("q", trimmed);
      router.push(`${session.path}?${params.toString()}`);
    },
    [createSession, locale, queryDraft, router],
  );

  function beginEdit(id: string, currentTitle: string) {
    setEditingId(id);
    setDraftTitle(currentTitle);
  }

  function commitEdit(id: string, targetLocale: HistoryLocale) {
    const trimmed = draftTitle.trim();
    renameSession(id, trimmed.length > 0 ? trimmed : getDefaultTitle(targetLocale));
    setEditingId(null);
    setDraftTitle("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftTitle("");
  }

  function handleDelete(id: string, path: string) {
    if (!window.confirm(isJapanese ? "この調査を削除しますか？" : "Delete this investigation?")) {
      return;
    }
    if (editingId === id) {
      cancelEdit();
    }
    deleteSession(id);
    if (pathname === path) {
      router.push(isJapanese ? "/ja" : "/");
    }
  }

  function handleNavigate(path: string, id: string) {
    touchSession(id);
    router.push(path);
    setIsSettingsOpen(false);
  }

  const isSubmitDisabled = queryDraft.trim().length === 0;
  const historyHeading = isJapanese ? "履歴" : "History";
  const emptyHistoryLabel = isJapanese ? "まだ調査はありません。" : "No investigations yet.";

  useEffect(() => {
    if (!isSettingsOpen) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        settingsButtonRef.current?.contains(target) ||
        settingsMenuRef.current?.contains(target)
      ) {
        return;
      }
      setIsSettingsOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("mousedown", handleClick);
    };
  }, [isSettingsOpen]);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-full flex-col">
        <div className="space-y-4 px-4 pb-5 pt-6">
          <Link href={isJapanese ? "/ja" : "/"} className="flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="WhoisP logo"
              width={160}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <form className="space-y-2" onSubmit={handleQuerySubmit}>
            <input
              id="sidebar-query"
              name="query"
              className="w-full rounded-md border border-sidebar-border bg-card px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              placeholder={strings.placeholder}
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              aria-label={strings.queryLabel}
            />
            <button
              type="submit"
              className="h-10 w-full rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitDisabled}
            >
              {strings.submit}
            </button>
            <div className="space-y-1">
              <p className="min-h-[1.25rem] text-xs text-sidebar-foreground/70">{status || strings.idleStatus}</p>
              {isRunning ? (
                <button
                  type="button"
                  onClick={() => cancel?.()}
                  className="h-9 w-full rounded-md border border-sidebar-border bg-sidebar px-3 text-xs font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent/40"
                >
                  {strings.stop}
                </button>
              ) : null}
            </div>
            <section className="space-y-1" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">
                {strings.imagesHeading}
              </p>
              {isImagesLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`image-skeleton-${index}`}
                      className="aspect-square rounded-md border border-sidebar-border/60 bg-sidebar-border/30 animate-pulse"
                    />
                  ))}
                </div>
              ) : images.length > 0 ? (
                <div className="max-h-48 overflow-y-auto pr-1">
                  <div className="grid grid-cols-3 gap-2">
                    {images.slice(0, 9).map((image) => {
                      const targetUrl = image.sourceUrl ?? image.url;
                      const label = image.sourceTitle ?? image.title ?? strings.imagesHeading;
                      return (
                        <a
                          key={`${image.url}-${image.thumbnailUrl ?? "full"}`}
                          href={targetUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="group relative block overflow-hidden rounded-md border border-sidebar-border bg-card transition hover:border-primary"
                        >
                          <Image
                            src={image.thumbnailUrl ?? image.url}
                            alt={image.title ?? strings.imagesHeading}
                            width={96}
                            height={96}
                            loading="lazy"
                            sizes="96px"
                            className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
                          />
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/70 px-1 py-0.5 text-[10px] text-white transition group-hover:translate-y-0">
                            {label}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-sidebar-foreground/60">
                  {imagesStatus === "empty" ? strings.imagesNotFound : strings.imagesEmpty}
                </p>
              )}
            </section>
          </form>
        </div>
        <div className="flex-1" />
        <div className="border-t border-sidebar-border px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">
            {historyHeading}
          </p>
          <nav className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {localeItems.length === 0 ? (
              <p className="text-sm text-sidebar-foreground/60">{emptyHistoryLabel}</p>
            ) : (
              localeItems.map((item) => {
                const isActive = pathname === item.path;
                const isEditing = editingId === item.id;
                return (
                  <div key={item.id} className={linkClasses(isActive)}>
                    {isEditing ? (
                      <form
                        className="flex w-full items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          commitEdit(item.id, item.locale);
                        }}
                      >
                        <input
                          className="flex-1 rounded-md border border-input bg-card px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          autoFocus
                          value={draftTitle}
                          onChange={(event) => setDraftTitle(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelEdit();
                            }
                          }}
                        />
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-xs font-medium text-sidebar-primary transition-colors hover:bg-sidebar-accent/60"
                        >
                          {isJapanese ? "保存" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/40"
                          onClick={cancelEdit}
                        >
                          {isJapanese ? "取消" : "Cancel"}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNavigate(item.path, item.id)}
                        className="flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                      </button>
                    )}
                    {!isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          onClick={() => beginEdit(item.id, item.title)}
                          aria-label={isJapanese ? "名称を編集" : "Rename"}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-destructive"
                          onClick={() => handleDelete(item.id, item.path)}
                          aria-label={isJapanese ? "削除" : "Delete"}
                        >
                          ×
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </nav>
        </div>
        <div className="relative border-t border-sidebar-border bg-sidebar px-4 py-4">
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            aria-haspopup="true"
            aria-expanded={isSettingsOpen}
          >
            <GearIcon className="h-4 w-4" aria-hidden="true" />
            <span>{isJapanese ? "設定" : "Settings"}</span>
          </button>
          {isSettingsOpen ? (
            <div
              ref={settingsMenuRef}
              className="absolute bottom-16 left-4 right-4 z-50 rounded-lg border border-sidebar-border bg-popover p-2 text-sm"
              role="menu"
            >
              <button
                type="button"
                onClick={handleToggleLocale}
                className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                role="menuitem"
                aria-label={isJapanese ? "英語モードに切り替える" : "Switch to Japanese"}
              >
                <GlobeIcon className="h-4 w-4" aria-hidden="true" />
                <span className="flex items-center gap-1">
                  <span className={!isJapanese ? "font-semibold" : "text-muted-foreground"}>EN</span>
                  <span className="text-muted-foreground">/</span>
                  <span className={isJapanese ? "font-semibold" : "text-muted-foreground"}>日本語</span>
                </span>
              </button>
              <Link
                href={isJapanese ? "/ja/terms#usage-notes" : "/terms#usage-notes"}
                className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                role="menuitem"
              >
                <DocumentIcon className="h-4 w-4" aria-hidden="true" />
                <span>{isJapanese ? "利用規約" : "Terms of Use"}</span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

type IconProps = {
  className?: string;
  "aria-hidden"?: boolean;
};

function GlobeIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a16 16 0 0 1 0 18" />
      <path d="M12 3a16 16 0 0 0 0 18" />
    </svg>
  );
}

function GearIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function DocumentIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v4h4" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}
