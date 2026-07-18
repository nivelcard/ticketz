import { slugify } from "../slugify";

describe("Knowledge backfill helpers", () => {
  it("slugify produces stable URL-safe slugs", () => {
    expect(slugify("Guia PIX — Pagamentos")).toBe("guia-pix-pagamentos");
    expect(slugify("  Hello   World  ")).toBe("hello-world");
  });

  it("maps document types for asset migration", () => {
    const mapDocumentType = (type: string): string => {
      const normalized = type.toLowerCase();
      if (normalized === "docx") return "word";
      if (normalized === "md") return "markdown";
      return normalized;
    };

    expect(mapDocumentType("docx")).toBe("word");
    expect(mapDocumentType("PDF")).toBe("pdf");
    expect(mapDocumentType("md")).toBe("markdown");
  });

  it("maps ready documents to published lifecycle", () => {
    const mapLifecycle = (status: string): string =>
      status === "ready" ? "published" : "draft";

    expect(mapLifecycle("ready")).toBe("published");
    expect(mapLifecycle("pending")).toBe("draft");
    expect(mapLifecycle("error")).toBe("draft");
  });
});
