import { ContactAiMemoryCandidate } from "./ContactAiMemoryPolicy";

const EXPLICIT_PREFERENCE_PATTERNS: {
  pattern: RegExp;
  key: string;
  category?: string;
}[] = [
  {
    pattern:
      /prefiro\s+(?:ser\s+)?atendid[oa]\s+em\s+(portugu[eê]s|ingl[eê]s|espanhol)/i,
    key: "language_preference"
  },
  {
    pattern: /(?:me\s+)?chame\s+de\s+([a-zA-ZÀ-ú]{2,30})/i,
    key: "preferred_name"
  }
];

const SUMMARY_MARKERS = [
  /(?:resumindo|para resumir|em resumo)/i,
  /(?:cliente|usu[aá]rio)\s+(?:disse|informou|mencionou)/i
];

const slugifyKey = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "memory";

export const extractMemoryCandidates = (input: {
  userText: string;
  aiResponse: string;
  conversationText?: string;
}): ContactAiMemoryCandidate[] => {
  const candidates: ContactAiMemoryCandidate[] = [];
  const combined = [input.userText, input.aiResponse, input.conversationText]
    .filter(Boolean)
    .join("\n");

  EXPLICIT_PREFERENCE_PATTERNS.forEach(rule => {
    const match = combined.match(rule.pattern);
    if (match) {
      candidates.push({
        memoryType: "preference",
        category: rule.category || "preference",
        key: rule.key,
        value: match[0].trim().slice(0, 500),
        verificationStatus: "user_stated",
        source: "explicit"
      });
    }
  });

  if (SUMMARY_MARKERS.some(marker => marker.test(input.aiResponse))) {
    candidates.push({
      memoryType: "summary",
      category: "conversation",
      key: slugifyKey(input.userText.slice(0, 40)),
      value: input.aiResponse.trim().slice(0, 800),
      verificationStatus: "unverified",
      inferenceConfidence: 0.75,
      source: "inferred"
    });
  }

  const factPattern =
    /(?:meu|minha)\s+(?:plano|assinatura|produto)\s+[ée]\s+([^.!?\n]{3,80})/i;
  const factMatch = input.userText.match(factPattern);
  if (factMatch) {
    candidates.push({
      memoryType: "fact",
      category: "billing_plan",
      key: "mentioned_plan",
      value: factMatch[0].trim(),
      verificationStatus: "unverified",
      inferenceConfidence: 0.72,
      source: "inferred"
    });
  }

  return candidates;
};
