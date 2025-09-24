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
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CircleHelp,
  Cog,
  ExternalLink,
  History,
  LogOut,
  Plus,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";

export const AppSidebar: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const lang = pathname?.startsWith("/ja") ? "ja" : "en";
  const { state } = useSidebar();

  type Project = { id: string; name: string; createdAt: number };
  const [projects, setProjects] = React.useState<Project[]>([]);

  // Load projects from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("pf_projects");
      if (raw) setProjects(JSON.parse(raw));
    } catch {}
  }, []);

  // Listen for external updates to projects (e.g., title sync from forms)
  React.useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem("pf_projects");
        if (raw) setProjects(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("pf_projects_updated", handler);
    return () => window.removeEventListener("pf_projects_updated", handler);
  }, []);

  const persist = (list: Project[]) => {
    setProjects(list);
    try {
      localStorage.setItem("pf_projects", JSON.stringify(list));
      // notify others
      window.dispatchEvent(new Event("pf_projects_updated"));
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

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader>
        <Link href={lang === "ja" ? "/ja" : "/"} className="flex items-center gap-2 px-2 py-1.5">
          <div className="size-6 rounded bg-primary/10" />
          {state !== "collapsed" && (
            <span className="text-sm font-semibold">Persona Finder</span>
          )}
        </Link>
        {state === "collapsed" ? (
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
            {state !== "collapsed" && (lang === "ja" ? "最近の検索" : "Recent")}
            {state === "collapsed" && (
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
                  const initial = p.name?.trim()?.[0] || "P";
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
        {/* Help moved into Account settings menu */}
        {state === "collapsed" ? (
          <div className="mt-2 flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Avatar className="size-6">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">{lang === "ja" ? "アカウント" : "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{lang === "ja" ? "アカウント" : "Account"}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/login">{lang === "ja" ? "ログイン" : "Log in"}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/register">{lang === "ja" ? "新規登録" : "Sign up"}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  {lang === "ja" ? "設定" : "Settings"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help">
                    <CircleHelp className="mr-2 size-4" /> {lang === "ja" ? "ヘルプ" : "Help"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 size-4" /> {lang === "ja" ? "サインアウト" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between rounded-md p-2 hover:bg-sidebar-accent">
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="grid leading-tight">
                <span className="text-xs font-medium">{lang === "ja" ? "ゲスト" : "Guest"}</span>
                <span className="text-xs text-muted-foreground">{lang === "ja" ? "未ログイン" : "Signed out"}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-6">
                  <Cog className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{lang === "ja" ? "アカウント" : "Account"}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/login">{lang === "ja" ? "ログイン" : "Log in"}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/register">{lang === "ja" ? "新規登録" : "Sign up"}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  {lang === "ja" ? "設定" : "Settings"}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help">
                    <CircleHelp className="mr-2 size-4" /> {lang === "ja" ? "ヘルプ" : "Help"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 size-4" /> {lang === "ja" ? "サインアウト" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-md">
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
                <span className="text-muted-foreground">{lang === "ja" ? "ショートカット" : "Shortcuts"}</span>
                <div className="col-span-2">Ctrl/Cmd + B {lang === "ja" ? "でサイドバー切替" : "to toggle sidebar"}</div>
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