import DeepResearchClient from "../_components/deep-research-client";
import { jaStrings } from "../_components/deep-research-strings";

export const dynamic = "force-dynamic";

export default function HomeJa() {
  return <DeepResearchClient locale="ja" strings={jaStrings} />;
}
