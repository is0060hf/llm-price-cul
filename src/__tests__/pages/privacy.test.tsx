import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PrivacyPage from "@/app/privacy/page";

describe("プライバシーポリシーページ", () => {
  it("ページタイトル「プライバシーポリシー」が表示される", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /プライバシーポリシー/ })
    ).toBeInTheDocument();
  });

  it("「個人情報の収集について」セクションが存在する", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { name: /個人情報の収集について/ })
    ).toBeInTheDocument();
  });

  it("「Cookie の使用について」セクションが存在する", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { name: /Cookie の使用について/ })
    ).toBeInTheDocument();
  });

  it("「データの保存について」セクションが存在する", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { name: /データの保存について/ })
    ).toBeInTheDocument();
  });

  it("「Prestimo」のサービス名が本文中に含まれる", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/Prestimo/)).toBeInTheDocument();
  });
});
