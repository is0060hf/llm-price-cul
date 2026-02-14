import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CostResult } from "@/components/CostResult";
import type { CostResult as CostResultType } from "@/types";

// recharts の ResponsiveContainer はテスト環境で幅0になるためモックする
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <div style={{ width: 400, height: 300 }}>{children}</div>,
  };
});

const mockResult: CostResultType = {
  costPerRequest: 0.01,
  totalInputTokens: 1000,
  totalOutputTokens: 500,
  steps: [
    {
      name: "メインエージェント応答",
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
  safetyMarginRate: 20,
  exchangeRate: 150,
  assumptions: {
    modelName: "GPT-4.1",
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
};

describe("CostResult - 比較表追加機能", () => {
  it("比較表に追加ボタンが表示される", () => {
    render(
      <CostResult
        result={mockResult}
        currency="USD"
        exchangeRate={150}
        onAddToComparison={vi.fn()}
        isAlreadyInComparison={false}
        onScrollToComparison={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /比較表に追加/ })
    ).toBeInTheDocument();
  });

  it("同一条件が既に比較表にある場合、ボタンが disabled になる", () => {
    render(
      <CostResult
        result={mockResult}
        currency="USD"
        exchangeRate={150}
        onAddToComparison={vi.fn()}
        isAlreadyInComparison={true}
        onScrollToComparison={vi.fn()}
      />
    );
    const button = screen.getByRole("button", { name: /追加済み/ });
    expect(button).toBeDisabled();
  });

  it("追加後に「比較表を見る」ボタンが表示される", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { rerender } = render(
      <CostResult
        result={mockResult}
        currency="USD"
        exchangeRate={150}
        onAddToComparison={onAdd}
        isAlreadyInComparison={false}
        onScrollToComparison={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /比較表に追加/ }));
    expect(onAdd).toHaveBeenCalledTimes(1);

    // 親コンポーネントが isAlreadyInComparison を true に更新した状態を再現
    rerender(
      <CostResult
        result={mockResult}
        currency="USD"
        exchangeRate={150}
        onAddToComparison={onAdd}
        isAlreadyInComparison={true}
        onScrollToComparison={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /比較表を見る/ })
    ).toBeInTheDocument();
  });

  it("「比較表を見る」ボタンをクリックすると onScrollToComparison が呼ばれる", async () => {
    const user = userEvent.setup();
    const onScroll = vi.fn();
    render(
      <CostResult
        result={mockResult}
        currency="USD"
        exchangeRate={150}
        onAddToComparison={vi.fn()}
        isAlreadyInComparison={true}
        onScrollToComparison={onScroll}
      />
    );

    await user.click(screen.getByRole("button", { name: /比較表を見る/ }));
    expect(onScroll).toHaveBeenCalledTimes(1);
  });
});
