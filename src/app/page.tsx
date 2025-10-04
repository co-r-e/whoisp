import DeepResearchClient from "./_components/deep-research-client";
import { enStrings } from "./_components/deep-research-strings";

export const dynamic = "force-dynamic";

export default function Home() {
  return <DeepResearchClient locale="en" strings={enStrings} />;
}
