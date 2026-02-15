import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "@/components/Footer";

describe("Footer", () => {
  it("コピーライト表記に Y.K.TaylorTokyo が含まれる", () => {
    render(<Footer />);
    expect(screen.getByText(/© 2026 Y\.K\.TaylorTokyo/)).toBeInTheDocument();
  });

  it("運営会社名「株式会社TaylorMode」が表示される", () => {
    render(<Footer />);
    expect(screen.getByText(/株式会社TaylorMode/)).toBeInTheDocument();
  });

  it("運営会社のリンクが正しいURLを持つ", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /株式会社TaylorMode/ });
    expect(link).toHaveAttribute("href", "https://taylormode.co.jp/company/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("料金データ最終取得日が表示される", () => {
    render(<Footer />);
    expect(
      screen.getByText(/料金データ最終取得日: 2026-02-14/)
    ).toBeInTheDocument();
  });

  it("免責の注意書きがある", () => {
    render(<Footer />);
    expect(
      screen.getByText(/算出結果は概算であり、実際のコストとは異なる場合があります/)
    ).toBeInTheDocument();
  });

  it("プライバシーポリシーへのリンクが存在する", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /プライバシーポリシー/ });
    expect(link).toHaveAttribute("href", "/privacy");
  });

  it("利用規約へのリンクが存在する", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /利用規約/ });
    expect(link).toHaveAttribute("href", "/terms");
  });

  it("contentinfo ロールが設定されている", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
