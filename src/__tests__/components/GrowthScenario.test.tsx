import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// recharts の ResponsiveContainer はテスト環境で幅0になるためモックする
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <div style={{ width: 400, height: 280 }}>{children}</div>,
  };
});

import { GrowthScenario } from "@/components/GrowthScenario";

describe("GrowthScenario", () => {
  const defaultProps = {
    baseMonthlyCostUsd: 100,
    exchangeRate: 150,
    currency: "USD" as const,
  };

  it("「成長シナリオ」タイトルが表示される", () => {
    render(<GrowthScenario {...defaultProps} />);
    expect(screen.getByText("成長シナリオ")).toBeInTheDocument();
  });

  it("展開後に年間合計コストが表示される", async () => {
    const user = userEvent.setup();
    render(<GrowthScenario {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /成長シナリオ/ }));
    expect(screen.getByText("年間合計コスト")).toBeInTheDocument();
  });

  it("展開後に BarChart が使用されている（AreaChart ではない）", async () => {
    const user = userEvent.setup();
    const { container } = render(<GrowthScenario {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /成長シナリオ/ }));
    // recharts の BarChart は class="recharts-bar-rectangles" を生成する
    const barRects = container.querySelectorAll(".recharts-bar-rectangles");
    const barWrapper = container.querySelectorAll(".recharts-bar");
    const barChart = container.querySelectorAll(".recharts-wrapper");
    // BarChart が存在し、AreaChart の要素が存在しないことを確認
    expect(barRects.length + barWrapper.length + barChart.length).toBeGreaterThan(0);

    const areas = container.querySelectorAll(".recharts-area-curve");
    expect(areas.length).toBe(0);
  });

  it("12ヶ月分のデータ行がテーブルに表示される", async () => {
    const user = userEvent.setup();
    render(<GrowthScenario {...defaultProps} />);
    // 折りたたまれているので展開する
    await user.click(screen.getByRole("button", { name: /成長シナリオ/ }));
    for (let i = 1; i <= 12; i++) {
      // チャートとテーブルの両方に月ラベルが存在するため getAllByText を使用
      const elements = screen.getAllByText(`${i}月`);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("デフォルトで内容が折りたたまれている", () => {
    render(<GrowthScenario {...defaultProps} />);
    // タイトルは見えるが、内容（倍率指定タブ等）は非表示
    expect(screen.getByText("成長シナリオ")).toBeInTheDocument();
    expect(screen.queryByText("倍率指定")).not.toBeInTheDocument();
    expect(screen.queryByText("年間合計コスト")).not.toBeInTheDocument();
  });

  it("トリガーボタンが表示されている", () => {
    render(<GrowthScenario {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /成長シナリオ/ })
    ).toBeInTheDocument();
  });

  it("トリガーをクリックすると内容が展開される", async () => {
    const user = userEvent.setup();
    render(<GrowthScenario {...defaultProps} />);
    // 折りたたみ状態では倍率指定が見えない
    expect(screen.queryByText("倍率指定")).not.toBeInTheDocument();
    // トリガーをクリック
    await user.click(screen.getByRole("button", { name: /成長シナリオ/ }));
    // 展開後は倍率指定と年間合計コストが見える
    expect(screen.getByText("倍率指定")).toBeInTheDocument();
    expect(screen.getByText("年間合計コスト")).toBeInTheDocument();
  });
});
