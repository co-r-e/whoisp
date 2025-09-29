const TAG_REGEX = /<[^>]*>/g;
const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeEntities(text: string): string {
  return text.replace(/(&amp;|&lt;|&gt;|&quot;|&#39;)/g, (entity) => ENTITY_MAP[entity] ?? entity);
}

export function stripHtml(input: string | undefined | null): string {
  if (!input) return "";
  const withoutTags = input.replace(TAG_REGEX, " ");
  const normalizedWhitespace = withoutTags.replace(/\s+/g, " ").trim();
  return decodeEntities(normalizedWhitespace);
}
