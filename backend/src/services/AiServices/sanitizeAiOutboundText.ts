const PROACTIVE_HANDOFF_PATTERNS = [
  /aguard(?:ar|e)\s+(?:o\s+)?atendimento\s+humano/gi,
  /atendimento\s+humano,?\s*(?:que\s+est[aá]\s+)?dispon[ií]vel/gi,
  /entrar\s+em\s+contato\s+com\s+o\s+suporte\s+via\s+whatsapp(?:\s+ou\s+aguard(?:ar|e))?/gi,
  /posso\s+transferir\s+(?:voc[eê]\s+)?para\s+(?:um\s+)?atendente/gi,
  /vou\s+(?:encaminhar|transferir)\s+(?:voc[eê]\s+)?para/gi,
  /se\s+precisar\s+de\s+mais\s+ajuda[^.!?]*(?:atendimento\s+humano|aguard(?:ar|e))/gi
];

export const containsProactiveHandoffLanguage = (text: string): boolean =>
  PROACTIVE_HANDOFF_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });

export const sanitizeAiOutboundText = (
  text: string,
  options: { allowHandoffLanguage?: boolean } = {}
): string => {
  if (!text?.trim() || options.allowHandoffLanguage) {
    return text;
  }

  if (!containsProactiveHandoffLanguage(text)) {
    return text;
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => !containsProactiveHandoffLanguage(sentence));

  if (sentences.length) {
    return sentences.join(" ").trim();
  }

  return "Entendi. Pode me contar um pouco mais sobre o que aconteceu para eu te ajudar melhor?";
};
