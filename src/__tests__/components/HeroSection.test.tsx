import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HeroSection } from "@/components/HeroSection";

describe("HeroSection", () => {
  it("キャッチコピーが表示される", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(
        "AI エージェントの月額コスト、根拠ある上限値を 30 秒で"
      )
    ).toBeInTheDocument();
  });

  it("サブコピーが表示される", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(
        "マルチエージェント構成の API コストを、モデル選択と用途タイプの入力だけで概算"
      )
    ).toBeInTheDocument();
  });

  it("特徴が3つ表示される", () => {
    render(<HeroSection />);
    expect(
      screen.getByText("5 項目の入力で即算出")
    ).toBeInTheDocument();
    expect(
      screen.getByText("OpenAI / Anthropic / Google 対応")
    ).toBeInTheDocument();
    expect(
      screen.getByText("上限値算定で安心の見積もり")
    ).toBeInTheDocument();
  });

  it("「今すぐ見積もる」CTA リンクが存在する", () => {
    render(<HeroSection />);
    const cta = screen.getByRole("link", { name: /今すぐ見積もる/ });
    expect(cta).toBeInTheDocument();
  });

  it("CTA の href が /calculator である", () => {
    render(<HeroSection />);
    const cta = screen.getByRole("link", { name: /今すぐ見積もる/ });
    expect(cta).toHaveAttribute("href", "/calculator");
  });
});
