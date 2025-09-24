"use client";

import * as React from "react";

type Lang = "ja" | "en";

type Project = { id: string; name: string; createdAt: number };

export const ProjectHeader: React.FC<{ id: string; lang: Lang }>
= ({ id, lang }) => {
  const [project, setProject] = React.useState<Project | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("pf_projects");
      if (!raw) return;
      const list: Project[] = JSON.parse(raw);
      const found = list.find((p) => p.id === id) || null;
      setProject(found);
    } catch {}
  }, [id]);

  const title = project?.name || (lang === "ja" ? "無題のプロジェクト" : "Untitled Project");

  return (
    <header className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {project?.createdAt ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {lang === "ja" ? "作成日: " : "Created: "}
          {new Date(project.createdAt).toLocaleString(lang === "ja" ? "ja-JP" : "en-US")}
        </p>
      ) : null}
    </header>
  );
};

export default ProjectHeader;