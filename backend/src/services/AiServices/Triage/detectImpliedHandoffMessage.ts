export const responseMimicsHumanHandoff = (text: string): boolean => {
  const normalized = (text || "").toLowerCase();

  const mentionsSupport =
    normalized.includes("suporte técnico") ||
    normalized.includes("suporte humano") ||
    normalized.includes("atendimento humano");

  const mentionsTransfer =
    normalized.includes("direcionado") ||
    normalized.includes("transfer") ||
    normalized.includes("encaminh") ||
    normalized.includes("especialistas");

  const mentionsProtocol = normalized.includes("protocolo:");

  return mentionsSupport && (mentionsTransfer || mentionsProtocol);
};
