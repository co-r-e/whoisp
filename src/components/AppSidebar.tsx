"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleHelp, Cog, ExternalLink, History, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export const AppSidebar: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("");
  const [apiStatus, setApiStatus] = React.useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const lang = pathname?.startsWith("/ja") ? "ja" : "en";
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  type Project = { id: string; name: string; createdAt: number };
  const [projects, setProjects] = React.useState<Project[]>([]);

  // Load projects from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("whoisp_projects");
      if (raw) setProjects(JSON.parse(raw));
    } catch {}
  }, []);

  // Listen for external updates to projects (e.g., title sync from forms)
  React.useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("whoisp_projects");
        if (raw) setProjects(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("whoisp_projects_updated", handler);
    return () => window.removeEventListener("whoisp_projects_updated", handler);
  }, []);

  const persist = (list: Project[]) => {
    setProjects(list);
    try {
      localStorage.setItem("whoisp_projects", JSON.stringify(list));
      // notify others
      window.dispatchEvent(new Event("whoisp_projects_updated"));
    } catch {}
  };

  const genId = () =>
    Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);

  const handleNewSearch = () => {
    const id = genId();
    const name = lang === "ja" ? "無題のプロジェクト" : "Untitled Project";
    const next: Project = { id, name, createdAt: Date.now() };
    const list = [next, ...projects].slice(0, 100);
    persist(list);
    router.push(lang === "ja" ? `/ja/projects/${id}` : `/projects/${id}`);
  };

  React.useEffect(() => {
    const syncFromStorage = () => {
      try {
        const stored = localStorage.getItem("whoisp_api_key");
        setApiKey(stored ?? "");
      } catch {
        setApiKey("");
      }
    };

    syncFromStorage();

    const handler = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        setApiKey(event.detail);
      } else {
        syncFromStorage();
      }
    };

    window.addEventListener("whoisp_api_key_updated", handler as EventListener);
    return () => window.removeEventListener("whoisp_api_key_updated", handler as EventListener);
  }, []);

  const handleSaveApiKey = () => {
    try {
      const trimmed = apiKey.trim();
      localStorage.setItem("whoisp_api_key", trimmed);
      window.dispatchEvent(new CustomEvent("whoisp_api_key_updated", { detail: trimmed }));
      setApiStatus(lang === "ja" ? "保存しました" : "Saved");
      setTimeout(() => setApiStatus(null), 2000);
    } catch {
      setApiStatus(lang === "ja" ? "保存に失敗しました" : "Failed to save");
      setTimeout(() => setApiStatus(null), 2000);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <Link href={lang === "ja" ? "/ja" : "/"} className="flex items-center gap-2 px-2 py-1.5">
          {isCollapsed ? (
            <Image src="/favicon.svg" alt="WhoisP icon" width={48} height={48} className="h-10 w-10" priority />
          ) : (
            <Image src="/logo.svg" alt="WhoisP" width={220} height={64} className="h-12 w-auto" priority />
          )}
        </Link>
        {isCollapsed ? (
          <Button size="icon" className="h-8 w-full" onClick={handleNewSearch}>
            <Plus className="size-4" />
            <span className="sr-only">{lang === "ja" ? "新しい検索" : "New Search"}</span>
          </Button>
        ) : (
          <Button size="sm" className="h-8 w-full" onClick={handleNewSearch}>
            <Plus className="mr-2 size-4" /> {lang === "ja" ? "新しい検索" : "New Search"}
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <History className="mr-2" />
            {!isCollapsed && (lang === "ja" ? "最近の検索" : "Recent")}
            {isCollapsed && (
              <span className="sr-only">{lang === "ja" ? "最近の検索" : "Recent"}</span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupAction title={lang === "ja" ? "すべて表示" : "View all"}>
            <ExternalLink className="size-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Render real recent projects */}
              {projects
                .slice()
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((p) => {
                  const href = lang === "ja" ? `/ja/projects/${p.id}` : `/projects/${p.id}`;
                  const active = pathname?.startsWith(href);
                  const initial = p.name?.trim()?.[0] || "W";
                  return (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton asChild tooltip={p.name} isActive={!!active}>
                        <Link href={href}>
                          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded bg-muted text-center text-[10px] leading-none">
                            {initial}
                          </span>
                          {state !== "collapsed" && (
                            <span className="truncate">{p.name}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {state === "collapsed" ? (
          <div className="mt-2 flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setSettingsOpen(true)}
            >
              <Cog className="size-5" />
              <span className="sr-only">{lang === "ja" ? "設定" : "Settings"}</span>
            </Button>
            <Button variant="ghost" size="icon" className="size-9" asChild>
              <Link href="/disclaimer">
                <CircleHelp className="size-5" />
                <span className="sr-only">{lang === "ja" ? "利用上の注意" : "Usage notes"}</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <Button
              type="button"
              variant="ghost"
              className="flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-sidebar-accent"
              onClick={() => setSettingsOpen(true)}
            >
              <span className="flex items-center gap-2">
                <Cog className="size-5" />
                <span className="grid leading-tight">
                  <span className="text-xs font-medium">{lang === "ja" ? "設定" : "Settings"}</span>
                  <span className="text-xs text-muted-foreground">
                    {lang === "ja" ? "アプリ全体" : "App-wide"}
                  </span>
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {lang === "ja" ? "開く" : "Open"}
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full items-center justify-between rounded-md p-2 text-left hover:bg-sidebar-accent"
              asChild
            >
              <Link href="/disclaimer">
                <span className="flex items-center gap-2">
                  <CircleHelp className="size-5" />
                  <span className="grid leading-tight">
                    <span className="text-xs font-medium">
                      {lang === "ja" ? "利用上の注意" : "Usage notes"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {lang === "ja" ? "公開情報のみ" : "Public info only"}
                    </span>
                  </span>
                </span>
                <ExternalLink className="size-4 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        )}

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{lang === "ja" ? "設定" : "Settings"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">{lang === "ja" ? "言語" : "Language"}</span>
                <div className="col-span-2 flex items-center gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/">English</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/ja">日本語</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">{lang === "ja" ? "テーマ" : "Theme"}</span>
                <div className="col-span-2">{lang === "ja" ? "システム" : "System"}</div>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">{lang === "ja" ? "APIキー" : "API Key"}</span>
                <div className="col-span-2 space-y-2">
                  <Input
                    type="password"
                    placeholder={lang === "ja" ? "APIキーを入力" : "Enter API key"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                    {lang === "ja" ? "保存" : "Save"}
                  </Button>
                  {apiStatus && (
                    <p className="text-xs text-muted-foreground">{apiStatus}</p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
