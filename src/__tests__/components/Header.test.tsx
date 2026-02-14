import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Header } from "@/components/Header";

describe("Header", () => {
  it("ブランド名「Prestimo」が表示される", () => {
    render(<Header />);
    expect(screen.getByText("Prestimo")).toBeInTheDocument();
  });

  it("サブタイトルが表示される", () => {
    render(<Header />);
    expect(
      screen.getByText("AI エージェントのコスト見積もり")
    ).toBeInTheDocument();
  });

  it("banner ロールが設定されている", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("ホームへのリンクが存在する", () => {
    render(<Header />);
    const link = screen.getByRole("link", { name: /Prestimo/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
