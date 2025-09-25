"use client";

import PersonSearchForm, { PersonSearchResult } from "./PersonSearchForm";

const copyEn = {
  cardDescription:
    "Enter a full name, company, position, and any extra clues to cross-search public information from the web and social networks.",
  labels: {
    fullName: "Full name",
    company: "Company",
    position: "Position",
    extraInfo: "Additional details (optional)",
  },
  placeholders: {
    fullName: "e.g., John Smith",
    company: "e.g., Acme Inc.",
    position: "e.g., CEO / Engineer",
    extraInfo: "e.g., nickname, alma mater, department",
  },
  button: {
    idle: "Search",
    loading: "Searching...",
  },
  disclaimerLinkText: "Usage notes & disclaimer",
  errorMessages: {
    fetch: "Search failed",
    generic: "Something went wrong",
  },
  results: {
    title: "Results",
    description: "Grouped by domain.",
  },
  extraInfoPrefix: "Extra info:",
  queryPrefix: "query: ",
} as const;

type Props = {
  projectId?: string;
  lang?: "ja" | "en";
};

export type { PersonSearchResult };

export default function PersonSearchEn({ projectId, lang }: Props) {
  return <PersonSearchForm projectId={projectId} lang={lang ?? "en"} copy={copyEn} />;
}
