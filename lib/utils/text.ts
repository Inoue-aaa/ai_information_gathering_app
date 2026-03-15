const aiKeywords = [
  " ai ",
  "ai:",
  "ai/",
  "openai",
  "gpt",
  "llm",
  "anthropic",
  "claude",
  "gemini",
  "meta ai",
  "deepmind",
  "mistral",
  "copilot",
  "machine learning",
  "artificial intelligence"
];

export function matchesAiTopic(value: string) {
  const normalized = ` ${normalizeSearchText(value)} `;
  return aiKeywords.some((keyword) => normalized.includes(keyword));
}

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
