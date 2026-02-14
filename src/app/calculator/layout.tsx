import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "コスト算出",
};

export default function CalculatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
