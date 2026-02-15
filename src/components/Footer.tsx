import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/50" role="contentinfo">
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm space-y-1">
            <p className="font-medium text-foreground">
              © 2026 Y.K.TaylorTokyo
            </p>
            <p className="text-muted-foreground">
              運営:{" "}
              <a
                href="https://taylormode.co.jp/company/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                株式会社TaylorMode
              </a>
            </p>
          </div>
          <nav aria-label="フッターナビゲーション">
            <ul className="flex gap-4 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  利用規約
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="text-center text-xs text-muted-foreground space-y-1 border-t pt-4">
          <p>料金データ最終取得日: 2026-02-14</p>
          <p>
            ※
            算出結果は概算であり、実際のコストとは異なる場合があります
          </p>
        </div>
      </div>
    </footer>
  );
}
