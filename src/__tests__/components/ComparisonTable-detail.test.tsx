import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ComparisonTable } from "@/components/ComparisonTable";
import type { ComparisonEntry, Model } from "@/types";

const nullBenchmarks = {
  benchmarkGpqa: null, benchmarkSweBench: null, benchmarkAime: null,
  benchmarkArcAgi: null, benchmarkMmmu: null, benchmarkOverall: null,
};

const mockModels: Model[] = [
  { id: 1, providerId: 1, providerName: "OpenAI", name: "GPT-4.1", category: "standard", inputPrice: 2.0, outputPrice: 8.0, cacheWritePrice: null, cacheReadPrice: 0.5, maxContextLength: 1000000, isLegacy: false, ...nullBenchmarks, benchmarkOverall: 7.5 },
  { id: 2, providerId: 2, providerName: "Anthropic", name: "Claude Opus 4.6", category: "flagship", inputPrice: 5.0, outputPrice: 25.0, cacheWritePrice: 6.25, cacheReadPrice: 0.5, maxContextLength: 200000, isLegacy: false, ...nullBenchmarks, benchmarkOverall: 9.5, benchmarkSweBench: 80.8 },
];

const mockEntry1: ComparisonEntry = {
  id: "test-1",
  label: "GPT-4.1 - 基本構成",
  createdAt: "2026-02-15T00:00:00.000Z",
  result: {
    costPerRequest: 0.01,
    totalInputTokens: 1000,
    totalOutputTokens: 500,
    steps: [
      {
        name: "メインエージェント応答",
        modelName: "GPT-4.1",
        description: "応答生成",
        inputTokens: 1000,
        outputTokens: 500,
        costUsd: 0.01,
      },
    ],
    longContextSurcharge: false,
    monthlyCostUsd: 100,
    dailyCostUsd: 5,
    annualCostUsd: 1200,
    monthlyCostBeforeMargin: 83.33,
    monthlyCostJpy: 0,
    annualCostJpy: 0,
    safetyMarginRate: 20,
    exchangeRate: 150,
    assumptions: {
      modelName: "GPT-4.1",
      auxiliaryModelName: null,
      providerName: "OpenAI",
      dailyRequests: 100,
      monthlyWorkingDays: 20,
      maxInputChars: 1000,
      maxOutputChars: 1500,
      language: "ja",
      systemPromptChars: 2000,
      avgTurnsPerSession: 5,
      safetyMarginPercent: 20,
      currency: "USD",
      exchangeRate: 150,
      enabledOptions: [],
      optionDetails: {},
    },
  },
};

const mockEntry2: ComparisonEntry = {
  id: "test-2",
  label: "Claude Opus 4.6 - トピック分類+RAG",
  createdAt: "2026-02-15T01:00:00.000Z",
  result: {
    costPerRequest: 0.02,
    totalInputTokens: 2000,
    totalOutputTokens: 1000,
    steps: [
      {
        name: "メインエージェント応答",
        modelName: "Claude Opus 4.6",
        description: "応答生成",
        inputTokens: 2000,
        outputTokens: 1000,
        costUsd: 0.02,
      },
    ],
    longContextSurcharge: false,
    monthlyCostUsd: 200,
    dailyCostUsd: 10,
    annualCostUsd: 2400,
    monthlyCostBeforeMargin: 166.67,
    monthlyCostJpy: 0,
    annualCostJpy: 0,
    safetyMarginRate: 20,
    exchangeRate: 150,
    assumptions: {
      modelName: "Claude Opus 4.6",
      auxiliaryModelName: "Claude Haiku 4.5",
      providerName: "Anthropic",
      dailyRequests: 200,
      monthlyWorkingDays: 20,
      maxInputChars: 1000,
      maxOutputChars: 1500,
      language: "ja",
      systemPromptChars: 2000,
      avgTurnsPerSession: 5,
      safetyMarginPercent: 20,
      currency: "USD",
      exchangeRate: 150,
      enabledOptions: ["トピック分類", "意味検索"],
      optionDetails: {},
    },
  },
};

describe("ComparisonTable - 詳細表示機能", () => {
  const defaultProps = {
    entries: [mockEntry1],
    models: mockModels,
    onRemove: vi.fn(),
    onClearAll: vi.fn(),
    currency: "USD" as const,
    exchangeRate: 150,
  };

  it("onShowDetail が渡された場合、「詳細を見る」ボタンが表示される", () => {
    render(
      <ComparisonTable {...defaultProps} onShowDetail={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: /詳細を見る/ })
    ).toBeInTheDocument();
  });

  it("「詳細を見る」ボタンをクリックすると onShowDetail がエントリの result で呼ばれる", async () => {
    const user = userEvent.setup();
    const onShowDetail = vi.fn();
    render(
      <ComparisonTable {...defaultProps} onShowDetail={onShowDetail} />
    );

    await user.click(screen.getByRole("button", { name: /詳細を見る/ }));
    expect(onShowDetail).toHaveBeenCalledTimes(1);
    expect(onShowDetail).toHaveBeenCalledWith(mockEntry1.result);
  });

  it("onShowDetail が渡されない場合、「詳細を見る」ボタンは表示されない", () => {
    render(<ComparisonTable {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: /詳細を見る/ })
    ).not.toBeInTheDocument();
  });
});

