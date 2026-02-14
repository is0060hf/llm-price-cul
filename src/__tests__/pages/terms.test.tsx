import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TermsPage from "@/app/terms/page";

describe("利用規約ページ", () => {
  it("ページタイトル「利用規約」が表示される", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /利用規約/ })
    ).toBeInTheDocument();
  });

  it("「免責事項」セクションが存在する", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { name: /免責事項/ })
    ).toBeInTheDocument();
  });

  it("「利用条件」セクションが存在する", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { name: /利用条件/ })
    ).toBeInTheDocument();
  });

  it("「知的財産権」セクションが存在する", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { name: /知的財産権/ })
    ).toBeInTheDocument();
  });

  it("「規約の変更」セクションが存在する", () => {
    render(<TermsPage />);
    expect(
      screen.getByRole("heading", { name: /規約の変更/ })
    ).toBeInTheDocument();
  });

  it("「Prestimo」のサービス名が本文中に含まれる", () => {
    render(<TermsPage />);
    expect(screen.getByText(/Prestimo/)).toBeInTheDocument();
  });
});
