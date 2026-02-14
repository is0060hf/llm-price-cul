import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  fetchMasterData: vi.fn(
    () =>
      new Promise<never>(() => {
        // 永続的に pending にしてローディング状態を維持
      })
  ),
}));

describe("Calculator ページ (/calculator)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中にステータス表示がある", async () => {
    const { default: CalculatorPage } = await import(
      "@/app/calculator/page"
    );
    render(<CalculatorPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByText("マスターデータを読み込み中...")
    ).toBeInTheDocument();
  });

  it("HeroSection が表示されない", async () => {
    const { default: CalculatorPage } = await import(
      "@/app/calculator/page"
    );
    render(<CalculatorPage />);
    expect(
      screen.queryByText(
        "AI エージェントの月額コスト、根拠ある上限値を 30 秒で"
      )
    ).not.toBeInTheDocument();
  });
});