describe("ComparisonTable - デザイン改善", () => {
  const singleEntryProps = {
    entries: [mockEntry1],
    models: mockModels,
    onRemove: vi.fn(),
    onClearAll: vi.fn(),
    currency: "USD" as const,
    exchangeRate: 150,
  };

  const twoEntryProps = {
    entries: [mockEntry1, mockEntry2],
    models: mockModels,
    onRemove: vi.fn(),
    onClearAll: vi.fn(),
    currency: "USD" as const,
    exchangeRate: 150,
  };

  // 1. ヘッダーとラベル行の重複解消
  it("ヘッダーに「案1」「案2」等の識別名が表示される", () => {
    render(<ComparisonTable {...twoEntryProps} />);
    expect(screen.getByText("案1")).toBeInTheDocument();
    expect(screen.getByText("案2")).toBeInTheDocument();
  });

  // 2. 月額コストが最初のデータ行に表示される
  it("月額コストが最初のデータ行に表示される", () => {
    const { container } = render(<ComparisonTable {...singleEntryProps} />);
    const rows = container.querySelectorAll("tbody tr");
    const firstRow = rows[0];
    expect(within(firstRow as HTMLElement).getByText("月額コスト")).toBeInTheDocument();
  });

  // 3. 不要行の整理
  it("追加日時が表示されない", () => {
    render(<ComparisonTable {...singleEntryProps} />);
    expect(screen.queryByText("追加日時")).not.toBeInTheDocument();
  });

  it("モデル名にプロバイダー名が含まれる", () => {
    render(<ComparisonTable {...singleEntryProps} />);
    expect(screen.getByText(/GPT-4\.1/)).toBeInTheDocument();
    expect(screen.getByText(/OpenAI/)).toBeInTheDocument();
  });

  it("ラベル行が独立して存在しない（ヘッダーに統合済み）", () => {
    const { container } = render(<ComparisonTable {...singleEntryProps} />);
    const rowHeaders = container.querySelectorAll("tbody td:first-child");
    const headerTexts = Array.from(rowHeaders).map((td) => td.textContent);
    expect(headerTexts).not.toContain("ラベル");
  });

  it("プロバイダー行が独立して存在しない（モデル行に統合済み）", () => {
    const { container } = render(<ComparisonTable {...singleEntryProps} />);
    const rowHeaders = container.querySelectorAll("tbody td:first-child");
    const headerTexts = Array.from(rowHeaders).map((td) => td.textContent);
    expect(headerTexts).not.toContain("プロバイダー");
  });

  // 4. 1リクエスト単価の追加
  it("1リクエスト単価が表示される", () => {
    render(<ComparisonTable {...singleEntryProps} />);
    expect(screen.getByText("1リクエスト単価")).toBeInTheDocument();
    expect(screen.getByText("$0.010000")).toBeInTheDocument();
  });

  // 5. 差額表示（2件以上の場合）
  it("2件以上のエントリで差額が表示される", () => {
    render(<ComparisonTable {...twoEntryProps} />);
    // mockEntry2 は $200 で、mockEntry1 は $100（最安値）
    // 差額は +$100.00
    expect(screen.getByText(/\+\$100\.00/)).toBeInTheDocument();
  });

  // 6. 最安値ハイライト
  it("最安値エントリに「最安値」の表示がある", () => {
    render(<ComparisonTable {...twoEntryProps} />);
    expect(screen.getByText("最安値")).toBeInTheDocument();
  });

  it("1件のみの場合は差額や最安値表示がない", () => {
    render(<ComparisonTable {...singleEntryProps} />);
    expect(screen.queryByText("最安値")).not.toBeInTheDocument();
    expect(screen.queryByText(/\+\$/)).not.toBeInTheDocument();
  });

  // 列幅固定
  it("各エントリ列に固定幅のクラスが設定されている", () => {
    const { container } = render(<ComparisonTable {...twoEntryProps} />);
    const headerCells = container.querySelectorAll("thead th:not(:first-child)");
    headerCells.forEach((cell) => {
      expect(cell.className).toMatch(/w-\[/);
    });
  });

  it("テーブルのレイアウトが固定されている", () => {
    const { container } = render(<ComparisonTable {...singleEntryProps} />);
    const table = container.querySelector("table");
    expect(table?.className).toMatch(/table-fixed/);
  });
});
