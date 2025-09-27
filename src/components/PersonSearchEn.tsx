"use client";

import PersonSearchForm from "./PersonSearchForm";

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
    title: "Research summary",
    description: "",
    overviewHeading: "Overview",
    referencesHeading: "References",
    noReferences: "No references were returned.",
    providerLabel: "",
    placeholder: "Search results will appear here once you run a query.",
    loadingTitle: "Searching the public web…",
    loadingDescription: "Hang tight while we gather the highlights for you.",
  },
} as const;

type Props = {
  projectId?: string;
  lang?: "ja" | "en";
};

export default function PersonSearchEn({ projectId, lang }: Props) {
  return <PersonSearchForm projectId={projectId} lang={lang ?? "en"} copy={copyEn} />;
}
