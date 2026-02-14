import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LandingPage from "@/app/page";

describe("LP ページ (/)", () => {
  it("キャッチコピーが表示される", () => {
    render(<LandingPage />);
    expect(
      screen.getByText(
        "AI エージェントの月額コスト、根拠ある上限値を 30 秒で"
      )
    ).toBeInTheDocument();
  });

  it("CTA リンクが表示される", () => {
    render(<LandingPage />);
    const cta = screen.getByRole("link", { name: /今すぐ見積もる/ });
    expect(cta).toHaveAttribute("href", "/calculator");
  });

  it("アプリ本体のタブが表示されない", () => {
    render(<LandingPage />);
    expect(screen.queryByText("ざっくり算定")).not.toBeInTheDocument();
    expect(screen.queryByText("詳細算定")).not.toBeInTheDocument();
  });

  it("Disclaimer が表示されない", () => {
    render(<LandingPage />);
    expect(screen.queryByText("本ツールについて")).not.toBeInTheDocument();
  });
});
