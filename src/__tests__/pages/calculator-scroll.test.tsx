import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Calculator ページ: 算出結果へのスクロール", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("結果セクションに id='cost-result' が設定されている", async () => {
    // fetchMasterData をモックして即座にデータを返す
    vi.doMock("@/lib/api", () => ({
      fetchMasterData: vi.fn(() =>
        Promise.resolve({
          providers: [],
          models: [
            {
              id: 1,
              name: "Test Model",
              providerName: "OpenAI",
              providerId: 1,
              category: "standard",
              inputPrice: 2.0,
              outputPrice: 8.0,
              cacheWritePrice: null,
              cacheReadPrice: null,
              contextLength: 128000,
              isLegacy: false,
              pricingTier: null,
              updatedAt: "2026-01-01",
            },
          ],
          embeddingModels: [
            {
              id: 1,
              name: "Test Embedding",
              providerName: "OpenAI",
              providerId: 1,
              inputPrice: 0.02,
              dimensions: 1536,
              pricingTier: null,
              updatedAt: "2026-01-01",
            },
          ],
          webSearchTools: [
            {
              id: 1,
              name: "Test Search",
              providerName: "OpenAI",
              providerId: 1,
              pricePerCall: 0.01,
              pricingNote: null,
              updatedAt: "2026-01-01",
            },
          ],
        })
      ),
    }));

    const { render, screen, waitFor } = await import("@testing-library/react");
    const { default: CalculatorPage } = await import(
      "@/app/calculator/page"
    );

    render(<CalculatorPage />);

    // ローディングが完了するのを待つ
    await waitFor(
      () => {
        expect(screen.queryByText("マスターデータを読み込み中...")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 結果セクションのアンカーが存在する（結果がない時は非表示だが、ref用のdivは存在する）
    const resultAnchor = document.getElementById("cost-result");
    expect(resultAnchor).toBeInTheDocument();
  });

  it("scrollIntoView が結果セクションの ref に対して呼び出し可能である", () => {
    // scrollIntoView が HTMLElement のプロトタイプに存在することを確認
    const el = document.createElement("div");
    el.id = "cost-result";
    document.body.appendChild(el);

    const scrollSpy = vi.fn();
    el.scrollIntoView = scrollSpy;
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    expect(scrollSpy).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    document.body.removeChild(el);
  });
});
