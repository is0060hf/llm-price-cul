import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-background" role="banner">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl text-primary">
              Prestimo
            </h1>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">
            AI エージェントのコスト見積もり
          </p>
        </div>
        <nav aria-label="メインナビゲーション">{/* 将来のナビゲーション */}</nav>
      </div>
    </header>
  );
}
