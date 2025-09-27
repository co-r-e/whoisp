import DeepResearchClient from "./_components/deep-research-client";

const strings = {
  title: "WhoisP Deep Research",
  lead: "Launch a Gemini-powered multi-hop investigation that surfaces grounded evidence and a concise report.",
  queryLabel: "Research query",
  placeholder: "What do you need to investigate?",
  submit: "Run DeepResearch",
  stop: "Cancel",
  idleStatus: "Enter a query to start a new investigation.",
  runningStatus: "Research in progress…",
  planHeading: "Research plan",
  planExpectation: "Steps refresh automatically as the planner decomposes the question into focused sub-queries.",
  evidenceHeading: "Evidence digests",
  reportHeading: "Final report",
  sourcesHeading: "References",
  errorLabel: "Error",
};

export default function Home() {
  return <DeepResearchClient locale="en" strings={strings} />;
}
